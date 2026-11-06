import * as THREE from "three";
import { buildLevel, cullFoliage, disposeLevel, instanced, type Level } from "./level";
import { HARBOUR, LEVELS, type GuardDef, type LevelDef, type Placed } from "./levels";
import { exitAt, exitsOf, type ExitDef } from "./worldgraph";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { loadCreature, loadProp, loadRigs, Rig, type Anim, type RigTemplate, type Role } from "./models";
import {
  BODY,
  bodyReaction,
  canAirAssassinate,
  canSee,
  canSeeBody,
  isBodyHidden,
  stepBodyMeter,
  clamp,
  detectionRate,
  dist2D,
  forceAlert,
  isBehind,
  leapDuration,
  leapHeight,
  newBrain,
  noiseRadius,
  raycastBoxes,
  stepBrain,
  stepMeter,
  wrapAngle,
  yawTo,
  type Box,
  type Brain,
  type GuardState,
  type Vec2,
} from "./logic";
import { NavDebug } from "./navDebug";
import { GhaibLayer } from "./ghaibLayer";
import { advanceIntro, cameraAt, captionAt, fadeAt, isSkipKey, skipIntro, startIntro, type IntroState } from "./intro";
import type { Checkpoint } from "./save";
import { QUALITY, pixelRatioFor, type Quality } from "./touch";
import { harbourDrift } from "./menuCamera";
import { BASE_MODS, type SkillMods } from "./skills";
import { amuletForLevel, amuletSpot } from "./amulets";
import { packFog, unpackFog } from "./fog";
import { FEEL, Feel, KICK, type Kick, charmPop, landDip, landTrauma, markerPopScale } from "./feel";
import { placesAt } from "./kitab";
import { BARK_PRIORITY, BARK_RANGE, barkLines, type BarkKind } from "./barks";
import { TOOLS, type ToolId } from "./tools";
import { Chronicle, type ChronicleData } from "./chronicle";
import { Dalang, shadowOnScreen, shadowVision } from "./wayang";
import { WayangLook } from "./wayangLook";
import { PAD_CONFIRM, PAD_DOWN, PAD_KEYS, PAD_LOOK_RATE, PAD_RUN, PAD_START, PAD_TAB_NEXT, PAD_TAB_PREV, PAD_UP, diffButtons, pickPad, readPad } from "./gamepad";
import { KAPITAN, round1, type GuardTuple, type KapitanWorld } from "./kapitan";
import { PathAgent, buildNav, climbDuration, inArea, isWet, pathLen, sampleClimb, type ClimbLink, type NavGrid } from "./nav";
import { PantunGates } from "./pantunGates";
import type { PantunHud } from "./pantun";
import { TIDE, TIDE_NAMES, floodShare, inFlood, isTidal, onMudflat, seaMudY, tideAt, tidePhase, type TideMap, type TideReading, type TideState } from "./tide";
import { applyTide, seaSurface } from "./tideScene";

export type Phase = "title" | "intro" | "playing" | "paused" | "won" | "lost";
/** slain: cut down in a fight; detected: any alarm, on a mission that must stay unseen */
export type LoseReason = "slain" | "detected" | null;

/** stones and pepper per attempt, pepper reach and blind time, stone hearing range, game speed while the wheel is open */
const TOOL = { stones: 8, pepper: 2, pepperR: 4.5, pepperBlind: 3.5, stoneHear: 14, slow: 0.25 };

export interface HudState {
  meter: number;
  /** the tool in hand, how many of each are left, and the wheel (open: the highlighted tool) */
  tool: ToolId;
  ammo: Record<ToolId, number>;
  wheel: ToolId | null;
  /** swimming: breath left, 0..1 (null on land) */
  breath: number | null;
  alert: GuardState | "calm";
  objective: string;
  northDeg: number;
  objDeg: number | null;
  eagle: boolean;
  /** semangat left for Mata Helang, 0..1 (ghaib.ts) */
  semangat?: number;
  crouched: boolean;
  hidden: boolean;
  knives: number;
  prompt: string;
  carrying: boolean;
  toast: string;
  /** a guard's line the player overheard, shown as a subtitle ("" when quiet) */
  talk: string;
  /** player health, 0..maxHp (fractional while it regenerates) */
  hp: number;
  maxHp: number;
  /** an alert guard is close: show the health bar */
  combat: boolean;
  /** a guard is winding up a strike at the player: parry or roll now */
  incoming: boolean;
  /** wayang missions: the dalang's narration ("" when quiet), and how far the player's shadow is on the screen, 0..1 */
  narration?: string;
  shadow?: number;
  /** pantun passwords (pantunGates.ts): the answer dialogue, an overheard line, disguise seconds left */
  pantun?: PantunHud;
  /** pasang surut: the tide now (tide.ts) */
  tide?: TideReading;
  /** gate crossing: black overlay alpha, 0..1 (absent when no gate is being used) */
  fade?: number;
}

export interface RunStats {
  /** seconds of play in this attempt (pauses excluded) */
  time: number;
  /** guards that went fully alert */
  alerts: number;
  /** the attempt began at the mission start rather than a later checkpoint */
  fromStart: boolean;
}

export interface GameCallbacks {
  onHud: (h: HudState) => void;
  onPhase: (p: Phase, reason: LoseReason) => void;
  /** a checkpoint was reached: at mission start, or when the target goes down */
  onCheckpoint?: (cp: Checkpoint) => void;
  /** intro cutscene view (caption, caption opacity, black fade), sent when it visibly changes */
  onIntro?: (v: IntroView) => void;
  /** the intro finished or was skipped; the caller must now call start() or showTitle() */
  onIntroEnd?: (skipped: boolean) => void;
  /** gamepad A or Start pressed on a menu screen (title, paused, won, lost) */
  onPadConfirm?: () => void;
  /** any gamepad button pressed on a menu screen; return true to consume it (the "press any button" splash) */
  onPadAny?: () => boolean;
  /** d-pad up (-1) or down (+1) on a menu screen */
  onPadNav?: (dir: -1 | 1) => void;
  /** LB / RB or d-pad left / right on a menu screen: previous (-1) or next (+1) tab */
  onPadTab?: (dir: -1 | 1) => void;
  /** the player picked up this mission's tangkal (amulet id) */
  onAmulet?: (id: string) => void;
  /** the explored map changed (sent when play stops: pause, win, loss), packed for the save */
  onExplored?: (level: string, packed: string) => void;
  /** the player reached a Kitab place for the first time (id from kitab.ts) */
  onKitab?: (id: string) => void;
  /** a pantun password was overheard or answered rightly (id from pantun.ts) */
  onPantun?: (id: string) => void;
  /** a gate carried the player to another map (already swapped, fresh attempt begun); react can update its level state */
  onTravel?: (def: LevelDef) => void;
}

/** Where things stand, for the pause menu's map and gear tabs (read when the game pauses). */
export interface MapState {
  player: { x: number; z: number; yaw: number };
  /** the target or the item while the objective is open, null once it is done */
  objective: { x: number; z: number } | null;
  exit: { x: number; z: number };
  /** walkable gates to neighbouring maps (worldgraph.ts) */
  exits: { id: string; x: number; z: number; label: string; to: string }[];
  escape: boolean;
  guards: number;
  guardsDown: number;
  time: number;
  alerts: number;
  knives: number;
  maxKnives: number;
  stones: number;
  pepper: number;
  hp: number;
  maxHp: number;
  /** explored ground: a grid of FOG.cell-metre squares over the level bounds, 1 = seen this attempt */
  fog: { minX: number; minZ: number; cell: number; cols: number; rows: number; seen: Uint8Array };
}

/** Map reveal: ground within FOG.r metres of the player is marked explored, in FOG.cell-metre squares. */
const FOG = { cell: 4, r: 18 };

export interface IntroView {
  text: string;
  /** 0..1 */
  opacity: number;
  /** black overlay alpha, 0..1 */
  fade: number;
}

const VIS = { range: 16, halfAngle: 0.6 };
const PLAYER_R = 0.4;
const FOG_DUSK = 0xc98259;
const FOG_EAGLE = 0x4a5878;
/** the mountain mist on Gunung Ledang: pale, and closer the further north and higher you go */
const FOG_MIST = new THREE.Color(0xb7b9b4);
const MIST = { ramp: 22, near: 0.65, far: 0.6 };
/** the fog colour a gloomy level (a cave) fades to */
const FOG_GLOOM = new THREE.Color(0x14110e);
/** boulder models are fitted to this height (each spot scales it) and recoloured to the mountain's grey stone */
const ROCK = { h: 1, color: 0x8a877d };
/**
 * Swimming in rivers and pools. y is the player's feet: at the surface only the head and shoulders show above the
 * water (the ground plane hides the rest); diving takes the player fully under, unseen, for as long as breath lasts.
 */
const SWIM = { speed: 2.2, fast: 3.4, dive: 1.9, surfaceY: -1.0, diveY: -2.3, sink: 4, breath: 8, refill: 2, gasp: 1.5, maxEntryY: 1.5, seaReach: 72, seaY: -0.25, climbRise: 5.2 };
// dusk fill levels; Mata Helang drops them for contrast
const LIGHT = { hemi: 1.7, ambient: 0.55, sun: 2.4, eagleHemi: 0.85, eagleAmbient: 0.2, eagleSun: 1.5 };
const STEP_H = 0.6;
// ---- combat: stealth stays the better option, but being seen is a fight you can win, not an instant loss
const MAX_HP = 3;
/** seconds per point of health coming back (it starts after SkillMods.regenDelay seconds without a hit) */
const REGEN_STEP = 3;
/** the first iframes seconds of a roll cannot be hit */
const ROLL = { dur: 0.55, iframes: 0.4, speed: 7.5, cd: 0.3 };
/** a parry is live for win seconds, then cannot be repeated for cd (a successful parry resets it) */
const PARRY = { win: 0.3, cd: 0.45 };
/** guard strike: winds up (the tell), lands, recovers; then waits cdMin..cdMin+cdRand before the next */
const GUARD_ATK = { reach: 2.1, windup: 0.65, recover: 0.5, cdMin: 1.1, cdRand: 0.8, maxAtOnce: 2 };
const GUARD_HP = 3;
/** a parried guard reels this long, open to a killing blow */
const STAGGER = 1.8;
/** a hit interrupts the guard's swing, but only once per poise seconds, so mashing does not lock him */
const FLINCH = 0.35;
const POISE = 1.5;
const SWING = { dur: 0.45, hitAt: 0.15, reach: 2.3 };
/** sampan handling: cruise and Shift speeds (m/s), acceleration, drift-to-stop rate, turn rate (rad/s), reach to board */
const BOAT = { speed: 3.2, fast: 5, accel: 2.5, drag: 1.5, turn: 1.4, board: 2.6, seatY: 0.15, modelLength: 4, modelY: -0.35 };

/** jungle tree model height (m) before each tree's own scale */
const JUNGLE_TREE_H = 11;
/** horse handling: walk and gallop speeds (m/s), acceleration, braking, turn rate (rad/s), reach to mount, saddle height, body radius */
const HORSE = { walk: 3.6, gallop: 9, accel: 5, drag: 6, turn: 2.6, mount: 2.4, saddleY: 0.7, r: 0.6, modelLength: 2.4 };

interface Horse {
  group: THREE.Group;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  home: { x: number; z: number; yaw: number };
  mixer: THREE.AnimationMixer | null;
  acts: Partial<Record<"idle" | "walk" | "gallop", THREE.AnimationAction>>;
  cur: "idle" | "walk" | "gallop" | null;
}

interface Boat {
  group: THREE.Group;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  home: { x: number; z: number; yaw: number };
}
/**
 * Heavy strike: hold E / left click for hold seconds, then let go (a tap is the light strike). The hold is its wind-up,
 * so it lands about 0.6 s after the press, and a blow taken while holding cancels it. It deals damage and always
 * staggers for stagger seconds, poise or not; a staggered guard dies to the next strike.
 */
const HEAVY = { hold: 0.45, dur: 0.6, hitAt: 0.15, damage: 2, stagger: 1.2 };
const START_KNIVES = 6;
const HEAD_H = 1.75;
/** standing needs this much headroom; under a stilt house the player is held in a crouch */
const STAND_H = 2.1;

interface Guard {
  id: number;
  /** seconds before this guard speaks again */
  talkCd?: number;
  isTarget: boolean;
  group: THREE.Group;
  body: THREE.Mesh;
  silhouette: THREE.Mesh;
  /** the procedural figure's parts, hidden when a Mixamo model replaces them */
  figure: THREE.Object3D[];
  rig: Rig | null;
  /** position at the last render, to pick walk or run from the speed */
  px: number;
  pz: number;
  marker: THREE.Mesh;
  cone: THREE.Mesh;
  coneMat: THREE.MeshBasicMaterial;
  x: number;
  z: number;
  yaw: number;
  brain: Brain;
  meter: number;
  waypoints: GuardDef["waypoints"];
  wp: number;
  wait: number;
  stun: number;
  dead: boolean;
  fall: number;
  y: number;
  vy: number;
  climb: { t: number; dur: number; link: ClimbLink } | null;
  agent: PathAgent;
  investigateY: number;
  lastKnownY: number;
  bodyMeter: number;
  hp: number;
  /** seconds into a strike, or null */
  atk: number | null;
  atkCd: number;
  stagger: number;
  flinch: number;
  lastFlinch: number;
  /** a one-shot clip to restart on the next animation frame */
  animKick: Anim | null;
  /** marker pop after a state change (feel.ts): seconds in, and whether he noticed (true) or gave up */
  pop?: { t: number; gain: boolean };
  bodyTarget: Guard | null;
  carried: boolean;
  discovered: boolean;
  lastKnown: Vec2 | null;
  investigate: Vec2 | null;
  noiseFlag: boolean;
  seesPlayer: boolean;
}

const STATE_COLOR: Record<GuardState, number> = {
  patrol: 0xffffff,
  suspicious: 0xffd54a,
  alert: 0xff3b30,
  search: 0xff9a3c,
};

function pushOut(pos: { x: number; z: number }, r: number, boxes: Box[], feetY: number) {
  for (let pass = 0; pass < 2; pass++) {
    for (const b of boxes) {
      if (b.maxY <= feetY + STEP_H || b.minY >= feetY + HEAD_H) continue;
      const cx = clamp(pos.x, b.minX, b.maxX);
      const cz = clamp(pos.z, b.minZ, b.maxZ);
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        pos.x += (dx / d) * (r - d);
        pos.z += (dz / d) * (r - d);
      } else {
        const opts = [
          { d: pos.x - b.minX, ax: -1, az: 0 },
          { d: b.maxX - pos.x, ax: 1, az: 0 },
          { d: pos.z - b.minZ, ax: 0, az: -1 },
          { d: b.maxZ - pos.z, ax: 0, az: 1 },
        ].sort((a, c) => a.d - c.d)[0];
        pos.x += opts.ax * (opts.d + r);
        pos.z += opts.az * (opts.d + r);
      }
    }
  }
}

function groundHeight(x: number, z: number, feetY: number, boxes: Box[]) {
  let g = 0;
  for (const b of boxes) {
    if (b.maxY <= feetY + STEP_H && b.maxY > g && x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) g = b.maxY;
  }
  return g;
}

function std(color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...extra });
}

function add<T extends THREE.Object3D>(parent: THREE.Object3D, o: T, x = 0, y = 0, z = 0): T {
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

function shadowMesh(geo: THREE.BufferGeometry, m: THREE.Material) {
  const o = new THREE.Mesh(geo, m);
  o.castShadow = true;
  return o;
}

function makePendekar() {
  const g = new THREE.Group();
  const body = add(g, shadowMesh(new THREE.CylinderGeometry(0.3, 0.42, 1.25, 8), std(0x23284a)), 0, 0.85);
  add(g, shadowMesh(new THREE.CylinderGeometry(0.43, 0.43, 0.14, 8), std(0x9a2b22)), 0, 0.95);
  add(g, shadowMesh(new THREE.SphereGeometry(0.2, 10, 8), std(0xc89a72)), 0, 1.65);
  const tanjak = add(g, shadowMesh(new THREE.ConeGeometry(0.24, 0.32, 6), std(0x7a1f1a)), 0, 1.92);
  tanjak.rotation.z = 0.15;
  add(g, shadowMesh(new THREE.CylinderGeometry(0.035, 0.05, 0.42, 5), std(0xd9a93a)), 0.34, 0.9).rotation.z = 0.5;
  return { group: g, body, figure: [...g.children] };
}

function makeGuardFigure(isTarget: boolean) {
  const g = new THREE.Group();
  const coat = isTarget ? 0x3a1f4d : 0x5a1d1d;
  const body = add(g, shadowMesh(new THREE.CylinderGeometry(0.34, 0.42, 1.3, 8), std(coat)), 0, 0.85);
  add(g, shadowMesh(new THREE.CylinderGeometry(0.44, 0.44, 0.12, 8), std(isTarget ? 0xd9a93a : 0x1b1b1b)), 0, 0.95);
  add(g, shadowMesh(new THREE.SphereGeometry(0.2, 10, 8), std(0xe0b898)), 0, 1.68);
  add(g, shadowMesh(new THREE.TorusGeometry(0.2, 0.05, 6, 10), std(0xe8e4d8)), 0, 1.5).rotation.x = Math.PI / 2;
  // steel cap with brim
  add(g, shadowMesh(new THREE.SphereGeometry(0.23, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), std(0x9aa0a6, { metalness: 0.6, roughness: 0.4 })), 0, 1.74);
  add(g, shadowMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 12), std(0x9aa0a6, { metalness: 0.6 })), 0, 1.76);
  if (isTarget) add(g, shadowMesh(new THREE.ConeGeometry(0.06, 0.5, 5), std(0xc0392b)), 0, 2.12);
  // long firearm held across the body
  const gun = add(g, shadowMesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 5), std(0x2a2118)), 0.38, 1.1);
  gun.rotation.x = Math.PI / 2;
  gun.rotation.z = 0.1;
  return { group: g, body, figure: [...g.children] };
}

function makeConeGeo(range: number, half: number) {
  const pos: number[] = [0, 0, 0];
  const n = 20;
  for (let i = 0; i <= n; i++) {
    const a = -half + (i / n) * half * 2;
    pos.push(Math.sin(a) * range, 0, Math.cos(a) * range);
  }
  const idx: number[] = [];
  for (let i = 1; i <= n; i++) idx.push(0, i, i + 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

export class Game {
  phase: Phase = "title";
  private loseReason: LoseReason = null;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private level: Level;
  private nav: NavGrid;
  private navDbg: NavDebug | null = null;
  private sky: THREE.Mesh;
  private player = makePendekar();
  /** Mixamo models, once loaded (empty when public/models has none) */
  private rigs: Partial<Record<Role, RigTemplate>> = {};
  private playerRig: Rig | null = null;
  /** seconds left of the stab animation after a takedown */
  private stabT = 0;
  private disposed = false;
  private guards: Guard[] = [];
  private keys = new Set<string>();
  private raf = 0;
  private last = 0;
  private hudTimer = 0;
  private time = 0;

  // player state
  private p = { x: 0, y: 0, z: 0, vy: 0, grounded: true, yaw: 0, moving: false, running: false };
  private crouchToggle = false;
  /** in the water: diving or at the surface, breath left, and a short gasp after running out (no diving) */
  private swim: { under: boolean; breath: number; gasp: number } | null = null;
  private ripple: THREE.Mesh | null = null;
  /** a floor overhead is too low to stand under (stilt houses) */
  private lowCeiling = false;
  /** pasang surut: the tide this frame, and the state last announced */
  private tide: TideReading = tideAt(0, 0.75);
  private tideSaid: TideState | null = null;
  private camYaw = (3 * Math.PI) / 4;
  private camPitch = 0.35;
  private camPos = new THREE.Vector3();
  private climb: { t: number; dur: number; from: THREE.Vector3; to: THREE.Vector3 } | null = null;
  /** air assassination in flight: the player tracks the guard and kills him on landing */
  private leap: { t: number; dur: number; from: THREE.Vector3; guard: Guard } | null = null;
  private eagle = false;
  /** alam ghaib: semangat meter, bunian paths and the puteri's tally (ghaibLayer.ts) */
  private ghaib = new GhaibLayer(this.scene);
  /** what the learned Ilmu skills change (setSkills) */
  private mods: SkillMods = BASE_MODS;
  private knives = START_KNIVES;
  private knifeCd = 0;
  private tool: ToolId = "knife";
  private stones = TOOL.stones;
  private pepper = TOOL.pepper;
  /** tool wheel held open: the stick / mouse offset that picks a slot, and the slot it points at */
  private wheel: { x: number; y: number; sel: ToolId } | null = null;
  /** pepper cloud: seconds since thrown */
  private puff: { t: number; mesh: THREE.Mesh } | null = null;
  private hp = MAX_HP;
  private hurtT = 99;
  private hurtAnimT = 0;
  private roll: { t: number; dx: number; dz: number } | null = null;
  private rollCd = 0;
  private parryT = 0;
  private parryCd = 0;
  private swing: { t: number; hit: boolean; heavy: boolean } | null = null;
  /** seconds E / left click has been held toward a strike, or null when not readying one */
  private charge: number | null = null;
  private lastGuardSwing = -9;
  private moveDir = { x: 0, z: 1 };
  private playerKick: Anim | null = null;
  private lampTimer = 0;
  private boats: Boat[] = [];
  /** the sampan the player sits in, or null on foot */
  private boat: Boat | null = null;
  private boatModel: THREE.Object3D | null = null;
  private plantModels: { trees: THREE.Object3D[]; fern: THREE.Object3D | null } | null = null;
  private rockModels: THREE.Object3D[] = [];
  private horses: Horse[] = [];
  /** the horse the player rides, or null */
  private horse: Horse | null = null;
  private horseModel: { object: THREE.Object3D; clips: THREE.AnimationClip[] } | null = null;
  /** jetties and other decks a boat cannot pass (bridges and planks span the river and it slips under them) */
  private boatBlockers: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  /** main: the level's objective (kill or steal) is still to do */
  private objective: "main" | "escape" = "main";
  /** steal objectives: the item's mesh, and whether it has been taken */
  private loot: THREE.Group | null = null;
  private taken = false;
  /** this mission's hidden tangkal: its mesh and spot, and whether the player already has it (setAmuletFound) */
  private charm: { group: THREE.Group; x: number; z: number; id: string; name: string } | null = null;
  /** explored squares for the pause map; cleared on a fresh attempt, kept across a checkpoint retry */
  private fog: { cols: number; rows: number; seen: Uint8Array; at: number } = { cols: 0, rows: 0, seen: new Uint8Array(0), at: -1 };
  /** the saved explored map for this level (packed), laid under each fresh attempt */
  private fogSaved: string | null = null;
  private fogDirty = false;
  /** gate travel: seconds stood in a gate, the gate, a swap queued for the end of the frame, arrival grace, fade-in after the swap */
  private gateDwell = 0;
  private gateNow: ExitDef | null = null;
  private pendingTravel: ExitDef | null = null;
  private gateCd = 0;
  private gateFade = 0;
  /** Kitab places already written (from the save), so each is announced once */
  private kitab = new Set<string>();
  private kitabT = 0;
  /** gate sentries and their pantun passwords */
  private pantun = new PantunGates({ toast: (t) => this.toast(t), learn: (id) => this.cb.onPantun?.(id) });
  /** the overheard subtitle, its time left and priority; idle chatter waits idleT between lines */
  private talk = { text: "", t: 0, pri: -1 };
  private idleT = 6;
  private lastLine = "";
  private charmFound = false;
  /** set when an alarm is raised on an undetected mission; the mission ends after this frame's guards */
  private detected = false;
  private hidden = false;
  private carrying: Guard | null = null;
  private hemi!: THREE.HemisphereLight;
  private ambient!: THREE.AmbientLight;
  private sun!: THREE.DirectionalLight;
  private toastText = "";
  private toastT = 0;
  private lockedOnce = false;
  /** touch mode never takes pointer lock: while it is held, setPointerCapture in the touch controls throws */
  private touch = false;
  private intro: IntroState | null = null;
  private introKey = "";
  private knifeMesh: THREE.Mesh;
  private knifeFly: { t: number; from: THREE.Vector3; to: THREE.Vector3 } | null = null;
  private disposers: (() => void)[] = [];
  private touchMove = { x: 0, y: 0, run: false };
  private padMove = { x: 0, y: 0, run: false };
  private padPrev: boolean[] = [];
  private lookSens = 1;
  private invertY = false;
  /** camera shake, hit-stop and dip (feel.ts) */
  private feel = new Feel();
  /** seconds into the charm pickup pop, or null */
  private charmPopT: number | null = null;
  /** eased camera look height, so crouching does not snap the view */
  private camLookY: number | null = null;
  private run: RunStats = { time: 0, alerts: 0, fromStart: true };
  /** what happened this attempt, for the hikayat told at the end (chronicle.ts) */
  private chron = new Chronicle();
  readonly quality: Quality;
  private def: LevelDef;
  /** wayang kulit missions: the shadow-play look, the narrator, and the player's shadow on the screen this frame (0..1) */
  private wayangLook: WayangLook | null = null;
  private dalang = new Dalang();
  private shade = 0;
  /** the mission being played */
  get levelDef(): LevelDef {
    return this.def;
  }

  constructor(
    private container: HTMLElement,
    private cb: GameCallbacks,
    opts: { quality?: Quality; touch?: boolean; level?: LevelDef } = {},
  ) {
    this.touch = !!opts.touch;
    this.def = opts.level ?? HARBOUR;
    this.quality = opts.quality ?? "high";
    const Q = QUALITY[this.quality];
    this.renderer = new THREE.WebGLRenderer({ antialias: Q.antialias, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(pixelRatioFor(this.quality, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true;
    // PCFSoftShadowMap was removed in r182 (three falls back to PCF with a warning), so ask for PCF directly
    this.renderer.shadowMap.type = Q.basicShadows ? THREE.BasicShadowMap : THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
    this.scene.fog = new THREE.Fog(FOG_DUSK, Q.fogNear, Q.fogFar);

    // sky dome
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(300, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader:
          "varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 hor = vec3(0.98,0.56,0.32); vec3 mid = vec3(0.62,0.32,0.4); vec3 top = vec3(0.12,0.12,0.3); vec3 c = mix(hor, mid, smoothstep(0.0,0.22,h)); c = mix(c, top, smoothstep(0.18,0.75,h)); gl_FragColor = vec4(c,1.0); }",
      }),
    );
    this.scene.add(this.sky);

    // lights: warm low sun + cool fill
    this.hemi = new THREE.HemisphereLight(0xffd2a6, 0x6a5878, LIGHT.hemi);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0x9a86a8, LIGHT.ambient);
    this.scene.add(this.ambient);
    const sun = new THREE.DirectionalLight(0xffa860, LIGHT.sun);
    this.sun = sun;
    sun.position.set(-40, 24, 30);
    this.scene.add(sun.target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(Q.shadowMapSize, Q.shadowMapSize);
    const sc = sun.shadow.camera;
    sc.left = -48;
    sc.right = 48;
    sc.top = 48;
    sc.bottom = -48;
    sc.near = 1;
    sc.far = 140;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);
    const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false }));
    sunDisc.position.set(-180, 26, 140);
    this.scene.add(sunDisc);

    this.level = buildLevel(this.levelDef, { lampLights: Q.lampLights });
    this.loot = this.buildLoot();
    this.charm = this.buildCharm();
    this.pantun.build(this.level.root);
    this.takeBoats();
    this.takeHorses();
    this.nav = buildNav(this.level.colliders, this.navBounds());
    this.scene.add(this.level.root);
    this.scene.add(this.player.group);
    loadRigs()
      .then((r) => {
        if (this.disposed) return;
        this.rigs = r;
        this.attachRigs();
      })
      .catch((e) => console.warn("[models] loading failed, keeping the built-in figures", e));
    // the Quaternius CC0 boat (props/sampan.glb) replaces the built-in sampan mesh when it is there
    loadProp("sampan", BOAT.modelLength)
      .then((m) => {
        if (this.disposed || !m) return;
        this.boatModel = m;
        for (const b of this.boats) this.dressBoat(b);
      })
      .catch((e) => console.warn("[models] boat failed, keeping the built-in sampan", e));
    // Quaternius CC0 jungle trees and ferns (props/tree_a, tree_b, fern), instanced over the level's spots
    Promise.all([loadProp("tree_a", JUNGLE_TREE_H, "height"), loadProp("tree_b", JUNGLE_TREE_H, "height"), loadProp("fern", 1, "height")])
      .then(([a, b, f]) => {
        if (this.disposed) return;
        this.plantModels = { trees: [a, b].filter((m): m is THREE.Object3D => !!m), fern: f };
        this.dressFoliage();
      })
      .catch((e) => console.warn("[models] plants failed, keeping the built-in trees", e));
    // Quaternius CC0 boulders (props/rock_a, rock_b) for Gunung Ledang, tinted to grey granite
    Promise.all([loadProp("rock_a", ROCK.h, "height"), loadProp("rock_b", ROCK.h, "height")])
      .then((ms) => {
        if (this.disposed) return;
        this.rockModels = ms.filter((m): m is THREE.Object3D => !!m);
        for (const m of this.rockModels)
          m.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            const tint = (x: THREE.Material) => {
              const c = x.clone() as THREE.MeshStandardMaterial;
              if (c.color) c.color.setHex(ROCK.color);
              c.map = null;
              return c;
            };
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(tint) : tint(mesh.material);
          });
        this.dressFoliage();
      })
      .catch((e) => console.warn("[models] rocks failed, keeping the built-in boulders", e));
    // the Quaternius CC0 horse (props/horse.glb), animated; else a block horse
    loadCreature("horse", HORSE.modelLength)
      .then((m) => {
        if (this.disposed || !m) return;
        this.horseModel = m;
        for (const h of this.horses) this.dressHorse(h);
      })
      .catch((e) => console.warn("[models] horse failed, keeping the block horse", e));

    this.knifeMesh = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 5), new THREE.MeshBasicMaterial({ color: 0xe6e6e6 }));
    this.knifeMesh.visible = false;
    this.scene.add(this.knifeMesh);
    // dev-only nav overlay (F3); never built in production
    if (process.env.NODE_ENV !== "production") {
      this.navDbg = new NavDebug(this.nav);
      this.scene.add(this.navDbg.group);
    }

    this.level.guards.forEach((def, i) => this.guards.push(this.makeGuard(def.waypoints, !!def.isTarget, i)));
    this.wayangLook = new WayangLook(this.scene, this.renderer, this.sky, this.quality === "low");
    this.wayangLook.setActive(!!this.def.wayang);

    this.resetWorld();
    this.bindEvents();
    this.onResize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ------------------------------------------------------------------ setup

  private makeGuard(waypoints: GuardDef["waypoints"], isTarget: boolean, id: number): Guard {
    const fig = makeGuardFigure(isTarget);
    const silhouette = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.45, 1.1, 4, 8),
      new THREE.MeshBasicMaterial({
        color: isTarget ? 0xffd24a : 0xff5a4a,
        transparent: true,
        opacity: 0.85,
        depthFunc: THREE.GreaterDepth,
        depthWrite: false,
      }),
    );
    silhouette.position.y = 1.0;
    silhouette.visible = false;
    silhouette.renderOrder = 5;
    fig.group.add(silhouette);

    const marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }),
    );
    marker.position.y = 2.7;
    marker.renderOrder = 999;
    marker.visible = false;
    fig.group.add(marker);

    const coneMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
    const cone = new THREE.Mesh(makeConeGeo(VIS.range, VIS.halfAngle), coneMat);
    cone.position.y = 0.06;
    cone.visible = false;
    fig.group.add(cone);

    if (isTarget) {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 40, 8, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.18, depthWrite: false }),
      );
      beam.position.y = 20;
      fig.group.add(beam);
      beam.name = "beam";
    }

    this.scene.add(fig.group);
    const guard: Guard = {
      id,
      isTarget,
      group: fig.group,
      body: fig.body,
      figure: fig.figure,
      rig: null,
      px: waypoints[0].x,
      pz: waypoints[0].z,
      silhouette,
      marker,
      cone,
      coneMat,
      x: waypoints[0].x,
      z: waypoints[0].z,
      yaw: 0,
      brain: newBrain(),
      meter: 0,
      waypoints,
      wp: 1 % waypoints.length,
      wait: 0,
      stun: 0,
      dead: false,
      fall: 0,
      y: waypoints[0].y ?? 0,
      vy: 0,
      climb: null,
      lastKnownY: 0,
      bodyMeter: 0,
      hp: GUARD_HP,
      atk: null,
      atkCd: 0,
      stagger: 0,
      flinch: 0,
      lastFlinch: -9,
      animKick: null,
      bodyTarget: null,
      carried: false,
      discovered: false,
      lastKnown: null,
      investigate: null,
      investigateY: 0,
      agent: new PathAgent(this.nav),
      noiseFlag: false,
      seesPlayer: false,
    };
    this.attachGuardRig(guard);
    return guard;
  }

  private resetWorld(spawn?: { x: number; z: number; rotY: number }) {
    const s = spawn ?? this.level.start;
    const yaw = spawn ? spawn.rotY : (3 * Math.PI) / 4;
    this.p = { x: s.x, y: spawn ? groundHeight(s.x, s.z, 1.0, this.level.colliders) : 0, z: s.z, vy: 0, grounded: true, yaw, moving: false, running: false };
    this.camYaw = yaw;
    this.camPitch = 0.35;
    this.climb = null;
    this.leap = null;
    this.eagle = false;
    this.ghaib.reset();
    this.knives = this.maxKnives;
    this.knifeCd = 0;
    this.stones = TOOL.stones;
    this.pepper = TOOL.pepper;
    this.wheel = null;
    this.hp = this.maxHp;
    this.hurtT = 99;
    this.hurtAnimT = 0;
    this.roll = null;
    this.rollCd = 0;
    this.parryT = 0;
    this.parryCd = 0;
    this.swing = null;
    this.charge = null;
    this.stabT = 0;
    this.objective = "main";
    this.taken = false;
    this.detected = false;
    if (this.loot) this.loot.visible = true;
    if (this.charm) this.charm.group.visible = !this.charmFound;
    this.charmPopT = null;
    this.charm?.group.scale.setScalar(1);
    this.feel.reset();
    this.camLookY = null;
    this.hidden = false;
    this.carrying = null;
    this.boat = null;
    for (const b of this.boats) Object.assign(b, { ...b.home, speed: 0 });
    this.horse = null;
    this.swim = null;
    for (const h of this.horses) Object.assign(h, { ...h.home, y: 0, speed: 0 });
    this.crouchToggle = false;
    this.lowCeiling = false;
    this.toastText = "";
    this.pantun.reset();
    (this.level.exitBeam.material as THREE.MeshBasicMaterial).opacity = 0;
    for (const g of this.guards) {
      g.x = g.waypoints[0].x;
      g.z = g.waypoints[0].z;
      g.y = g.waypoints[0].y ?? 0;
      g.wp = 1 % g.waypoints.length;
      g.yaw = yawTo(g, g.waypoints[g.wp]);
      g.brain = newBrain();
      g.meter = 0;
      g.stun = 0;
      g.pop = undefined;
      g.hp = GUARD_HP;
      g.atk = null;
      g.atkCd = 0;
      g.stagger = 0;
      g.flinch = 0;
      g.lastFlinch = -9;
      g.dead = false;
      g.fall = 0;
      g.wait = 0;
      g.lastKnown = null;
      g.lastKnownY = 0;
      g.investigateY = 0;
      g.agent.reset();
      g.y = 0;
      g.vy = 0;
      g.climb = null;
      g.bodyMeter = 0;
      g.bodyTarget = null;
      g.carried = false;
      g.discovered = false;
      g.investigate = null;
      g.noiseFlag = false;
      g.group.rotation.x = 0;
      g.group.visible = true;
    }
    this.syncMeshes();
  }

  private bindEvents() {
    const el = this.renderer.domElement;
    const on = <K extends keyof WindowEventMap>(t: K, fn: (e: WindowEventMap[K]) => void, target: Window = window) => {
      target.addEventListener(t, fn as EventListener);
      this.disposers.push(() => target.removeEventListener(t, fn as EventListener));
    };
    on("resize", () => this.onResize());
    on("keydown", (e) => {
      if (e.code === "F3" && this.navDbg) {
        e.preventDefault();
        this.navDbg.toggle();
        return;
      }
      if (this.phase === "intro") {
        if (isSkipKey(e.code)) {
          e.preventDefault();
          this.skipIntro();
        }
        return;
      }
      if (this.phase !== "playing") return;
      if (["Space", "ArrowUp", "ArrowDown", "Tab"].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.pressKey(e.code);
    });
    on("keyup", (e) => this.releaseKey(e.code));
    // mouse look needs the pointer captured; after an intro that ended on its own there was no click to do it
    el.addEventListener("click", () => {
      if (this.phase === "playing" && document.pointerLockElement !== el) this.lock();
    });
    on("mousedown", (e) => {
      if (this.phase !== "playing" || document.pointerLockElement !== el) return;
      if (e.button === 0) this.pressKey("Mouse0");
      if (e.button === 2) this.pressKey("Mouse2");
    });
    on("mouseup", (e) => this.keys.delete(`Mouse${e.button}`));
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    on("blur", () => {
      this.keys.clear();
      this.wheel = null;
    });
    on("mousemove", (e) => {
      if (this.phase === "playing" && document.pointerLockElement === el) this.look(e.movementX, e.movementY);
    });
    const lockChange = () => {
      if (document.pointerLockElement === el) this.lockedOnce = true;
      else if (this.lockedOnce && this.phase === "playing") this.pause();
    };
    document.addEventListener("pointerlockchange", lockChange);
    this.disposers.push(() => document.removeEventListener("pointerlockchange", lockChange));
    const vis = () => {
      if (document.hidden && this.phase === "playing") this.pause();
    };
    document.addEventListener("visibilitychange", vis);
    this.disposers.push(() => document.removeEventListener("visibilitychange", vis));
  }

  private onResize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ public API

  /** Play the intro cutscene. The caller reacts to onIntroEnd with start() or showTitle(). */
  playIntro(reduced = false) {
    this.resetWorld();
    this.intro = startIntro(reduced);
    this.introKey = "";
    this.setPhase("intro");
    this.stepIntro(0);
  }
  /** Skip (or finish) the intro now. Safe to call at any time and more than once. */
  skipIntro() {
    if (this.phase !== "intro" || !this.intro) return;
    this.intro = skipIntro(this.intro);
    this.finishIntro();
  }
  /** Back to the title screen (after a replayed intro). */
  showTitle() {
    this.intro = null;
    this.resetWorld();
    this.setPhase("title");
  }
  /** Test hook: jump the cutscene to time t. */
  debugIntroSeek(t: number) {
    if (this.phase === "intro" && this.intro) this.intro = { ...this.intro, t };
  }
  private finishIntro() {
    const s = this.intro;
    if (!s || !s.done) return;
    this.intro = null;
    this.cb.onIntroEnd?.(s.skipped);
  }
  private stepIntro(dt: number) {
    if (!this.intro) return;
    this.intro = advanceIntro(this.intro, dt);
    const { t, reduced } = this.intro;
    const c = cameraAt(t, reduced);
    this.camera.position.set(...c.pos);
    this.camera.lookAt(...c.look);
    const cap = captionAt(t, reduced);
    const view: IntroView = { text: cap?.text ?? "", opacity: cap ? cap.opacity : 0, fade: fadeAt(t, reduced) };
    const key = `${view.text}|${view.opacity.toFixed(2)}|${view.fade.toFixed(2)}`;
    if (key !== this.introKey) {
      this.introKey = key;
      this.cb.onIntro?.(view);
    }
    if (this.intro.done) this.finishIntro();
  }

  /** Begin the mission, from the beginning or from the "target down" checkpoint. Guard and alert state is never restored. */
  start(from: Checkpoint = "start") {
    this.resetWorld();
    this.clearKapitan(true);
    this.run = { time: 0, alerts: 0, fromStart: from === "start" };
    this.tideSaid = null;
    if (from === "start" || this.fog.seen.length === 0) this.clearFog();
    if (from === "target") this.applyTargetCheckpoint();
    this.chron.begin(this.def.id, from, this.guards.length);
    this.dalang.begin(!!this.def.wayang, from === "target");
    this.shade = 0;
    this.cb.onCheckpoint?.(from);
    this.setPhase("playing");
    this.lock();
  }
  private applyTargetCheckpoint() {
    const o = this.def.objective;
    if (o.kind === "steal") {
      this.taken = true;
      if (this.loot) this.loot.visible = false;
      this.p.x = o.at.x;
      this.p.z = o.at.z;
      this.p.y = o.at.y;
    } else {
      const t = this.guards.find((g) => g.isTarget);
      if (!t) return;
      t.dead = true;
      this.p.x = t.x;
      this.p.z = t.z;
    }
    this.objective = "escape";
    (this.level.exitBeam.material as THREE.MeshBasicMaterial).opacity = 0.35;
    this.syncMeshes();
  }
  /** The level's objective is done: open the escape, save the checkpoint. */
  private completeObjective() {
    this.objective = "escape";
    (this.level.exitBeam.material as THREE.MeshBasicMaterial).opacity = 0.35;
    this.toast(this.level.text.targetDown);
    this.chron.add({ k: "objective" });
    this.dalang.cue("checkpoint");
    this.cb.onCheckpoint?.("target");
  }
  /** A small chest with a gold band and a faint glow, for steal objectives; part of the level root so it is disposed with it. */
  private buildLoot(): THREE.Group | null {
    const o = this.def.objective;
    if (o.kind !== "steal") return null;
    const g = new THREE.Group();
    add(g, shadowMesh(new THREE.BoxGeometry(0.8, 0.45, 0.5), std(0x5a3a1e)), 0, 0.23);
    add(g, shadowMesh(new THREE.BoxGeometry(0.82, 0.08, 0.52), std(0xd9a93a, { metalness: 0.6, roughness: 0.4 })), 0, 0.32);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.18, depthWrite: false })), 0, 0.3);
    g.position.set(o.at.x, o.at.y, o.at.z);
    this.level.root.add(g);
    return g;
  }
  /** The mission's tangkal: a small gold pendant turning above its haystack or bush, with a faint glow; part of the level root. */
  private buildCharm() {
    const a = amuletForLevel(this.def.id);
    const at = a && amuletSpot(this.def);
    if (!a || !at) return null;
    const g = new THREE.Group();
    const gold = std(0xe0b040, { metalness: 0.7, roughness: 0.35, emissive: 0x6a4a10 });
    add(g, new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 16), gold), 0, 0.22);
    add(g, new THREE.Mesh(new THREE.OctahedronGeometry(0.11), gold));
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.22, depthWrite: false })));
    g.position.set(at.x, 1.7, at.z);
    g.visible = !this.charmFound;
    this.level.root.add(g);
    return { group: g, x: at.x, z: at.z, id: a.id, name: a.name };
  }
  /** Whether the player already owns this mission's tangkal (then it is not on the map). */
  setAmuletFound(found: boolean) {
    this.charmFound = found;
    if (this.charmPopT !== null && !found) this.charmPopT = null;
    // a pickup pop still playing hides the charm itself when it ends
    if (this.charm && this.charmPopT === null) this.charm.group.visible = !found;
  }
  private nearCharm() {
    const c = this.charm;
    return !!c && !this.charmFound && c.group.visible && dist2D(this.p, c) < 1.7 && this.p.y < 1.2;
  }
  /** steal objectives: the player is close enough to take the item */
  private nearLoot() {
    const o = this.def.objective;
    return o.kind === "steal" && !this.taken && dist2D(this.p, o.at) < 1.4 && Math.abs(this.p.y - o.at.y) < 1.2;
  }
  private clearFog() {
    const b = this.def.bounds;
    const cols = Math.ceil((b.maxX - b.minX) / FOG.cell);
    const rows = Math.ceil((b.maxZ - b.minZ) / FOG.cell);
    this.fog = { cols, rows, seen: (this.fogSaved && unpackFog(this.fogSaved, cols * rows)) || new Uint8Array(cols * rows), at: -1 };
  }
  /** A guard says a line of this kind, if the player is near enough to hear and nothing louder is being said. */
  private say(g: Guard, kind: BarkKind) {
    if ((g.talkCd ?? 0) > 0 && kind !== "alert") return;
    if (dist2D(g, this.p) > BARK_RANGE[kind]) return;
    const pri = BARK_PRIORITY[kind];
    if (this.talk.t > 0 && pri < this.talk.pri) return;
    const pool = barkLines(this.def.id, kind).filter((l) => l !== this.lastLine);
    const line = pool[Math.floor(Math.random() * pool.length)];
    if (!line) return;
    this.lastLine = line;
    this.talk = { text: line, t: 2.2 + line.length * 0.035, pri };
    g.talkCd = kind === "idle" ? 12 : 4;
  }
  /** Patrolling guards near the player grumble now and then. */
  private chatter(dt: number) {
    this.talk.t = Math.max(0, this.talk.t - dt);
    for (const g of this.guards) if (g.talkCd) g.talkCd = Math.max(0, g.talkCd - dt);
    this.idleT -= dt;
    if (this.idleT > 0 || this.talk.t > 0) return;
    this.idleT = 9 + Math.random() * 9;
    let best: Guard | null = null;
    for (const g of this.guards) {
      if (g.dead || g.stun > 0 || g.brain.state !== "patrol" || g.seesPlayer) continue;
      if (!best || dist2D(g, this.p) < dist2D(best, this.p)) best = g;
    }
    if (best) this.say(best, "idle");
  }
  setKitab(ids: readonly string[]) {
    for (const id of ids) this.kitab.add(id);
  }
  /** Pantun already overheard (from the save): their right answers are marked at the gates. */
  setPantun(ids: readonly string[]) {
    this.pantun.setKnown(ids);
  }
  /** Answer the open pantun dialogue with option i (touch or a mouse click on the panel). */
  pantunPick(i: number) {
    if (this.phase === "playing") this.pantun.pick(i, this.p, this.guards);
  }
  /** A few times a second: any Kitab place the player is standing in for the first time gets a page. */
  private checkKitab(dt: number) {
    this.kitabT -= dt;
    if (this.kitabT > 0) return;
    this.kitabT = 0.4;
    for (const pl of placesAt(this.p.x, this.p.y, this.p.z, this.def.id)) {
      if (this.kitab.has(pl.id)) continue;
      this.kitab.add(pl.id);
      this.toast(`Kitab: ${pl.title}`);
      this.cb.onKitab?.(pl.id);
    }
  }
  /** The save's explored map for the current level; used from the next fresh attempt, and merged in now. */
  setExplored(packed: string | null) {
    this.fogSaved = packed;
    const { cols, rows, seen } = this.fog;
    const old = packed && cols ? unpackFog(packed, cols * rows) : null;
    if (old) for (let i = 0; i < seen.length; i++) seen[i] |= old[i];
  }
  /** Mark the squares around the player as explored (only when they step into a new square). */
  private reveal() {
    const b = this.def.bounds;
    const { cols, rows, seen } = this.fog;
    if (!cols) return;
    const cx = Math.floor((this.p.x - b.minX) / FOG.cell);
    const cz = Math.floor((this.p.z - b.minZ) / FOG.cell);
    const at = cz * cols + cx;
    if (at === this.fog.at) return;
    this.fog.at = at;
    const n = Math.ceil(FOG.r / FOG.cell);
    for (let z = Math.max(0, cz - n); z <= Math.min(rows - 1, cz + n); z++)
      for (let x = Math.max(0, cx - n); x <= Math.min(cols - 1, cx + n); x++) {
        const dx = (x + 0.5) * FOG.cell + b.minX - this.p.x;
        const dz = (z + 0.5) * FOG.cell + b.minZ - this.p.z;
        if (dx * dx + dz * dz <= FOG.r * FOG.r && !seen[z * cols + x]) {
          seen[z * cols + x] = 1;
          this.fogDirty = true;
        }
      }
  }
  /** Player, objective and run numbers for the pause menu. */
  mapState(): MapState {
    const o = this.def.objective;
    const tgt = this.objective !== "main" ? null : o.kind === "steal" ? o.at : this.guards.find((g) => g.isTarget && !g.dead);
    return {
      player: { x: this.p.x, z: this.p.z, yaw: this.p.yaw },
      objective: tgt ? { x: tgt.x, z: tgt.z } : null,
      exit: { x: this.level.exit.x, z: this.level.exit.z },
      exits: exitsOf(this.def.id).map((e) => ({ id: e.id, x: e.at.x, z: e.at.z, label: e.label, to: e.to })),
      escape: this.objective === "escape",
      guards: this.guards.length,
      guardsDown: this.guards.filter((g) => g.dead).length,
      time: this.run.time,
      alerts: this.run.alerts,
      knives: this.knives,
      maxKnives: this.maxKnives,
      stones: this.stones,
      pepper: this.pepper,
      hp: this.hp,
      maxHp: this.maxHp,
      fog: { minX: this.def.bounds.minX, minZ: this.def.bounds.minZ, cell: FOG.cell, cols: this.fog.cols, rows: this.fog.rows, seen: this.fog.seen.slice() },
    };
  }
  // ------------------------------------------------------------------ Dua pemain: the Kapitan's hand
  // A friend plays the Kapitan from a phone (kapitanHost.ts). This game is authoritative: the host
  // checks limits, cooldowns and the rate limit (kapitan.ts); these methods only check the world.
  private kap = {
    epoch: 0,
    lanterns: [] as { x: number; z: number; obj: THREE.Group }[],
    /** guards sent somewhere keep "hearing" the spot until they reach it (hold: until the time runs out) */
    orders: new Map<Guard, { x: number; z: number; until: number; hold: boolean }>(),
    /** where a guard last saw the pendekar, in play time */
    seen: null as { x: number; z: number; t: number } | null,
  };
  /** The Kapitan's view: guards, pelita, and the pendekar only where a guard sees or last saw him. */
  kapitanSnapshot(): KapitanWorld {
    const live = this.phase === "playing" || this.phase === "paused";
    const seen = live && this.guards.some((g) => !g.dead && g.stun <= 0 && g.seesPlayer);
    if (seen) this.kap.seen = { x: this.p.x, z: this.p.z, t: this.run.time };
    const k = this.kap.seen;
    const o = this.def.objective;
    const tgt = this.objective !== "main" ? null : o.kind === "steal" ? o.at : this.guards.find((g) => g.isTarget && !g.dead);
    const st: Record<GuardState, number> = { patrol: 0, suspicious: 1, search: 2, alert: 3 };
    return {
      epoch: this.kap.epoch,
      level: this.def.id,
      phase: this.phase,
      t: round1(this.run.time),
      guards: this.guards.map((g): GuardTuple => [
        g.id,
        round1(g.x),
        round1(g.z),
        Math.round(g.yaw * 100) / 100,
        st[g.brain.state],
        (g.dead ? 1 : 0) | (g.isTarget ? 2 : 0) | (g.stun > 0 ? 4 : 0) | (this.kap.orders.has(g) ? 8 : 0),
      ]),
      lanterns: this.kap.lanterns.map((l): [number, number] => [round1(l.x), round1(l.z)]),
      pendekar: k ? { x: round1(k.x), z: round1(k.z), seen, age: round1(this.run.time - k.t) } : null,
      objective: tgt ? { x: round1(tgt.x), z: round1(tgt.z) } : null,
      exit: { x: this.level.exit.x, z: this.level.exit.z },
      escape: this.objective === "escape",
    };
  }
  private kapInside(x: number, z: number) {
    const b = this.def.bounds;
    return Number.isFinite(x) && Number.isFinite(z) && x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
  }
  /** Light a pelita at (x, z): guards spot the pendekar faster inside its glow. */
  addLantern(x: number, z: number): boolean {
    if (this.phase !== "playing" || !this.kapInside(x, z) || this.kap.lanterns.length >= KAPITAN.lanterns) return false;
    if (this.kap.lanterns.some((l) => Math.hypot(l.x - x, l.z - z) < KAPITAN.lanternGap)) return false;
    const obj = new THREE.Group();
    add(obj, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6), std(0x3a2616)), 0, 1.1);
    add(obj, new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.32), new THREE.MeshBasicMaterial({ color: 0xffb347 })), 0, 2.35);
    add(obj, new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0.25, depthWrite: false })), 0, 2.35);
    const pool = add(
      obj,
      new THREE.Mesh(
        new THREE.CircleGeometry(KAPITAN.lanternR, 28),
        new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending }),
      ),
      0,
      0.06,
    );
    pool.rotation.x = -Math.PI / 2;
    obj.position.set(x, groundHeight(x, z, 99, this.level.colliders), z);
    this.scene.add(obj);
    this.kap.lanterns.push({ x, z, obj });
    if (dist2D(this.p, { x, z }) < 30) this.toast("A pelita is lit nearby: guards spot you faster in its glow");
    return true;
  }
  /** Send guard `id` to look at (x, z), as if he heard something there. */
  sendGuard(id: number, x: number, z: number): boolean {
    const g = this.guards.find((o) => o.id === id);
    if (this.phase !== "playing" || !g || g.dead || g.carried || g.stun > 0 || g.brain.state === "alert" || !this.kapInside(x, z)) return false;
    // heard from the next frame on (stepKapitan)
    this.kap.orders.set(g, { x, z, until: this.run.time + KAPITAN.orderTime, hold: false });
    return true;
  }
  /** The kentung: every free guard turns suspicious for a while, toward where the pendekar was last seen if that is near him. Returns how many heard it. */
  soundAlarm(): number {
    if (this.phase !== "playing") return 0;
    const at = this.kap.seen;
    let n = 0;
    for (const g of this.guards) {
      if (g.dead || g.carried || g.stun > 0 || g.brain.state === "alert") continue;
      const pt = at && dist2D(g, at) < 40 ? { x: at.x, z: at.z } : { x: g.x, z: g.z };
      this.kap.orders.set(g, { ...pt, until: this.run.time + KAPITAN.alarmHold, hold: true });
      n++;
    }
    if (n) this.toast("Kentung! The Kapitan beats the alarm drum: every guard is on edge");
    return n;
  }
  /** Runs after footsteps and thrown tools are heard: a real noise this frame (noiseFlag) wins over the Kapitan's order. */
  private stepKapitan() {
    for (const [g, o] of this.kap.orders) {
      if (g.dead || g.stun > 0 || g.noiseFlag || g.brain.state === "alert" || this.run.time > o.until || (!o.hold && dist2D(g, o) < 2)) this.kap.orders.delete(g);
      else this.hear(g, { x: o.x, z: o.z, y: 0 });
    }
  }
  /** detection multiplier: inside a pelita's glow the pendekar is spotted faster */
  private kapitanLight() {
    return this.kap.lanterns.some((l) => Math.hypot(l.x - this.p.x, l.z - this.p.z) < KAPITAN.lanternR) ? KAPITAN.lanternBoost : 1;
  }
  /** Put out the pelita and forget orders; a new attempt (newEpoch) gives the Kapitan his powers back. */
  private clearKapitan(newEpoch: boolean) {
    for (const l of this.kap.lanterns) {
      this.scene.remove(l.obj);
      l.obj.traverse((m) => {
        const mesh = m as THREE.Mesh;
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material | undefined)?.dispose?.();
      });
    }
    this.kap.lanterns = [];
    this.kap.orders.clear();
    this.kap.seen = null;
    if (newEpoch) this.kap.epoch++;
  }
  private get maxHp() {
    return MAX_HP + this.mods.maxHp;
  }
  private get maxKnives() {
    return START_KNIVES + this.mods.knives;
  }
  /** Learned Ilmu skills; mid-mission, extra health and knives are handed over at once. */
  setSkills(m: SkillMods) {
    const hp = m.maxHp - this.mods.maxHp;
    const kn = m.knives - this.mods.knives;
    this.mods = m;
    this.hp = clamp(this.hp + Math.max(0, hp), 0, this.maxHp);
    this.knives = clamp(this.knives + Math.max(0, kn), 0, this.maxKnives);
  }
  /** Play stats for the current attempt (read when it ends). */
  stats(): RunStats {
    return { ...this.run };
  }
  /** The event log of the current attempt, as plain data (hikayat.ts tells it). */
  chronicle(): ChronicleData {
    return this.chron.snapshot();
  }
  /** The win screen's wording: the mission's own, or on a wayang mission the dalang's ending for how it was played. */
  winText(): { title: string; body: string } {
    return this.dalang.ending(this.run.alerts) ?? this.def.win;
  }
  /** The puteri's tally of the current attempt (read when it is won). */
  ghaibTally() {
    return this.ghaib.tally(this.run.alerts);
  }
  /** The save's cumulative restu: the bunian paths shine brighter or flicker, and semangat drains slower when blessed. */
  setRestu(restu: number) {
    this.ghaib.setRestu(restu);
  }
  /** Mouse and touch look settings: sensitivity multiplier and inverted vertical look. */
  setLookSettings(sens: number, invertY: boolean) {
    this.lookSens = Number.isFinite(sens) && sens > 0 ? sens : 1;
    this.invertY = invertY;
  }
  /** "Kurangkan gegaran": no camera shake or dip (also on when the system asks for reduced motion) */
  setReduceShake(on: boolean) {
    this.feel.reduce = on;
  }
  resume() {
    if (this.phase === "paused") {
      this.setPhase("playing");
      this.lock();
    }
  }
  pause() {
    if (this.phase === "playing") {
      this.keys.clear();
      this.wheel = null;
      this.setTouchMove(0, 0, false);
      this.setPhase("paused");
    }
  }
  private lock() {
    if (this.touch) return;
    try {
      const r = this.renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
      r?.catch?.(() => {});
    } catch {
      /* pointer lock unavailable (e.g. headless); keyboard still works */
    }
  }
  /** Key press as the keyboard handler sees it. Touch buttons call this with the same codes (KeyE, KeyQ, KeyF, KeyV, KeyC, KeyR, KeyX, Space). */
  pressKey(code: string) {
    if (this.phase !== "playing") return;
    if (this.pantun.choosing) {
      this.pantun.key(code, this.p, this.guards);
      this.hudTimer = 0;
      return;
    }
    this.keys.add(code);
    if (code === "KeyE" || code === "Mouse0") this.tryTakedown();
    if (code === "KeyR" || code === "Mouse2") this.tryParry();
    if (code === "KeyX") this.tryRoll();
    if (code === "KeyQ") this.useTool();
    if (code === "Tab") this.wheel = { x: 0, y: 0, sel: this.tool };
    if (code === "Digit1" || code === "Digit2" || code === "Digit3") this.pickTool(TOOLS[Number(code.slice(5)) - 1].id);
    if (code === "ToolPrev" || code === "ToolNext") {
      const i = TOOLS.findIndex((t) => t.id === this.tool);
      this.pickTool(TOOLS[(i + (code === "ToolNext" ? 1 : TOOLS.length - 1)) % TOOLS.length].id);
    }
    if (code === "KeyF") this.tryCarry();
    if (code === "KeyV") this.eagle = !this.eagle;
    if (code === "KeyC") this.crouchToggle = !this.crouchToggle;
    if (code === "Space") this.tryJumpOrClimb();
  }
  releaseKey(code: string) {
    this.keys.delete(code);
    if (code === "Tab" && this.wheel) {
      const sel = this.wheel.sel;
      this.wheel = null;
      this.pickTool(sel);
    }
  }
  private pickTool(id: ToolId) {
    if (id !== this.tool) this.toast(TOOLS.find((t) => t.id === id)!.name);
    this.tool = id;
    this.hudTimer = 0;
  }
  /** A level's sanctuary (a place of worship): no blade, stone or pepper is used inside it. */
  private inSanctuary() {
    const r = this.def.sanctuary;
    return !!r && Math.abs(this.p.x - r.x) < r.w / 2 && Math.abs(this.p.z - r.z) < r.d / 2;
  }
  private useTool() {
    if (this.inSanctuary()) {
      this.toast("Not on this ground. Keep the peace.");
      return;
    }
    if (this.tool === "knife") this.tryThrow();
    else if (this.tool === "stone") this.throwStone();
    else this.throwPepper();
  }
  /** Camera aim point: the first wall or roof along the view, else the ground, at most 40 m out. */
  private aimPoint(): THREE.Vector3 {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const o = this.camera.position;
    let t = 40;
    const wall = raycastBoxes({ x: o.x, y: o.y, z: o.z }, dir, this.level.colliders, t);
    if (wall !== null) t = wall;
    if (dir.y < -0.01) t = Math.min(t, o.y / -dir.y);
    return o.clone().addScaledVector(dir, t);
  }
  private throwStone() {
    if (this.stones <= 0 || this.knifeCd > 0 || this.climb || this.leap || this.swim) return;
    this.stones--;
    this.knifeCd = 0.6;
    const hit = this.aimPoint();
    this.knifeFly = { t: 0, from: new THREE.Vector3(this.p.x, this.p.y + 1.3, this.p.z), to: hit };
    let n = 0;
    for (const g of this.guards) {
      if (g.dead || dist2D(g, hit) >= TOOL.stoneHear) continue;
      this.hear(g, { x: hit.x, z: hit.z, y: hit.y });
      n++;
    }
    this.chron.add({ k: "tool", tool: "stone", hit: n });
    this.toast(n ? "Stone thrown. They heard it." : "Stone thrown.");
  }
  private throwPepper() {
    if (this.pepper <= 0 || this.knifeCd > 0 || this.climb || this.leap || this.swim) return;
    this.pepper--;
    this.knifeCd = 0.8;
    let n = 0;
    for (const g of this.guards) {
      if (g.dead || dist2D(g, this.p) > TOOL.pepperR || Math.abs(g.y - this.p.y) > 2) continue;
      g.stun = Math.max(g.stun, TOOL.pepperBlind);
      this.ghaib.onStun(g.id);
      this.say(g, "blind");
      g.atk = null;
      g.meter = 0;
      n++;
    }
    if (!this.puff) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xc8823a, transparent: true, opacity: 0.5, depthWrite: false }));
      this.scene.add(m);
      this.puff = { t: 0, mesh: m };
    }
    this.puff.t = 0;
    this.puff.mesh.position.set(this.p.x, this.p.y + 1.2, this.p.z);
    this.chron.add({ k: "tool", tool: "pepper", hit: n });
    this.toast(n ? `Pepper! ${n} guard${n === 1 ? "" : "s"} blinded.` : "Pepper thrown. Nobody close enough.");
  }
  /** Analog movement from the touch joystick: x strafe, y forward, both -1..1 already deadzoned. */
  setTouchMove(x: number, y: number, run: boolean) {
    this.touchMove.x = x;
    this.touchMove.y = y;
    this.touchMove.run = run;
  }
  look(dx: number, dy: number) {
    if (this.pantun.choosing) {
      this.pantun.look(dy);
      return;
    }
    if (this.wheel) {
      // the wheel takes the mouse / right stick: point at a slot (up: knife, then clockwise)
      const w = this.wheel;
      w.x += dx;
      w.y += dy;
      const m = Math.hypot(w.x, w.y);
      if (m > 120) {
        w.x *= 120 / m;
        w.y *= 120 / m;
      }
      if (m > 30) {
        const a = (Math.atan2(w.x, -w.y) + Math.PI * 2) % (Math.PI * 2);
        const sel = TOOLS[Math.round(a / ((Math.PI * 2) / TOOLS.length)) % TOOLS.length].id;
        if (sel !== w.sel) {
          w.sel = sel;
          this.hudTimer = 0;
        }
      }
      return;
    }
    const k = 0.0022 * this.lookSens;
    this.camYaw -= dx * k;
    this.camPitch = clamp(this.camPitch + dy * k * (this.invertY ? -1 : 1), -0.25, 1.2);
  }
  /** Small read-only snapshot used by the automated browser check. */
  debug() {
    return {
      phase: this.phase,
      introT: this.intro?.t ?? null,
      player: { x: this.p.x, y: this.p.y, z: this.p.z },
      lose: this.loseReason,
      guards: this.guards.map((g) => ({ x: g.x, y: g.y, z: g.z, climbing: !!g.climb, state: g.brain.state, dead: g.dead, target: g.isTarget, hp: g.hp, atk: g.atk, stagger: g.stagger })),
      hp: this.hp,
      rolling: !!this.roll,
      parrying: this.parryT > 0,
      charging: this.charge,
      /** seconds from a guard starting his strike to it landing */
      windup: GUARD_ATK.windup,
      leaping: !!this.leap,
      boat: !!this.boat,
      horse: !!this.horse,
      horses: this.horses.map((h) => ({ x: h.x, z: h.z, yaw: h.yaw })),
      boats: this.boats.map((b) => ({ x: b.x, z: b.z, yaw: b.yaw })),
      objective: this.objective,
      exit: { x: this.level.exit.x, z: this.level.exit.z },
      drawCalls: this.renderer.info.render.calls,
      quality: this.quality,
      camYaw: this.camYaw,
      camPitch: this.camPitch,
      crouched: this.crouched,
      eagle: this.eagle,
      knives: this.knives,
      pixelRatio: this.renderer.getPixelRatio(),
      level: this.levelDef.id,
    };
  }
  /** Test hook: can the mission be walked on the ground, start to target and target to exit? */
  debugRoute(): { toTarget: boolean; toExit: boolean } {
    const L = this.level;
    const o = this.def.objective;
    const t = o.kind === "steal" ? o.at : this.guards.find((g) => g.isTarget);
    if (!t) return { toTarget: false, toExit: false };
    const at = (p: Vec2 & { y?: number }) => ({ x: p.x, y: p.y ?? 0, z: p.z });
    return {
      toTarget: !!this.nav.findPath(at(L.start), at(t))?.found,
      toExit: !!this.nav.findPath(at(t), at(L.exit))?.found,
    };
  }
  /** Test hook: a rooftop spot a guard can path to by climbing (used by the automated browser check). */
  debugRoofSpot(): { x: number; y: number; z: number } | null {
    const g0 = this.guards[0];
    let best: { x: number; y: number; z: number } | null = null;
    let bestLen = 0;
    for (let l = 1; l < this.nav.layers; l++)
      for (let iz = 0; iz < this.nav.h; iz += 6)
        for (let ix = 0; ix < this.nav.w; ix += 6) {
          if (!this.nav.isWalkable(l, ix, iz)) continue;
          const goal = { x: this.nav.cx(ix), y: this.nav.heights[l], z: this.nav.cz(iz) };
          const path = this.nav.findPath({ x: g0.x, y: 0, z: g0.z }, goal);
          if (!path?.found || !path.points.some((q) => q.via)) continue;
          const len = pathLen(path.points);
          if (len > bestLen && len < 60) {
            bestLen = len;
            best = goal;
          }
        }
    return best;
  }
  /** Test hook: stand the player at a roof edge with a calm guard below, facing away. Returns the guard's index or -1. */
  debugAirSetup(): number {
    const L = this.level;
    const gi = this.guards.findIndex((o, i) => i > 0 && !o.dead && !o.isTarget);
    if (gi < 0) return -1;
    const g = this.guards[gi];
    for (const b of L.colliders) {
      if (b.maxY < 2.5 || b.maxY > 6 || b.maxX - b.minX < 2 || b.maxZ - b.minZ < 2) continue;
      const cx = (b.minX + b.maxX) / 2;
      const cz = (b.minZ + b.maxZ) / 2;
      const spots = [
        [cx, b.minZ + 0.4, cx, b.minZ - 1.4],
        [cx, b.maxZ - 0.4, cx, b.maxZ + 1.4],
        [b.minX + 0.4, cz, b.minX - 1.4, cz],
        [b.maxX - 0.4, cz, b.maxX + 1.4, cz],
      ];
      for (const [px, pz, gx, gz] of spots) {
        // the guard's spot must be open ground with nothing overhead, the player's on top of this box
        if (L.colliders.some((o) => gx > o.minX - 0.5 && gx < o.maxX + 0.5 && gz > o.minZ - 0.5 && gz < o.maxZ + 0.5 && o.minY < b.maxY + 2)) continue;
        if (groundHeight(px, pz, b.maxY, L.colliders) !== b.maxY) continue;
        const pp = { x: px, y: b.maxY, z: pz };
        if (!canAirAssassinate(pp, { x: gx, y: 0, z: gz }, L.colliders)) continue;
        Object.assign(this.p, pp, { vy: 0, grounded: true });
        Object.assign(g, { x: gx, y: 0, z: gz, vy: 0, yaw: yawTo(pp, { x: gx, z: gz }), brain: newBrain(), meter: 0, wait: 30, climb: null });
        g.agent.reset();
        return gi;
      }
    }
    return -1;
  }
  /** Test hook: put the player at a spot and alert every guard to it. */
  debugAlertAt(x: number, y: number, z: number) {
    this.p.x = x;
    this.p.y = y;
    this.p.z = z;
    this.p.vy = 0;
    for (const g of this.guards) {
      if (g.dead) continue;
      g.brain = forceAlert();
      g.meter = 1;
      g.lastKnown = { x, z };
      g.lastKnownY = y;
    }
  }
  /**
   * Test hook: a one-on-one fight. Puts the player 1.6 m from the first live, non-target guard standing on open ground
   * with no other guard within 5 m, faces them at each other and freezes every other guard. With alert he is already
   * fighting; without, he is calm and has to see the player first. Returns his index, or -1 if no guard fits.
   */
  debugDuel(alert = true): number {
    const C = this.level.colliders;
    for (let i = 0; i < this.guards.length; i++) {
      const g = this.guards[i];
      if (g.dead || g.isTarget || g.climb || g.y > 0.05) continue;
      if (this.guards.some((o) => o !== g && !o.dead && dist2D(o, g) < 5)) continue;
      for (let k = 0; k < 8; k++) {
        const a = g.yaw + (k * Math.PI) / 4;
        const q = { x: g.x + Math.sin(a) * 1.6, z: g.z + Math.cos(a) * 1.6 };
        const q0 = { ...q };
        pushOut(q, PLAYER_R, C, 0);
        if (Math.hypot(q.x - q0.x, q.z - q0.z) > 0.01 || groundHeight(q.x, q.z, 0, C) > 0.05) continue;
        for (const o of this.guards) if (o !== g && !o.dead) o.stun = 1e6;
        const p = this.p;
        Object.assign(p, { x: q.x, y: 0, z: q.z, vy: 0, grounded: true, moving: false });
        p.yaw = yawTo(p, g);
        g.yaw = yawTo(g, p);
        Object.assign(g, { atk: null, atkCd: 0, hp: GUARD_HP, stagger: 0, flinch: 0, lastFlinch: -9, wait: 99 });
        if (alert) {
          g.brain = forceAlert();
          g.meter = 1;
          g.lastKnown = { x: p.x, z: p.z };
          g.lastKnownY = 0;
        }
        Object.assign(this, { hp: this.maxHp, hurtT: 99, roll: null, rollCd: 0, swing: null, parryT: 0, parryCd: 0 });
        return i;
      }
    }
    return -1;
  }
  /** Test hook: run the simulation ahead by `seconds` in fixed 1/30 s steps without rendering. Stops early if the phase changes. */
  /** Test hook: stand the player at a spot (on the ground or whatever is under it). */
  debugPlace(x: number, z: number) {
    this.boat = null;
    this.horse = null;
    Object.assign(this.p, { x, z, y: groundHeight(x, z, 1.0, this.level.colliders), vy: 0, grounded: true });
  }
  /** Test hook: point the camera (and so "forward") along a yaw. */
  debugCamYaw(yaw: number) {
    this.camYaw = yaw;
  }
  debugAdvance(seconds: number) {
    const step = 1 / 30;
    for (let t = 0; t < seconds && this.phase === "playing"; t += step) {
      this.time += step;
      this.update(step);
    }
  }
  /** Switch missions on the title screen: rebuild the map, nav grid and guards in place, no reload. */
  setLevel(def: LevelDef) {
    if (def === this.def || (this.phase !== "title" && this.phase !== "won" && this.phase !== "lost")) return;
    this.swapLevel(def);
  }
  /** Gate travel: queue the swap; update() ends first, the swap runs at the end of the frame. */
  travel(toId: string, arrive: { x: number; z: number; rotY: number }) {
    const e = exitsOf(this.def.id).find((x) => x.to === toId && x.arrive.x === arrive.x && x.arrive.z === arrive.z);
    this.pendingTravel = e ?? { id: "", at: { x: 0, z: 0, w: 0, d: 0 }, to: toId, arrive, label: "" };
  }
  private doTravel(e: ExitDef) {
    const def = LEVELS.find((l) => l.id === e.to);
    if (!def || this.phase !== "playing") return;
    if (this.fogDirty && this.fog.cols) {
      this.fogDirty = false;
      this.cb.onExplored?.(this.def.id, packFog(this.fog.seen));
    }
    this.swapLevel(def, e.arrive);
    this.clearFog();
    this.clearKapitan(true);
    this.run = { time: 0, alerts: 0, fromStart: true };
    this.tideSaid = null;
    this.chron.begin(def.id, "start", this.guards.length);
    this.dalang.begin(!!def.wayang, false);
    this.shade = 0;
    this.gateDwell = 0;
    this.gateNow = null;
    this.gateCd = 1.5;
    this.gateFade = 1;
    this.cb.onTravel?.(def);
    this.cb.onCheckpoint?.("start");
  }
  private swapLevel(def: LevelDef, spawn?: { x: number; z: number; rotY: number }) {
    this.scene.remove(this.level.root);
    // geometries and the level's own materials go; materials from the shared cache are kept
    disposeLevel(this.level);
    for (const g of this.guards) {
      g.rig?.dispose();
      this.scene.remove(g.group);
    }
    this.guards = [];
    this.clearKapitan(true);
    this.def = def;
    this.fog = { cols: 0, rows: 0, seen: new Uint8Array(0), at: -1 };
    this.fogSaved = null;
    this.fogDirty = false;
    this.level = buildLevel(def, { lampLights: QUALITY[this.quality].lampLights });
    this.lampTimer = 0;
    this.loot = this.buildLoot();
    this.charm = this.buildCharm();
    this.charmPopT = null;
    this.pantun.build(this.level.root);
    this.takeBoats();
    this.takeHorses();
    this.dressFoliage();
    this.nav = buildNav(this.level.colliders, this.navBounds());
    this.scene.add(this.level.root);
    if (this.navDbg) {
      this.scene.remove(this.navDbg.group);
      this.navDbg = new NavDebug(this.nav);
      this.scene.add(this.navDbg.group);
    }
    this.level.guards.forEach((gd, i) => this.guards.push(this.makeGuard(gd.waypoints, !!gd.isTarget, i)));
    this.wayangLook?.setActive(!!def.wayang);
    this.resetWorld(spawn);
  }
  /** Swap the procedural figures for the loaded models (player and every guard that has none yet). */
  private attachRigs() {
    const pt = this.rigs.pendekar;
    if (pt && !this.playerRig) {
      this.playerRig = new Rig(pt, cloneSkinned);
      this.player.figure.forEach((o) => (o.visible = false));
      this.player.group.add(this.playerRig.object);
      this.playerRig.play("idle", 0);
    }
    for (const g of this.guards) this.attachGuardRig(g);
  }
  private attachGuardRig(g: Guard) {
    const t = g.isTarget ? this.rigs.target : this.rigs.guard;
    if (!t || g.rig) return;
    g.rig = new Rig(t, cloneSkinned);
    g.figure.forEach((o) => (o.visible = false));
    g.group.add(g.rig.object);
    g.rig.play("idle", 0);
  }
  /** Pick each character's animation from what it is doing, and advance the mixers. */
  private animateRigs(dt: number) {
    for (const h of this.horses) {
      if (!h.mixer) continue;
      const s = Math.abs(h.speed);
      const want = s > HORSE.walk + 1 && h.acts.gallop ? "gallop" : s > 0.3 && h.acts.walk ? "walk" : "idle";
      if (want !== h.cur && h.acts[want]) {
        const next = h.acts[want]!;
        next.reset().fadeIn(0.25).play();
        if (h.cur) h.acts[h.cur]?.fadeOut(0.25);
        h.cur = want;
      }
      if (h.cur && h.cur !== "idle") h.acts[h.cur]!.timeScale = clamp(s / (h.cur === "gallop" ? HORSE.gallop : HORSE.walk), 0.5, 1.3);
      h.mixer.update(dt);
    }
    const p = this.p;
    const pr = this.playerRig;
    if (pr) {
      this.stabT = Math.max(0, this.stabT - dt);
      this.hurtAnimT = Math.max(0, this.hurtAnimT - dt);
      let a: Anim;
      if (this.boat || this.horse) a = "sit";
      else if (this.swim) a = p.moving || this.swim.under ? "swim" : "swimIdle";
      else if (this.roll) a = "roll";
      else if (this.hurtAnimT > 0 && pr.has("hit")) a = "hit";
      else if (this.stabT > 0 && pr.has("stab")) a = this.swing?.heavy ? "heavy" : "stab";
      else if (this.charge !== null) a = "block";
      else if (this.parryT > 0) a = "block";
      else if (this.leap || this.climb || (!p.grounded && pr.has("jump"))) a = "jump";
      else if (this.carrying) a = "carry";
      else if (this.phase !== "title" && this.crouched) a = p.moving ? "crouchWalk" : "crouchIdle";
      else a = p.moving ? (p.running ? "run" : "walk") : "idle";
      pr.play(a, 0.12, a === this.playerKick);
      this.playerKick = null;
      pr.update(dt);
    }
    for (const g of this.guards) {
      const speed = dt > 0 ? Math.hypot(g.x - g.px, g.z - g.pz) / dt : 0;
      g.px = g.x;
      g.pz = g.z;
      if (!g.rig) continue;
      const a: Anim = g.dead
        ? "death"
        : g.stagger > 0 || g.flinch > 0
          ? "hit"
          : g.atk !== null
            ? "stab"
            : g.stun > 0
              ? "idle"
              : speed > 4
                ? "run"
                : speed > 0.3
                  ? "walk"
                  : "idle";
      g.rig.play(a, 0.12, a === g.animKick);
      g.animKick = null;
      g.rig.update(dt);
    }
  }
  dispose() {
    this.disposed = true;
    this.wayangLook?.dispose();
    this.clearKapitan(false);
    this.playerRig?.dispose();
    for (const g of this.guards) g.rig?.dispose();
    cancelAnimationFrame(this.raf);
    this.disposers.forEach((d) => d());
    disposeLevel(this.level);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
  private setPhase(p: Phase, reason: LoseReason = null) {
    this.phase = p;
    this.loseReason = reason;
    if (p !== "playing" && document.pointerLockElement) document.exitPointerLock();
    if (p === "won" || p === "lost") this.chron.end(p === "won", reason);
    if (p !== "playing" && this.fogDirty && this.fog.cols) {
      this.fogDirty = false;
      this.cb.onExplored?.(this.def.id, packFog(this.fog.seen));
    }
    this.cb.onPhase(p, reason);
  }
  private toast(t: string) {
    this.toastText = t;
    this.toastT = 2.2;
  }

  // ------------------------------------------------------------------ loop

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.pollPad(dt);
    // hit-stop slows the world for a beat; input still lands (keys are events)
    const ts = this.phase === "playing" ? this.feel.step(dt) : 1;
    if (this.phase === "playing") this.update((this.wheel ? dt * TOOL.slow : dt) * ts);
    if (this.pendingTravel) {
      const e = this.pendingTravel;
      this.pendingTravel = null;
      this.doTravel(e);
    }
    if (this.phase === "title") this.attractCamera();
    if (this.phase === "intro") this.stepIntro(dt);
    this.render(dt);
  };

  /** Gamepad buttons act as their key codes; sticks move and look. Polled each frame (the Gamepad API has no input events). */
  private pollPad(dt: number) {
    const pad = typeof navigator !== "undefined" && navigator.getGamepads ? pickPad([...navigator.getGamepads()]) : null;
    const s = pad ? readPad(pad) : null;
    const { down, up } = diffButtons(this.padPrev, s?.buttons ?? []);
    this.padPrev = s?.buttons ?? [];
    for (const i of up) if (PAD_KEYS[i]) this.releaseKey(PAD_KEYS[i]);
    this.padMove = { x: 0, y: 0, run: false };
    if (!s) return;
    const pressed = (i: number) => down.includes(i);
    if (this.phase === "intro") {
      if (pressed(PAD_CONFIRM) || pressed(PAD_START)) this.skipIntro();
      return;
    }
    if (this.phase !== "playing") {
      if (down.length && this.cb.onPadAny?.()) return;
      if (pressed(PAD_UP)) this.cb.onPadNav?.(-1);
      if (pressed(PAD_DOWN)) this.cb.onPadNav?.(1);
      if (PAD_TAB_PREV.some(pressed)) this.cb.onPadTab?.(-1);
      if (PAD_TAB_NEXT.some(pressed)) this.cb.onPadTab?.(1);
      if (pressed(PAD_CONFIRM) || pressed(PAD_START)) this.cb.onPadConfirm?.();
      return;
    }
    if (pressed(PAD_START)) {
      this.pause();
      return;
    }
    if (this.pantun.choosing && pressed(PAD_DOWN)) this.pressKey("PadDown");
    for (const i of down) if (PAD_KEYS[i]) this.pressKey(PAD_KEYS[i]);
    this.padMove = { ...s.move, run: PAD_RUN.some((i) => s.buttons[i]) };
    if (s.look.x || s.look.y) this.look(s.look.x * PAD_LOOK_RATE * dt, s.look.y * PAD_LOOK_RATE * dt);
  }

  private attractCamera() {
    const { pos, look } = harbourDrift(this.time);
    this.camera.position.set(pos.x, pos.y, pos.z);
    this.camera.lookAt(look.x, look.y, look.z);
  }

  private get crouched() {
    return !!this.boat || this.lowCeiling || this.keys.has("ControlLeft") || this.keys.has("ControlRight") || this.crouchToggle;
  }

  private update(dt: number) {
    // answering a penjaga pintu: the world holds still until the player picks or steps back
    if (this.pantun.choosing) {
      this.hudTimer -= dt;
      if (this.hudTimer <= 0) {
        this.hudTimer = 0.05;
        this.cb.onHud(this.buildHud());
      }
      return;
    }
    this.run.time += dt;
    this.tideTick();
    this.toastT = Math.max(0, this.toastT - dt);
    this.knifeCd = Math.max(0, this.knifeCd - dt);
    if (this.roll) {
      this.roll.t += dt;
      if (this.roll.t >= ROLL.dur) {
        this.roll = null;
        this.rollCd = ROLL.cd;
      }
    } else this.rollCd = Math.max(0, this.rollCd - dt);
    const L = this.level;
    const p = this.p;
    this.reveal();
    this.checkKitab(dt);
    this.chatter(dt);
    this.pantun.update(dt, this.p, this.guards);
    // ---- alam ghaib: Mata Helang burns semangat; the bunian paths are solid while it is open (or while stood on)
    const gh = this.ghaib.step(dt, this.eagle, p, L.colliders);
    this.eagle = gh.open;
    if (gh.say) this.toast(gh.say);

    // ---- player movement
    let fwd = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    let str = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    let len = Math.hypot(fwd, str);
    // keyboard wins, then the touch joystick, then the gamepad stick
    const tm = this.touchMove.x !== 0 || this.touchMove.y !== 0 ? this.touchMove : this.padMove;
    const touchActive = len === 0 && (tm.x !== 0 || tm.y !== 0);
    if (touchActive) {
      fwd = tm.y;
      str = tm.x;
      len = Math.hypot(fwd, str); // normalised below: direction only, gait is walk or run like the keyboard
    }
    if (len > 0) {
      fwd /= len;
      str /= len;
    }
    const crouched = this.crouched;
    p.running = (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || (touchActive && tm.run)) && !crouched && !this.carrying && !this.swing && this.charge === null && len > 0;

    if (this.boat) {
      const sprint = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || (touchActive && tm.run);
      p.running = false;
      this.paddle(dt, fwd, str, len, sprint);
    } else if (this.horse) {
      const sprint = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || (touchActive && tm.run);
      this.ride(dt, fwd, str, len, sprint);
      // a gallop is as loud as a sprint
      p.running = this.horse.speed > HORSE.walk + 1;
    } else if (this.swim) {
      this.swimMove(dt, fwd, str, len);
    } else if (this.leap) {
      const l = this.leap;
      l.t += dt;
      const k = clamp(l.t / l.dur, 0, 1);
      const e = k * (2 - k);
      const g = l.guard;
      // land just behind the guard, following him if he keeps walking
      const tx = g.x - Math.sin(g.yaw) * 0.5;
      const tz = g.z - Math.cos(g.yaw) * 0.5;
      p.x = l.from.x + (tx - l.from.x) * e;
      p.z = l.from.z + (tz - l.from.z) * e;
      p.y = leapHeight(l.from.y, g.y, k);
      p.yaw = yawTo(p, g);
      if (k >= 1) {
        this.leap = null;
        p.y = g.y;
        p.vy = 0;
        p.grounded = true;
        if (!g.dead) this.killGuard(g, "Air assassination.", KICK.air);
      }
      p.moving = false;
    } else if (this.climb) {
      const c = this.climb;
      c.t += dt;
      const k = clamp(c.t / c.dur, 0, 1);
      const e = k * k * (3 - 2 * k);
      p.x = c.from.x + (c.to.x - c.from.x) * e;
      p.z = c.from.z + (c.to.z - c.from.z) * e;
      // rise first, then pull forward
      const rise = clamp(k * 1.6, 0, 1);
      p.y = c.from.y + (c.to.y - c.from.y) * rise;
      if (k >= 1) {
        this.climb = null;
        p.vy = 0;
        p.grounded = true;
      }
      p.moving = false;
    } else {
      const from = { x: p.x, z: p.z };
      const speed = (this.swing || this.charge !== null ? 1.0 : this.carrying ? 2.2 : crouched ? 1.7 : p.running ? 6.2 : 3.4) * (this.mudUnderfoot ? TIDE.mudSpeed : 1) * this.ghaib.speedMul(this.eagle);
      const fx = Math.sin(this.camYaw);
      const fz = Math.cos(this.camYaw);
      const rx = -Math.cos(this.camYaw);
      const rz = Math.sin(this.camYaw);
      const mx = fx * fwd + rx * str;
      const mz = fz * fwd + rz * str;
      p.moving = len > 0 || !!this.roll;
      if (this.roll) {
        const r = this.roll;
        const sp = ROLL.speed * (1 - (0.5 * r.t) / ROLL.dur);
        p.x += r.dx * sp * dt;
        p.z += r.dz * sp * dt;
        p.yaw = Math.atan2(r.dx, r.dz);
      } else if (p.moving) {
        this.moveDir = { x: mx, z: mz };
        const target = Math.atan2(mx, mz);
        p.yaw += clamp(wrapAngle(target - p.yaw), -12 * dt, 12 * dt);
        p.x += mx * speed * dt;
        p.z += mz * speed * dt;
      }
      pushOut(p, PLAYER_R, L.colliders, p.y);
      // walking (or dropping) into a river or pool starts a swim; carrying a body, the bank stops you as before
      if (this.intoWater(p.x, p.z) && !this.carrying && !this.roll && p.y < SWIM.maxEntryY) {
        this.enterWater();
        this.applyBounds();
      } else this.applyBounds(from);

      // vertical
      p.vy -= 20 * dt;
      p.y += p.vy * dt;
      const g = this.mudGround(p.x, p.z, groundHeight(p.x, p.z, p.y, L.colliders));
      if (p.y <= g) {
        // landing weight: a hop barely dips the view, a drop off a roof settles hard
        if (!p.grounded && p.vy < -4) this.feel.kick({ dip: landDip(-p.vy), trauma: landTrauma(-p.vy) });
        p.y = g;
        p.vy = 0;
        p.grounded = true;
      } else if (p.y > g + 0.05) p.grounded = false;

      // holding Space against a wall climbs it
      if (this.keys.has("Space") && p.moving) this.tryClimb();
    }

    this.lowCeiling = this.phase === "playing" && !this.horse && !this.swim && L.colliders.some((b) => b.minY > p.y + STEP_H && b.minY < p.y + STAND_H && p.x > b.minX - 0.15 && p.x < b.maxX + 0.15 && p.z > b.minZ - 0.15 && p.z < b.maxZ + 0.15);

    // ---- hiding
    this.hidden = !!this.swim?.under || L.hides.some((h) => p.y < 1 && dist2D(p, h) < h.r);
    this.chron.tick(this.run.time, { x: p.x, y: p.y, z: p.z, hidden: this.hidden, swim: !!this.swim, dive: !!this.swim?.under, horse: !!this.horse, boat: !!this.boat, hp: this.hp });
    // wayang: near a blencong the player's shadow is thrown large on the screen, where guards see it
    this.shade = shadowOnScreen(this.def.wayang, p, this.hidden || !!this.swim);
    this.dalang.tick(dt, this.shade);

    // ---- noise
    const stance = { crouched, running: p.running };
    const nr = this.hidden ? 0 : noiseRadius(stance, p.moving && p.grounded) * this.mods.noise * (this.mudUnderfoot ? TIDE.mudNoise : 1);
    if (nr > 0) for (const g of this.guards) if (!g.dead && dist2D(g, p) < nr * (Math.abs(g.y - p.y) > 2 ? 0.5 : 1)) this.hear(g, p);

    // ---- guards
    this.stepKapitan();
    for (const g of this.guards) this.updateGuard(g, dt, stance);

    // ---- fighting
    this.stepCombat(dt);
    if (this.hp <= 0) {
      this.setPhase("lost", "slain");
      return;
    }

    if (this.detected) {
      this.setPhase("lost", "detected");
      return;
    }

    // ---- escape
    if (this.objective === "escape" && dist2D(p, L.exit) < (this.boat ? 3.5 : this.horse ? 3 : 2.4)) {
      this.setPhase("won");
      return;
    }

    // ---- gates to neighbouring maps: stand in one for a beat; the swap runs at the end of the frame
    this.gateCd = Math.max(0, this.gateCd - dt);
    this.gateFade = Math.max(0, this.gateFade - dt / 0.4);
    const gate = this.gateCd > 0 || this.climb || this.leap ? null : exitAt(this.def.id, p.x, p.z);
    if (gate && !this.pendingTravel) {
      this.gateDwell = gate === this.gateNow ? this.gateDwell + dt : dt;
      this.gateNow = gate;
      if (this.gateDwell >= 0.6) this.pendingTravel = gate;
    } else {
      this.gateDwell = 0;
      this.gateNow = null;
    }
    if (this.gateNow || this.gateFade > 0) this.hudTimer = 0;

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.08;
      this.cb.onHud(this.buildHud());
    }
  }

  private enterWater() {
    const p = this.p;
    this.swim = { under: false, breath: SWIM.breath * this.mods.breath, gasp: 0 };
    this.crouchToggle = false;
    this.swing = null;
    this.charge = null;
    p.vy = 0;
    p.grounded = true;
    this.toast("Swimming. Hold Ctrl (or press C) to dive out of sight; swim to a bank to climb out.");
  }

  /** Swim: camera-relative like walking, slower; crouch dives while breath lasts. Reaching dry land climbs out. */
  private swimMove(dt: number, fwd: number, str: number, len: number) {
    const s = this.swim!;
    const p = this.p;
    s.gasp = Math.max(0, s.gasp - dt);
    const wantDive = this.keys.has("ControlLeft") || this.keys.has("ControlRight") || this.crouchToggle;
    // under a jetty, bridge or hull a diver stays down until clear (or out of breath)
    const roofed = s.under && this.level.colliders.some((b) => b.minY > p.y && b.minY < SWIM.surfaceY + HEAD_H && p.x > b.minX - PLAYER_R && p.x < b.maxX + PLAYER_R && p.z > b.minZ - PLAYER_R && p.z < b.maxZ + PLAYER_R);
    s.under = (wantDive || roofed) && s.gasp === 0 && s.breath > 0;
    if (s.under) {
      s.breath = Math.max(0, s.breath - dt);
      if (s.breath === 0) {
        s.under = false;
        s.gasp = SWIM.gasp;
        this.crouchToggle = false;
        this.toast("Out of breath!");
      }
    } else s.breath = Math.min(SWIM.breath * this.mods.breath, s.breath + dt * SWIM.refill);
    // diving is silent; a fast crawl at the surface splashes like running
    p.running = !s.under && p.running;
    const speed = s.under ? SWIM.dive : p.running ? SWIM.fast : SWIM.speed;
    const mx = Math.sin(this.camYaw) * fwd - Math.cos(this.camYaw) * str;
    const mz = Math.cos(this.camYaw) * fwd + Math.sin(this.camYaw) * str;
    p.moving = len > 0;
    if (p.moving) {
      this.moveDir = { x: mx, z: mz };
      p.yaw += clamp(wrapAngle(Math.atan2(mx, mz) - p.yaw), -8 * dt, 8 * dt);
      const q = { x: p.x + mx * speed * dt, z: p.z + mz * speed * dt };
      // jetties, decks and hulls stop a swimmer at the surface (Space climbs aboard); a diver passes under decks
      pushOut(q, PLAYER_R, this.level.colliders, p.y);
      if (!this.tideWet(q.x, q.z)) {
        // ashore (a bank, or up onto a jetty) unless something tall is in the way; surface first when diving
        const g = groundHeight(q.x, q.z, 0, this.level.colliders);
        if (!s.under && g <= STEP_H) {
          Object.assign(p, { x: q.x, z: q.z, y: g, vy: 0, grounded: true });
          this.swim = null;
          this.applyBounds();
          return;
        }
      } else {
        p.x = q.x;
        p.z = q.z;
      }
    }
    this.applyBounds();
    // in the sea a swimmer rides up with the tide (never lower than at mean water)
    const ty = (s.under ? SWIM.diveY : SWIM.surfaceY) + (this.inSea(p.x, p.z) ? Math.max(0, seaSurface(this.level.tide) + 0.3) : 0);
    p.y += clamp(ty - p.y, -SWIM.sink * dt, SWIM.sink * dt);
    p.vy = 0;
    p.grounded = true;
  }

  private applyBounds(from?: { x: number; z: number }) {
    const b = this.level.bounds;
    const p = this.p;
    p.x = clamp(p.x, b.minX, b.maxX);
    // the sea is open past the jetty, out to the anchored ship (swimming, or walking a deck out there)
    p.z = clamp(p.z, b.minZ - SWIM.seaReach, b.maxZ);
    if (!from || !this.intoWater(p.x, p.z)) return;
    // stepping into water without swimming (carrying a body): keep whichever axis stays dry, so the player slides
    // along the bank, the bridge rail or the jetty's edge
    if (!this.intoWater(from.x, p.z)) p.x = from.x;
    else if (!this.intoWater(p.x, from.z)) p.z = from.z;
    else {
      p.x = from.x;
      p.z = from.z;
    }
  }

  /**
   * The guards' map reaches out to sea so the ship's crew can patrol its deck; the open sea itself (past the jetty's
   * end) is water, so no one walks on it.
   */
  private navBounds() {
    const b = this.level.bounds;
    const minZ = b.minZ - SWIM.seaReach;
    return { ...b, minZ, water: [...b.water, { minX: b.minX - 1, maxX: b.maxX + 1, minZ: minZ - 1, maxZ: b.minZ }] };
  }

  /** in the sea: past the shoreline */
  private inSea(_x: number, z: number) {
    return z < this.level.bounds.jettyZ - 0.1;
  }

  /** water under this spot (rivers, pools, the sea), decks and boats or not */
  private waterAt(x: number, z: number) {
    return this.level.bounds.water.some((a) => inArea(a, x, z, 0.1)) || this.inSea(x, z);
  }

  /** a step here lands in the water: water below, and no jetty, deck or hull underfoot */
  private intoWater(x: number, z: number) {
    return this.tideWet(x, z) && groundHeight(x, z, this.p.y, this.level.colliders) < 0.05;
  }

  // ---- pasang surut (tide.ts). Only the player feels the mud and the flood: guards keep to the nav grid and waterAt.
  private tideTick() {
    this.tide = tideAt(this.run.time, tidePhase(this.def.id));
    const st = this.tide.state;
    if (st === this.tideSaid) return;
    const first = this.tideSaid === null;
    this.tideSaid = st;
    if (first || this.toastT > 0 || (st !== "surut" && st !== "pasang")) return;
    this.toast(st === "surut" ? `${TIDE_NAMES.surut.name}: the mud is bare along the shore and the river banks.` : `${TIDE_NAMES.pasang.name}: the river is over its banks.`);
  }
  private tideMap(): TideMap {
    const b = this.level.bounds;
    return { shoreZ: this.def.shoreZ, minX: b.minX, maxX: b.maxX, rivers: b.water.filter((a) => isTidal({ w: a.maxX - a.minX })) };
  }
  private onMud(x: number, z: number) {
    return onMudflat(this.tideMap(), this.tide.k, x, z);
  }
  /** the player's feet are in the mud (not on a deck or a roof above it) */
  private get mudUnderfoot() {
    return this.p.y < 0.1 && !this.swim && this.onMud(this.p.x, this.p.z);
  }
  /** water for the player: the map's water and the tide's flood, less the bared mud */
  private tideWet(x: number, z: number) {
    return (this.waterAt(x, z) || inFlood(this.tideMap(), this.tide.k, x, z)) && !this.onMud(x, z);
  }
  /** on the shore mud the ground slopes down under the sea (off decks and hulls, which stand above it) */
  private mudGround(x: number, z: number, g: number) {
    return g < 0.05 && z < this.def.shoreZ && this.onMud(x, z) ? seaMudY(this.def.shoreZ - z) + 0.02 : g;
  }
  /** climbing out of the water: a little higher at the top of the tide */
  private get swimReach() {
    return SWIM.climbRise + TIDE.reach * floodShare(this.tide.k);
  }

  /** over a river and off every bridge or jetty */
  private wet(x: number, z: number) {
    return isWet(this.level.bounds, x, z, 0.1, 0.1);
  }

  private tryJumpOrClimb() {
    if (this.swim) {
      // from the water: up onto a jetty, deck, prahu or the ship's side
      if (!this.climb && !this.swim.under && this.tryClimb(this.swimReach)) this.swim = null;
      return;
    }
    if (this.climb || this.leap || this.mounted) return;
    if (this.tryClimb()) return;
    if (this.p.grounded) {
      this.p.vy = 7.2;
      this.p.grounded = false;
    }
  }

  /** Vault / climb onto a ledge in front of the player (up to ~3.7 m). */
  private tryClimb(maxRise = 3.7): boolean {
    const t = this.findClimb(maxRise);
    if (!t) return false;
    const p = this.p;
    const h = t.y - p.y;
    this.climb = {
      t: 0,
      dur: 0.35 + h * 0.13,
      from: new THREE.Vector3(p.x, p.y, p.z),
      to: new THREE.Vector3(t.x, t.y, t.z),
    };
    p.vy = 0;
    return true;
  }

  /** The ledge the player faces and could climb (rise above the feet at most maxRise): where they would land. */
  private findClimb(maxRise: number): { x: number; y: number; z: number } | null {
    if (this.climb) return null;
    const p = this.p;
    const dx = Math.sin(p.yaw);
    const dz = Math.cos(p.yaw);
    let best: Box | null = null;
    for (const reach of [0.5, 0.85]) {
      const px = p.x + dx * (PLAYER_R + reach);
      const pz = p.z + dz * (PLAYER_R + reach);
      for (const b of this.level.colliders) {
        if (b.maxY <= p.y + STEP_H || b.maxY > p.y + maxRise) continue;
        // standing under a raised floor: do not climb up through it
        if (b.minY > p.y && p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ) continue;
        if (px < b.minX - 0.05 || px > b.maxX + 0.05 || pz < b.minZ - 0.05 || pz > b.maxZ + 0.05) continue;
        if (!best || b.maxY < best.maxY) best = b;
      }
      if (best) break;
    }
    if (!best) return null;
    const tx = clamp(p.x + dx * (PLAYER_R + 0.95), best.minX + 0.5, best.maxX - 0.5);
    const tz = clamp(p.z + dz * (PLAYER_R + 0.95), best.minZ + 0.5, best.maxZ - 0.5);
    return { x: tx, y: best.maxY, z: tz };
  }

  // ------------------------------------------------------------------ guards

  private hear(g: Guard, src: Vec2 & { y?: number }) {
    if (g.brain.state === "alert") return;
    g.noiseFlag = true;
    g.investigate = { x: src.x, z: src.z };
    g.investigateY = src.y ?? 0;
  }

  private updateGuard(g: Guard, dt: number, stance: { crouched: boolean; running: boolean }) {
    if (g.dead) {
      g.fall = Math.min(1, g.fall + dt * 3);
      if (g.carried) {
        g.x = this.p.x;
        g.z = this.p.z;
        g.y = this.p.y + 0.9;
      }
      return;
    }
    const p = this.p;
    const L = this.level;

    // gravity: guards that walk off a roof drop to the ground
    if (!g.climb) {
      const gh = groundHeight(g.x, g.z, g.y, L.colliders);
      if (g.y > gh + 0.01) {
        g.vy -= 20 * dt;
        g.y = Math.max(gh, g.y + g.vy * dt);
      } else {
        if (g.vy < -3) g.agent.reset(); // dropped off a roof: the old path is on the wrong layer
        g.y = gh;
        g.vy = 0;
      }
    }

    g.atkCd = Math.max(0, g.atkCd - dt);
    if (g.stagger > 0 || g.flinch > 0) {
      g.stagger = Math.max(0, g.stagger - dt);
      g.flinch = Math.max(0, g.flinch - dt);
      return;
    }
    if (g.stun > 0) {
      g.atk = null;
      g.stun -= dt;
      g.meter = Math.max(0, g.meter - dt * 0.3);
      if (g.stun <= 0) {
        g.brain = { state: "suspicious", timer: 0 };
        g.investigate = { x: p.x, z: p.z };
        g.investigateY = p.y;
      }
      return;
    }

    // ---- senses
    const alertNow = g.brain.state === "alert";
    const eye = { x: g.x, y: g.y + 1.7, z: g.z };
    const chest = { x: p.x, y: p.y + (stance.crouched ? 0.6 : 1.1), z: p.z };
    // wayang: a shadow on the screen is seen from further and sooner (VIS itself when there is none)
    const vis = shadowVision(VIS, this.shade);
    const seen = canSee(eye, g.yaw, chest, vis, L.occluders, this.hidden);
    g.seesPlayer = seen;
    if (seen) {
      g.lastKnown = { x: p.x, z: p.z };
      g.lastKnownY = p.y;
      g.meter = alertNow ? 1 : stepMeter(g.meter, true, detectionRate(dist2D(g, p), vis.range, stance) * vis.rate * this.mods.detect * this.pantun.detectMul(g) * this.kapitanLight(), dt);
    } else {
      g.meter = stepMeter(g.meter, false, 0, dt, alertNow || g.brain.state === "search" ? 0.1 : 0.25);
    }

    // ---- bodies: a guard whose cone catches a downed guard investigates, then raises the alarm
    const prev = g.brain.state;
    const found = alertNow ? false : this.noticeBodies(g, eye, dt);

    // ---- brain
    g.brain = stepBrain(g.brain, { meter: g.meter, seesPlayer: seen, heardNoise: g.noiseFlag }, dt);
    const noisePoint = g.noiseFlag ? g.investigate : null;
    g.noiseFlag = false;
    const now = g.brain.state;
    if (now !== "alert") g.atk = null;
    if (now !== prev) {
      // the marker pops when he notices (suspicious or alert) and shrinks away when he gives up
      if (now === "suspicious" || now === "alert" || now === "patrol") g.pop = { t: 0, gain: now !== "patrol" };
      if (now === "alert") this.feel.kick(KICK.spotted);
      if (now === "alert") this.say(g, found ? "body" : "alert");
      else if (now === "suspicious") this.say(g, "suspicious");
      else if (now === "search") this.say(g, "search");
      else if (now === "patrol") this.say(g, "giveup");
      if (now === "alert") {
        this.run.alerts++;
        this.chron.add({ k: "spotted", body: found, target: g.isTarget });
        this.dalang.cue(found ? "body" : "spotted");
        if (this.def.undetected) this.detected = true;
        g.meter = 1;
        if (!g.lastKnown) {
          g.lastKnown = { x: p.x, z: p.z };
          g.lastKnownY = p.y;
        }
        this.toast(found ? "A body was found!" : g.isTarget ? (this.level.text.targetSpotted ?? "Spotted!") : "Spotted!");
        for (const o of this.guards) {
          if (o !== g && !o.dead && o.stun <= 0 && o.brain.state !== "alert" && dist2D(o, g) < 14) {
            o.brain = forceAlert();
            o.meter = 1;
            o.lastKnown = g.lastKnown;
            o.lastKnownY = g.lastKnownY;
          }
        }
      } else if (now === "patrol") {
        g.meter = 0;
        g.investigate = null;
        let bi = 0;
        let bd = Infinity;
        g.waypoints.forEach((w, i) => {
          const d = dist2D(g, w);
          if (d < bd) {
            bd = d;
            bi = i;
          }
        });
        g.wp = bi;
      } else if (now === "suspicious") {
        g.investigate = noisePoint ?? g.lastKnown ?? g.investigate;
        if (!noisePoint && g.lastKnown) g.investigateY = g.lastKnownY;
      }
    }

    // ---- movement per state
    if (g.climb) {
      this.advanceClimb(g, dt);
      return;
    }
    switch (g.brain.state) {
      case "patrol": {
        const w = g.waypoints[g.wp];
        if (g.wait > 0) {
          g.wait -= dt;
          g.yaw += Math.sin(this.time * 1.3 + g.id) * dt * 0.8;
        } else if (this.navMove(g, w, w.y ?? 0, 1.7, dt, 4) < 0.5) {
          g.wp = (g.wp + 1) % g.waypoints.length;
          g.wait = 1.2;
        }
        break;
      }
      case "suspicious": {
        if (seen) this.turnToward(g, yawTo(g, p), 6, dt);
        else {
          const pt = g.investigate ?? g.lastKnown;
          if (pt && dist2D(g, pt) > 2) this.navMove(g, pt, g.investigate ? g.investigateY : g.lastKnownY, 1.3, dt, 5);
          else g.yaw += Math.sin(this.time * 2 + g.id) * dt * 1.5;
        }
        break;
      }
      case "alert": {
        if (this.fight(g, dt)) break;
        const pt = g.lastKnown ?? { x: p.x, z: p.z };
        const ptY = g.lastKnown ? g.lastKnownY : p.y;
        if (dist2D(g, pt) > 1.0 || ptY > g.y + 0.6) this.chase(g, pt, ptY, 4.0, dt, 9);
        else this.turnToward(g, yawTo(g, p), 9, dt);
        break;
      }
      case "search": {
        const pt = g.lastKnown;
        if (pt && (dist2D(g, pt) > 1.2 || g.lastKnownY > g.y + 0.6)) this.chase(g, pt, g.lastKnownY, 2.4, dt, 6);
        else g.yaw += 1.4 * dt;
        break;
      }
    }
  }

  /** Pursue a point (possibly on a roof) along the nav graph, climbing links where the path says so. */
  private chase(g: Guard, pt: Vec2, ptY: number, speed: number, dt: number, turn: number) {
    return this.navMove(g, pt, ptY, speed, dt, turn);
  }

  /**
   * Walk toward a world point using A* over the nav grid. Falls back to straight-line
   * movement if navigation has nothing to offer. Returns the remaining distance.
   */
  private navMove(g: Guard, pt: Vec2, ptY: number, speed: number, dt: number, turn: number): number {
    const cmd = g.agent.update({ x: g.x, y: g.y, z: g.z }, { x: pt.x, y: ptY, z: pt.z }, dt);
    const d = dist2D(g, pt);
    switch (cmd.kind) {
      case "walk":
        this.moveToward(g, cmd.to, speed, dt, turn);
        return d;
      case "climb":
        g.climb = { t: 0, dur: climbDuration(cmd.link.keys), link: cmd.link };
        g.vy = 0;
        if (cmd.link.up) g.yaw = cmd.link.faceYaw;
        return d;
      case "wait":
        return d;
      case "arrived":
        return Math.min(d, 0.4);
      case "fallback":
        return this.moveToward(g, pt, speed, dt, turn);
    }
  }

  private advanceClimb(g: Guard, dt: number) {
    const c = g.climb;
    if (!c) return;
    c.t += dt;
    const q = sampleClimb(c.link.keys, c.t);
    g.x = q.x;
    g.y = q.y;
    g.z = q.z;
    if (c.t >= c.dur) {
      g.climb = null;
      g.agent.finishClimb();
    }
  }

  /** Look for undiscovered bodies in the cone. Returns true on the frame the guard discovers one. */
  private noticeBodies(g: Guard, eye: { x: number; y: number; z: number }, dt: number): boolean {
    let seen: Guard | null = null;
    let sd = Infinity;
    for (const b of this.guards) {
      if (!b.dead || b.carried || b.discovered) continue;
      const hidden = isBodyHidden(b, this.level.hides);
      if (!canSeeBody(eye, g.yaw, b, VIS, this.level.occluders, hidden, b.y)) continue;
      const d = dist2D(g, b);
      if (d < sd) {
        sd = d;
        seen = b;
      }
    }
    if (seen) g.bodyTarget = seen;
    g.bodyMeter = stepBodyMeter(g.bodyMeter, !!seen, seen ? sd : BODY.range, dt);
    const t = g.bodyTarget;
    if (!t || t.discovered || !t.dead) return false;
    const r = bodyReaction(g.bodyMeter);
    if (r === "discovered") {
      t.discovered = true;
      g.bodyMeter = 0;
      g.bodyTarget = null;
      g.brain = forceAlert();
      g.lastKnown = { x: t.x, z: t.z };
      g.lastKnownY = t.y;
      return true;
    }
    if (r === "suspicious") {
      g.noiseFlag = true;
      g.investigate = { x: t.x, z: t.z };
      g.investigateY = t.y;
    }
    return false;
  }

  private turnToward(g: Guard, target: number, rate: number, dt: number) {
    g.yaw += clamp(wrapAngle(target - g.yaw), -rate * dt, rate * dt);
  }

  /** Turn then walk toward `pt`; returns the remaining distance. */
  private moveToward(g: Guard, pt: Vec2, speed: number, dt: number, turnRate: number) {
    const want = yawTo(g, pt);
    this.turnToward(g, want, turnRate, dt);
    const d = dist2D(g, pt);
    if (Math.abs(wrapAngle(want - g.yaw)) < 0.9) {
      const step = Math.min(speed * dt, d);
      const ox = g.x;
      const oz = g.z;
      g.x += Math.sin(g.yaw) * step;
      g.z += Math.cos(g.yaw) * step;
      pushOut(g, 0.45, this.level.colliders, g.y);
      // guards never wade or swim: a step off a deck, a jetty or a bank into the water is refused
      if (this.waterAt(g.x, g.z) && groundHeight(g.x, g.z, g.y, this.level.colliders) < 0.05) {
        g.x = ox;
        g.z = oz;
      }
    }
    return d;
  }

  // ------------------------------------------------------------------ actions

  /** Who E would kill: a guard within reach from behind, or failing that one below the player to leap onto. */
  private takedownTarget(): { guard: Guard | null; near: boolean; air: boolean } {
    const p = this.p;
    let best: Guard | null = null;
    let near = false;
    for (const g of this.guards) {
      if (g.dead) continue;
      const d = dist2D(g, p);
      if (d > 2.0 || Math.abs(p.y - g.y) > 1.8) continue;
      near = true;
      const ok = g.stun > 0 || g.stagger > 0 || (g.brain.state !== "alert" && isBehind(g, g.yaw, p));
      if (ok && (!best || d < dist2D(best, p))) best = g;
    }
    if (best || !p.grounded || this.carrying) return { guard: best, near, air: false };
    // nobody looks up: from above, facing does not matter, only that he has not spotted the player
    for (const g of this.guards) {
      if (g.dead || g.climb || (g.brain.state === "alert" && g.stun <= 0)) continue;
      if (!canAirAssassinate(p, g, this.level.colliders, this.mods.airDrop)) continue;
      if (!best || dist2D(g, p) < dist2D(best, p)) best = g;
    }
    return { guard: best, near, air: !!best };
  }

  private tryTakedown() {
    if (this.boat) {
      this.goAshore();
      return;
    }
    if (this.horse) {
      this.dismount();
      return;
    }
    if (this.swim) {
      // from the water the only thing to do is climb into a sampan
      const b = this.nearBoat();
      if (b) this.board(b);
      return;
    }
    if (this.climb || this.leap || this.carrying) return;
    if (this.nearCharm() && this.charm) {
      this.charmFound = true;
      this.charmPopT = 0; // the mesh pops and then hides itself (render)
      this.feel.kick(KICK.charm);
      this.toast(`Found the ${this.charm.name}. Your tangkal are under Kelengkapan in the pause menu.`);
      this.cb.onAmulet?.(this.charm.id);
      this.chron.add({ k: "charm", name: this.charm.name });
      return;
    }
    if (this.nearLoot()) {
      this.taken = true;
      if (this.loot) this.loot.visible = false;
      this.completeObjective();
      return;
    }
    const { guard, air } = this.inSanctuary() ? { guard: null, air: false } : this.takedownTarget();
    if (!guard) {
      if (this.pantun.tryOpen(this.p)) {
        this.hudTimer = 0;
        return;
      }
      const b = this.nearBoat();
      const h = b ? null : this.nearHorse();
      if (b) this.board(b);
      else if (h) this.mountHorse(h);
      else this.startCharge();
      return;
    }
    if (air) {
      const p = this.p;
      this.leap = { t: 0, dur: leapDuration(p.y - guard.y), from: new THREE.Vector3(p.x, p.y, p.z), guard };
      p.vy = 0;
      return;
    }
    this.killGuard(guard, guard.stagger > 0 ? "Counter kill." : "Silent kill.");
  }

  // ------------------------------------------------------------------ boats

  /** Take the level's sampans, and work out which decks they cannot pass under. */
  private takeBoats() {
    this.boats = this.level.boats.map((b) => ({ ...b, speed: 0, home: { x: b.x, z: b.z, yaw: b.yaw } }));
    this.boat = null;
    for (const b of this.boats) this.dressBoat(b);
    const { water, decks } = this.level.bounds;
    const spans = (d: (typeof decks)[number]) =>
      water.some((w) => (d.minZ <= w.minZ && d.maxZ >= w.maxZ) || (d.minX <= w.minX && d.maxX >= w.maxX));
    this.boatBlockers = decks.filter((d) => !spans(d));
  }

  /** Bow, middle and stern all on open water, clear of the banks, jetties and the map edge. */
  private boatFits(x: number, z: number, yaw: number) {
    const b = this.level.bounds;
    for (const t of [-2, 0, 2]) {
      const px = x + Math.sin(yaw) * t;
      const pz = z + Math.cos(yaw) * t;
      if (px < b.minX + 0.8 || px > b.maxX - 0.8) return false;
      if (!b.water.some((w) => inArea(w, px, pz, -0.7))) return false;
      if (this.boatBlockers.some((d) => inArea(d, px, pz, 0.8))) return false;
    }
    return true;
  }

  /** The stick or WASD points where to go (camera-relative, like walking); the sampan turns toward it and paddles on. */
  private paddle(dt: number, fwd: number, str: number, len: number, sprint: boolean) {
    const b = this.boat!;
    const p = this.p;
    if (len > 0) {
      const mx = Math.sin(this.camYaw) * fwd - Math.cos(this.camYaw) * str;
      const mz = Math.cos(this.camYaw) * fwd + Math.sin(this.camYaw) * str;
      const diff = wrapAngle(Math.atan2(mx, mz) - b.yaw);
      b.yaw += clamp(diff, -BOAT.turn * dt, BOAT.turn * dt);
      // slow while turning hard, so a sharp turn pivots instead of sweeping wide
      const want = (sprint ? BOAT.fast : BOAT.speed) * Math.max(0.15, Math.cos(diff));
      b.speed += clamp(want - b.speed, -BOAT.accel * dt, BOAT.accel * dt);
    } else b.speed += clamp(-b.speed, -BOAT.drag * dt, BOAT.drag * dt);
    const nx = b.x + Math.sin(b.yaw) * b.speed * dt;
    const nz = b.z + Math.cos(b.yaw) * b.speed * dt;
    if (this.boatFits(nx, nz, b.yaw)) {
      b.x = nx;
      b.z = nz;
    } else if (this.boatFits(nx, b.z, b.yaw)) b.x = nx;
    else if (this.boatFits(b.x, nz, b.yaw)) b.z = nz;
    else b.speed *= 0.3;
    Object.assign(p, { x: b.x, y: BOAT.seatY, z: b.z, vy: 0, grounded: true, yaw: b.yaw, moving: Math.abs(b.speed) > 0.3 });
  }

  private nearBoat(): Boat | null {
    const p = this.p;
    if (this.carrying || !p.grounded || p.y > 1.2) return null;
    let best: Boat | null = null;
    for (const b of this.boats) if (dist2D(b, p) < BOAT.board && (!best || dist2D(b, p) < dist2D(best, p))) best = b;
    return best;
  }

  private board(b: Boat) {
    this.swim = null;
    this.boat = b;
    b.speed = 0;
    this.crouchToggle = false;
    this.swing = null;
    this.charge = null;
    this.toast("In the sampan. Paddle to a bank or jetty and press E to go ashore.");
  }

  /** A dry spot beside the boat to step out onto (bank or deck), or null when the boat is out in the stream. */
  private shoreSpot(): { x: number; y: number; z: number } | null {
    return this.boat ? this.stepOffSpot(this.boat, 0) : null;
  }

  /** A clear dry spot beside something the player sits on (a sampan, a horse), near ground level `groundY`. */
  private stepOffSpot(b: { x: number; z: number; yaw: number }, groundY: number): { x: number; y: number; z: number } | null {
    const C = this.level.colliders;
    const B = this.level.bounds;
    const fx = Math.sin(b.yaw);
    const fz = Math.cos(b.yaw);
    const cands: [number, number][] = [];
    for (const d of [1.4, 2.0, 2.6]) for (const t of [0, -1, 1]) for (const s of [-1, 1]) cands.push([s * d, t]);
    for (const t of [3, -3]) cands.push([0, t]);
    for (const [side, along] of cands) {
      const x = b.x + fz * side + fx * along;
      const z = b.z - fx * side + fz * along;
      if (x < B.minX || x > B.maxX || z < B.minZ || z > B.maxZ || this.wet(x, z)) continue;
      const y = groundHeight(x, z, groundY + 1.0, C);
      if (y > groundY + 0.45) continue;
      const q = { x, z };
      pushOut(q, PLAYER_R, C, y);
      if (Math.hypot(q.x - x, q.z - z) > 0.01) continue;
      return { x, y, z };
    }
    return null;
  }

  private goAshore() {
    const s = this.shoreSpot();
    if (!s) {
      this.toast("Paddle closer to a bank or jetty.");
      return;
    }
    const b = this.boat!;
    b.speed = 0;
    this.boat = null;
    Object.assign(this.p, { ...s, vy: 0, grounded: true, moving: false });
  }

  // ------------------------------------------------------------------ horses

  /** on a boat or a horse, or swimming: no jumping, rolling, striking or carrying */
  private get mounted() {
    return !!this.boat || !!this.horse || !!this.swim;
  }

  /** Put the level's horses out, each with a model (or a block horse while none is loaded). */
  /** Replace the built-in jungle trees and ferns with the loaded models, if any. */
  private dressFoliage() {
    this.dressRocks();
    const m = this.plantModels;
    const fo = this.level.foliage;
    if (!m) return;
    if (m.trees.length && fo.trees.length) {
      fo.treeGroup.clear();
      m.trees.forEach((model, k) => fo.treeGroup.add(instanceModel(model, fo.trees.filter((_, i) => i % m.trees.length === k), true)));
    }
    if (m.fern && fo.ferns.length) {
      fo.fernGroup.clear();
      fo.fernGroup.add(instanceModel(m.fern, fo.ferns, false));
    }
  }

  private dressRocks() {
    const ms = this.rockModels;
    const fo = this.level.foliage;
    if (!ms.length || !fo.rocks.length) return;
    fo.rockGroup.clear();
    ms.forEach((model, k) => fo.rockGroup.add(instanceModel(model, fo.rocks.filter((r) => r.kind % ms.length === k), true)));
  }

  private takeHorses() {
    this.horse = null;
    this.horses = (this.def.horses ?? []).map((d) => {
      const group = new THREE.Group();
      this.level.root.add(group);
      const h: Horse = { group, x: d.x, y: 0, z: d.z, yaw: d.rotY, speed: 0, home: { x: d.x, z: d.z, yaw: d.rotY }, mixer: null, acts: {}, cur: null };
      this.dressHorse(h);
      return h;
    });
  }

  private dressHorse(h: Horse) {
    h.group.clear();
    h.mixer = null;
    h.acts = {};
    h.cur = null;
    const m = this.horseModel;
    if (!m) {
      h.group.add(blockHorse());
      return;
    }
    // the model's head is already at +z, the way the horse moves (rest pose: head z +2.5, tail z -2.0)
    const o = cloneSkinned(m.object);
    h.group.add(o);
    h.mixer = new THREE.AnimationMixer(o);
    // the pack names clips both "Gallop" and "AnimalArmature|Gallop"; take the plain one, else the prefixed one
    const clip = (n: string) => m.clips.find((c) => c.name === n) ?? m.clips.find((c) => c.name.endsWith("|" + n));
    for (const [slot, n] of [["idle", "Idle"], ["walk", "Walk"], ["gallop", "Gallop"]] as const) {
      const c = clip(n);
      if (c) h.acts[slot] = h.mixer.clipAction(c);
    }
    h.acts.idle?.play();
    h.cur = h.acts.idle ? "idle" : null;
  }

  private dressBoat(b: Boat) {
    if (!this.boatModel) return;
    b.group.clear();
    const c = this.boatModel.clone();
    c.position.y = BOAT.modelY;
    b.group.add(c);
  }

  /** Like walking, the stick or WASD points where to go; the horse turns toward it, walks, or gallops with Shift. */
  private ride(dt: number, fwd: number, str: number, len: number, sprint: boolean) {
    const h = this.horse!;
    const p = this.p;
    const C = this.level.colliders;
    const B = this.level.bounds;
    if (len > 0) {
      const mx = Math.sin(this.camYaw) * fwd - Math.cos(this.camYaw) * str;
      const mz = Math.cos(this.camYaw) * fwd + Math.sin(this.camYaw) * str;
      const diff = wrapAngle(Math.atan2(mx, mz) - h.yaw);
      h.yaw += clamp(diff, -HORSE.turn * dt, HORSE.turn * dt);
      const want = (sprint ? HORSE.gallop : HORSE.walk) * Math.max(0.2, Math.cos(diff));
      h.speed += clamp(want - h.speed, -HORSE.drag * dt, HORSE.accel * dt);
    } else h.speed += clamp(-h.speed, -HORSE.drag * dt, HORSE.drag * dt);
    const step = h.speed * dt;
    const q = { x: h.x + Math.sin(h.yaw) * step, z: h.z + Math.cos(h.yaw) * step };
    pushOut(q, HORSE.r, C, h.y);
    q.x = clamp(q.x, B.minX, B.maxX);
    q.z = clamp(q.z, B.minZ, B.maxZ);
    if (q.z < B.jettyZ) q.x = clamp(q.x, -B.jettyHalf, B.jettyHalf);
    if (this.wet(q.x, q.z)) {
      // no swimming: slide along the bank
      if (!this.wet(h.x, q.z)) q.x = h.x;
      else if (!this.wet(q.x, h.z)) q.z = h.z;
      else {
        q.x = h.x;
        q.z = h.z;
      }
    }
    // pulling up against a wall
    if (step > 0.01 && Math.hypot(q.x - h.x, q.z - h.z) < step * 0.3) h.speed *= 0.8;
    h.x = q.x;
    h.z = q.z;
    h.y = groundHeight(h.x, h.z, h.y, C);
    Object.assign(p, { x: h.x, y: h.y + HORSE.saddleY, z: h.z, vy: 0, grounded: true, yaw: h.yaw, moving: Math.abs(h.speed) > 0.3 });
  }

  private nearHorse(): Horse | null {
    const p = this.p;
    if (this.carrying || this.mounted || !p.grounded) return null;
    let best: Horse | null = null;
    for (const h of this.horses) if (Math.abs(h.y - p.y) < 0.8 && dist2D(h, p) < HORSE.mount && (!best || dist2D(h, p) < dist2D(best, p))) best = h;
    return best;
  }

  private mountHorse(h: Horse) {
    this.horse = h;
    h.speed = 0;
    this.crouchToggle = false;
    this.swing = null;
    this.charge = null;
    this.toast("On horseback. Shift gallops, but guards hear it. E to dismount.");
  }

  private horseSpot() {
    return this.horse ? this.stepOffSpot(this.horse, this.horse.y) : null;
  }

  private dismount() {
    const s = this.horseSpot();
    if (!s) {
      this.toast("No room to get down here.");
      return;
    }
    this.horse!.speed = 0;
    this.horse = null;
    Object.assign(this.p, { ...s, vy: 0, grounded: true, moving: false });
  }

  // ------------------------------------------------------------------ fighting

  private hostileNear(r: number): Guard | null {
    const p = this.p;
    let best: Guard | null = null;
    for (const g of this.guards) {
      if (g.dead || g.stun > 0 || g.brain.state !== "alert" || Math.abs(p.y - g.y) > 1.3) continue;
      const d = dist2D(g, p);
      if (d < r && (!best || d < dist2D(best, p))) best = g;
    }
    return best;
  }

  /** X: roll in the move direction (or forward). The first part of it cannot be hit. */
  private tryRoll() {
    const p = this.p;
    if (this.roll || this.rollCd > 0 || this.climb || this.leap || this.carrying || this.mounted || !p.grounded) return;
    const d = p.moving ? this.moveDir : { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
    const n = Math.hypot(d.x, d.z) || 1;
    this.roll = { t: 0, dx: d.x / n, dz: d.z / n };
    this.swing = null;
    this.charge = null;
    this.parryT = 0;
    this.crouchToggle = false;
    this.playerKick = "roll";
  }

  /** R / right click: a short parry window. A strike that lands inside it staggers the guard. */
  private tryParry() {
    if (this.parryCd > 0 || this.roll || this.climb || this.leap || this.carrying || this.swim) return;
    this.parryT = PARRY.win * this.mods.parryWin;
    this.parryCd = this.parryT + PARRY.cd;
    this.swing = null;
    this.charge = null;
    this.playerKick = "block";
    const g = this.hostileNear(4);
    if (g) this.p.yaw = yawTo(this.p, g);
  }

  /** E / left click with no takedown on offer, an alert guard close: start readying a strike. Letting go swings it. */
  private startCharge() {
    if (this.charge !== null || this.swing || this.roll || this.climb || this.leap || this.carrying || this.mounted || !this.p.grounded) return;
    if (this.inSanctuary()) return;
    if (!this.hostileNear(SWING.reach + 0.6)) return;
    this.charge = 0;
  }

  /** While readying: count the hold, and on release swing light (a tap) or heavy (held long enough). */
  private stepCharge(dt: number) {
    if (this.charge === null) return;
    if (this.keys.has("KeyE") || this.keys.has("Mouse0")) {
      this.charge += dt;
      const g = this.hostileNear(SWING.reach + 0.6);
      if (g) this.p.yaw = yawTo(this.p, g);
      return;
    }
    const heavy = this.charge >= HEAVY.hold;
    this.charge = null;
    this.trySwing(heavy);
  }

  /** An open keris strike at an alert guard in front: light, or heavy after a held press. */
  private trySwing(heavy: boolean) {
    const p = this.p;
    if (this.swing || this.roll || this.climb || this.leap || this.carrying || !p.grounded || this.inSanctuary()) return;
    const g = this.hostileNear(SWING.reach + 0.6);
    if (!g) return;
    p.yaw = yawTo(p, g);
    this.swing = { t: 0, hit: false, heavy };
    this.stabT = heavy ? HEAVY.dur : SWING.dur;
    this.playerKick = heavy ? "heavy" : "stab";
  }

  private stepCombat(dt: number) {
    const p = this.p;
    this.parryT = Math.max(0, this.parryT - dt);
    this.parryCd = Math.max(0, this.parryCd - dt);
    this.hurtT += dt;
    if (this.hurtT > this.mods.regenDelay) this.hp = Math.min(this.maxHp, this.hp + dt / REGEN_STEP);
    this.stepCharge(dt);
    const s = this.swing;
    if (!s) return;
    s.t += dt;
    if (!s.hit && s.t >= (s.heavy ? HEAVY.hitAt : SWING.hitAt)) {
      s.hit = true;
      let g: Guard | null = null;
      for (const o of this.guards) {
        if (o.dead || Math.abs(p.y - o.y) > 1.3) continue;
        const d = dist2D(o, p);
        if (d > SWING.reach || Math.abs(wrapAngle(yawTo(p, o) - p.yaw)) > 1.0) continue;
        if (!g || d < dist2D(g, p)) g = o;
      }
      if (g) this.strikeGuard(g, s.heavy);
    }
    if (s.t >= (s.heavy ? HEAVY.dur : SWING.dur)) this.swing = null;
  }

  private strikeGuard(g: Guard, heavy = false) {
    if (g.stagger > 0 || g.stun > 0) {
      this.killGuard(g, "Counter kill.");
      return;
    }
    g.hp -= heavy ? HEAVY.damage : 1;
    this.feel.kick(heavy ? KICK.heavy : KICK.strike);
    if (g.hp <= 0) {
      this.killGuard(g, "Cut down.");
      return;
    }
    // a guard struck while unaware turns and fights
    if (g.brain.state !== "alert") {
      g.brain = forceAlert();
      g.meter = 1;
      this.run.alerts++;
      if (this.def.undetected) this.detected = true;
    }
    g.lastKnown = { x: this.p.x, z: this.p.z };
    g.lastKnownY = this.p.y;
    if (heavy) {
      // a heavy blow breaks his guard whatever his poise
      g.stagger = HEAVY.stagger;
      g.atk = null;
      g.atkCd = Math.max(g.atkCd, HEAVY.stagger + 0.4);
      g.animKick = "hit";
      this.toast("Guard broken! Strike now.");
    } else if (this.time - g.lastFlinch > POISE) {
      g.flinch = FLINCH;
      g.lastFlinch = this.time;
      g.atk = null;
      g.animKick = "hit";
    }
    for (const o of this.guards) if (!o.dead && o !== g && dist2D(o, g) < 9) this.hear(o, g);
  }

  /** An alert guard within reach fights instead of chasing. Returns false when he is out of reach. */
  private fight(g: Guard, dt: number): boolean {
    const p = this.p;
    if (g.atk !== null) {
      // he tracks the player early in the swing and commits late, so a sideways roll gets clear
      this.turnToward(g, yawTo(g, p), g.atk < GUARD_ATK.windup * 0.6 ? 8 : 1.5, dt);
      const before = g.atk;
      g.atk += dt;
      if (before < GUARD_ATK.windup && g.atk >= GUARD_ATK.windup) this.guardStrikes(g);
      if (g.atk !== null && g.atk >= GUARD_ATK.windup + GUARD_ATK.recover) {
        g.atk = null;
        g.atkCd = GUARD_ATK.cdMin + Math.random() * GUARD_ATK.cdRand;
      }
      return true;
    }
    if (dist2D(g, p) > GUARD_ATK.reach || Math.abs(p.y - g.y) > 1.2 || this.climb || this.leap) return false;
    this.turnToward(g, yawTo(g, p), 9, dt);
    const swinging = this.guards.filter((o) => o.atk !== null).length;
    if (g.atkCd <= 0 && swinging < GUARD_ATK.maxAtOnce && this.time - this.lastGuardSwing > 0.45) {
      g.atk = 0;
      g.animKick = "stab";
      this.lastGuardSwing = this.time;
    }
    return true;
  }

  private guardStrikes(g: Guard) {
    const p = this.p;
    const facing = Math.abs(wrapAngle(yawTo(g, p) - g.yaw)) < 0.9;
    if (dist2D(g, p) > GUARD_ATK.reach + 0.5 || Math.abs(p.y - g.y) > 1.3 || !facing) return;
    if (this.roll && this.roll.t < ROLL.iframes) {
      this.toast("Dodged.");
      return;
    }
    if (this.parryT > 0) {
      g.atk = null;
      g.stagger = STAGGER;
      g.atkCd = STAGGER + 0.6;
      g.animKick = "hit";
      this.parryT = 0;
      this.parryCd = 0;
      this.feel.kick(KICK.parry);
      this.toast("Parried! Strike now.");
      this.chron.add({ k: "parry" });
      return;
    }
    this.hp = Math.max(0, this.hp - 1);
    this.feel.kick(KICK.hurt);
    this.hurtT = 0;
    this.hurtAnimT = 0.4;
    this.playerKick = "hit";
    this.swing = null;
    this.charge = null;
    // knocked back a step
    const d = dist2D(g, p) || 1;
    const kx = p.x + ((p.x - g.x) / d) * 0.5;
    const kz = p.z + ((p.z - g.z) / d) * 0.5;
    if (!this.wet(kx, kz)) {
      p.x = kx;
      p.z = kz;
      pushOut(p, PLAYER_R, this.level.colliders, p.y);
    }
    if (this.hp > 0) this.toast(this.hp < 1.5 ? "Badly hurt. Break away!" : "Cut!");
  }

  private killGuard(guard: Guard, msg: string, kick: Kick = KICK.takedown) {
    this.stabT = 0.7;
    this.feel.kick(kick);
    guard.dead = true;
    guard.meter = 0;
    guard.climb = null;
    guard.agent.reset();
    this.ghaib.onKill(guard.id, guard.isTarget && this.def.objective.kind === "kill");
    // a takedown made from inside a haystack or bush drags the body into the cover
    const cover = this.level.hides.find((h) => this.hidden && dist2D(this.p, h) < h.r);
    if (cover) {
      guard.x = cover.x + (guard.x - cover.x) * 0.2;
      guard.z = cover.z + (guard.z - cover.z) * 0.2;
    }
    this.p.yaw = yawTo(this.p, guard);
    this.chron.kill(msg, guard.isTarget, !!cover);
    for (const o of this.guards) if (!o.dead && o !== guard && dist2D(o, guard) < 5) this.hear(o, guard);
    if (guard.isTarget && this.def.objective.kind === "kill") this.completeObjective();
    else this.toast(cover ? `${msg} Body hidden in cover.` : msg);
    if (!guard.isTarget) this.dalang.cue("kill");
  }

  /** F: pick up the nearest body, or drop the one being carried (hidden if dropped inside cover). */
  private tryCarry() {
    if (this.climb || this.leap || this.mounted) return;
    const p = this.p;
    if (this.carrying) {
      const b = this.carrying;
      this.carrying = null;
      b.carried = false;
      b.x = p.x + Math.sin(p.yaw) * 0.6;
      b.z = p.z + Math.cos(p.yaw) * 0.6;
      b.y = p.y;
      if (isBodyHidden(b, this.level.hides)) this.chron.add({ k: "hideBody" });
      this.feel.kick(KICK.drop);
      this.toast(isBodyHidden(b, this.level.hides) ? "Body hidden." : "Body dropped. Hide it in a haystack or bush.");
      return;
    }
    const b = this.nearestBody();
    if (!b) return;
    this.carrying = b;
    b.carried = true;
    this.feel.kick(KICK.carry); // the weight of the body settles on the shoulders
    this.toast("Carrying body. F to drop.");
  }

  private nearestBody(): Guard | null {
    let best: Guard | null = null;
    for (const g of this.guards) {
      if (!g.dead || g.carried) continue;
      const d = dist2D(g, this.p);
      if (d < 2.0 && Math.abs(this.p.y - g.y) < 1.8 && (!best || d < dist2D(best, this.p))) best = g;
    }
    return best;
  }

  private tryThrow() {
    if (this.knives <= 0 || this.knifeCd > 0 || this.climb || this.leap || this.swim) return;
    this.knives--;
    this.knifeCd = 0.8;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const o = this.camera.position;
    let tMax = 40;
    const wall = raycastBoxes({ x: o.x, y: o.y, z: o.z }, dir, this.level.colliders, tMax);
    if (wall !== null) tMax = wall;
    let hitGuard: Guard | null = null;
    let tg = tMax;
    for (const g of this.guards) {
      if (g.dead) continue;
      const c = new THREE.Vector3(g.x, g.group.position.y + 1.1, g.z).sub(o);
      const t = c.dot(dir);
      if (t < 0 || t > tg) continue;
      const perp = c.addScaledVector(dir, -t).length();
      if (perp < 0.8) {
        hitGuard = g;
        tg = t;
      }
    }
    const t = hitGuard ? tg : tMax;
    const hit = o.clone().addScaledVector(dir, t);
    const chest = new THREE.Vector3(this.p.x, this.p.y + 1.3, this.p.z);
    this.knifeFly = { t: 0, from: chest, to: hit };
    this.chron.add({ k: "tool", tool: "knife", hit: hitGuard ? 1 : 0 });
    if (hitGuard) {
      hitGuard.stun = this.mods.knifeStun;
      this.ghaib.onStun(hitGuard.id);
      this.say(hitGuard, "stunned");
      hitGuard.atk = null;
      hitGuard.meter = 0;
      this.feel.kick(KICK.knifeStun);
      this.toast("Guard stunned.");
    } else {
      // clatter: guards near the landing point go and look
      for (const g of this.guards) if (!g.dead && dist2D(g, hit) < 11) this.hear(g, { x: hit.x, z: hit.z });
      this.toast("Distraction thrown.");
    }
  }

  // ------------------------------------------------------------------ HUD

  private buildHud(): HudState {
    const p = this.p;
    let meter = 0;
    let rank = 0;
    let alert: GuardState | "calm" = "calm";
    const order: Record<GuardState, number> = { patrol: 0, suspicious: 1, search: 2, alert: 3 };
    for (const g of this.guards) {
      if (g.dead) continue;
      meter = Math.max(meter, g.meter);
      if (g.brain.state !== "patrol" && order[g.brain.state] >= rank) {
        rank = order[g.brain.state];
        alert = g.brain.state;
      }
    }
    const sanc = this.inSanctuary();
    const tg = sanc ? { guard: null, near: false, air: false } : this.takedownTarget();
    let prompt = "";
    const incoming = this.guards.some((g) => g.atk !== null && g.atk < GUARD_ATK.windup && !g.dead && dist2D(g, p) < GUARD_ATK.reach + 0.5);
    const foe = sanc ? null : this.hostileNear(SWING.reach + 0.6);
    if (this.climb || this.leap) prompt = "";
    else if (this.gateNow) prompt = `Masuk: ${this.gateNow.label}`;
    else if (this.swim)
      prompt = this.nearBoat()
        ? "E  Climb into the sampan"
        : !this.swim.under && this.findClimb(this.swimReach)
          ? "Space  Climb up"
          : this.swim.under ? "Diving: unseen" : this.swim.gasp > 0 ? "Catching your breath" : "Ctrl / C  Dive";
    else if (incoming && !this.roll) prompt = "R  Parry  ·  X  Roll";
    else if (this.boat) prompt = this.shoreSpot() ? "E  Go ashore" : "";
    else if (this.horse) prompt = this.horseSpot() ? "E  Dismount" : "";
    else if (this.charge !== null) prompt = this.charge >= HEAVY.hold ? "Let go: heavy strike" : "Hold for a heavy strike";
    else if (this.nearCharm() && !this.carrying && this.charm) prompt = `E  Take the ${this.charm.name}`;
    else if (this.nearLoot() && !this.carrying) prompt = `E  ${this.level.text.take ?? "Take it"}`;
    else if (tg.guard && tg.air) prompt = tg.guard.isTarget && this.level.text.leap ? `E  ${this.level.text.leap}` : "E  Air assassination";
    else if (tg.guard) prompt = tg.guard.isTarget && this.level.text.strike ? `E  ${this.level.text.strike}` : tg.guard.stagger > 0 ? "E  Finish him" : tg.guard.stun > 0 ? "E  Finish stunned guard" : "E  Keris takedown";
    else if (foe && !this.carrying) prompt = "E  Strike (hold: heavy)  ·  R  Parry  ·  X  Roll";
    else if (this.carrying) prompt = "F  Drop body (inside a haystack or bush to hide it)";
    else if (tg.near) prompt = "Get behind him";
    else if (this.pantun.prompt(p)) prompt = this.pantun.prompt(p);
    else if (this.nearBoat()) prompt = "E  Board the sampan";
    else if (this.nearHorse()) prompt = "E  Mount the horse";
    else if (this.nearestBody()) prompt = "F  Carry body";
    else if (this.hidden) prompt = "Hidden";

    const o = this.def.objective;
    const tgt: Vec2 | null | undefined =
      this.objective !== "main" ? null : o.kind === "steal" ? o.at : this.guards.find((g) => g.isTarget && !g.dead);
    const obj: Vec2 = tgt ?? this.level.exit;
    const rel = wrapAngle(yawTo(p, obj) - this.camYaw);
    return {
      meter,
      breath: this.swim ? this.swim.breath / (SWIM.breath * this.mods.breath) : null,
      alert,
      objective: this.objective === "main" ? this.level.text.objective : this.level.text.escape,
      northDeg: (this.camYaw * 180) / Math.PI,
      objDeg: (-rel * 180) / Math.PI,
      eagle: this.eagle,
      semangat: this.ghaib.semangat,
      crouched: this.crouched,
      hidden: this.hidden,
      knives: this.knives,
      tool: this.tool,
      ammo: { knife: this.knives, stone: this.stones, pepper: this.pepper },
      wheel: this.wheel?.sel ?? null,
      prompt,
      carrying: !!this.carrying,
      toast: this.toastT > 0 ? this.toastText : "",
      talk: this.talk.t > 0 ? this.talk.text : "",
      hp: this.hp,
      maxHp: this.maxHp,
      combat: this.hp < this.maxHp || !!this.hostileNear(8),
      incoming,
      narration: this.dalang.line,
      shadow: this.shade,
      pantun: this.pantun.hud(),
      tide: this.tide,
      fade: this.gateNow ? Math.max(0, (this.gateDwell - 0.3) / 0.3) : this.gateFade,
    };
  }

  // ------------------------------------------------------------------ render

  private syncMeshes() {
    const p = this.p;
    this.player.group.position.set(p.x, p.y, p.z);
    this.player.group.rotation.y = p.yaw;
    for (const h of this.horses) {
      h.group.position.set(h.x, h.y, h.z);
      h.group.rotation.y = h.yaw;
    }
    for (const b of this.boats) {
      // a gentle rock on the current
      b.group.position.set(b.x, Math.sin(this.time * 1.4 + b.home.x) * 0.03, b.z);
      b.group.rotation.set(0, b.yaw, Math.sin(this.time * 1.1 + b.home.z) * 0.035);
    }
    for (const g of this.guards) {
      const tip = g.dead && !g.rig?.has("death");
      g.group.position.set(g.x, g.y + (tip && !g.carried ? 0.25 * g.fall : 0), g.z);
      g.group.rotation.y = g.yaw;
      g.group.rotation.x = tip ? -g.fall * (Math.PI / 2) : 0;
    }
  }

  /** Centre the sun's shadow box on what the camera sees, and move the lamp lights to the lanterns nearest it. */
  private followLights(dt: number) {
    const inPlay = this.phase !== "title" && this.phase !== "intro";
    const c = inPlay ? this.p : this.camera.position;
    // snapped to whole metres so the shadow map does not shimmer as the player walks
    const fx = Math.round(c.x);
    const fz = Math.round(c.z);
    this.sun.position.set(fx - 40, 24, fz + 30);
    this.sun.target.position.set(fx, 0, fz);
    this.lampTimer -= dt;
    if (this.lampTimer > 0) return;
    this.lampTimer = 0.5;
    const lights = this.level.lampLights;
    const near = [...this.level.lamps].sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z));
    lights.forEach((l, i) => near[i] && l.position.set(near[i].x, 3.0, near[i].z));
  }

  private render(dt: number) {
    const p = this.p;
    this.followLights(dt);
    applyTide(this.level.tide, this.tide.k);
    this.syncMeshes();
    this.navDbg?.updatePaths(this.guards);

    const crouch = this.phase !== "title" && this.crouched;
    const bob = p.moving && p.grounded ? Math.sin(this.time * (p.running ? 13 : 8)) * 0.04 : 0;
    this.animateRigs(dt);
    // the built-in figure squashes and bobs; a model has crouch and walk clips instead
    const rigged = !!this.playerRig;
    this.player.group.scale.y = crouch && !rigged ? 0.72 : 1;
    this.player.body.rotation.z = p.running ? 0.12 : 0;
    this.player.group.position.y = p.y + (rigged ? 0 : bob);
    this.player.group.visible = this.phase !== "title" && this.phase !== "intro";
    // a ring on the water marks the swimmer (faint while diving, so you can still see where you are)
    if (this.swim && !this.ripple) {
      this.ripple = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.7, 24).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xe8f4f8, transparent: true, opacity: 0.45, depthWrite: false }),
      );
      this.scene.add(this.ripple);
    }
    if (this.ripple) {
      this.ripple.visible = !!this.swim && this.player.group.visible;
      if (this.swim) {
        this.ripple.position.set(p.x, this.inSea(p.x, p.z) ? seaSurface(this.level.tide) + SWIM.seaY + 0.3 : 0.09 + 0.05 * floodShare(this.tide.k), p.z);
        this.ripple.scale.setScalar(1 + 0.12 * Math.sin(this.time * 4));
        (this.ripple.material as THREE.MeshBasicMaterial).opacity = this.swim.under ? 0.15 : 0.45;
      }
    }

    for (const g of this.guards) {
      const showState = g.brain.state !== "patrol" && !g.dead;
      const showAll = this.eagle && !g.dead;
      g.silhouette.visible = showAll;
      g.cone.visible = showAll;
      g.marker.visible = showAll || showState;
      g.marker.rotation.y += dt * 2.5;
      const winding = g.atk !== null && g.atk < GUARD_ATK.windup;
      let mScale = winding ? 1.8 : 1 + Math.sin(this.time * 6) * 0.12 * (g.brain.state === "alert" ? 1.5 : 0.5);
      if (g.pop) {
        g.pop.t += dt;
        // noticing swells the marker past full size; losing you shrinks it away
        if (g.pop.t >= FEEL.markerPop) g.pop = undefined;
        else if (!winding) mScale *= markerPopScale(g.pop.t, g.pop.gain);
        if (g.pop && !g.pop.gain) g.marker.visible = !g.dead;
      }
      g.marker.scale.setScalar(mScale);
      const col = winding ? 0xffffff : g.stagger > 0 ? 0xffd24a : g.brain.state === "patrol" && g.isTarget ? 0xffd24a : STATE_COLOR[g.brain.state];
      (g.marker.material as THREE.MeshBasicMaterial).color.setHex(col);
      g.coneMat.color.setHex(col);
      const beam = g.group.getObjectByName("beam");
      if (beam) beam.visible = !g.dead;
    }

    // camera
    if (this.phase === "playing" || this.phase === "paused" || this.phase === "won" || this.phase === "lost") {
      // scratch vectors, reused every frame (CAM_LOOK, CAM_OFF, CAM_WANT below the class)
      // crouching and standing ease the view height instead of snapping it
      const lookH = crouch ? 1.1 : 1.55;
      this.camLookY = this.camLookY === null ? lookH : this.camLookY + (lookH - this.camLookY) * (1 - Math.pow(0.001, dt));
      const look = CAM_LOOK.set(p.x, p.y + this.camLookY, p.z);
      // swimming (and diving), keep the view on the water surface
      if (this.swim) look.y = Math.max(look.y, 0.5);
      const rx = -Math.cos(this.camYaw) * 0.45;
      const rz = Math.sin(this.camYaw) * 0.45;
      look.x += rx;
      look.z += rz;
      const dist = 5.4;
      const cp = Math.cos(this.camPitch);
      const off = CAM_OFF.set(-Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), -Math.cos(this.camYaw) * cp);
      const hit = raycastBoxes(look, off, this.level.colliders, dist);
      const d = hit === null ? dist : Math.max(1.0, hit - 0.35);
      const want = CAM_WANT.copy(look).addScaledVector(off, d);
      want.y = Math.max(want.y, 0.4);
      if (this.camPos.lengthSq() === 0) this.camPos.copy(want);
      this.camPos.lerp(want, 1 - Math.pow(0.0005, dt));
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(look);
      // shake, roll and landing dip ride on top of the camera, never on the player (feel.ts)
      if (this.phase === "playing") {
        const f = this.feel.offset();
        if (f.x || f.y || f.roll || f.dip) {
          this.camera.translateX(f.x);
          this.camera.translateY(f.y + f.dip);
          this.camera.rotateZ(f.roll);
        }
      }
    }
    this.sky.position.copy(this.camera.position);

    // Mata Helang look: darker, bluish world so guards and cones stand out
    const e = this.eagle;
    this.renderer.toneMappingExposure = e ? 0.85 : 1.2;
    this.hemi.intensity = e ? LIGHT.eagleHemi : LIGHT.hemi;
    this.ambient.intensity = e ? LIGHT.eagleAmbient : LIGHT.ambient;
    this.sun.intensity = e ? LIGHT.eagleSun : LIGHT.sun;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.setHex(e ? FOG_EAGLE : FOG_DUSK);
    // mountain mist: thickens north of the level's mistZ, and more so up the ledges
    const Q = QUALITY[this.quality];
    const mz = this.def.mistZ;
    const mist = mz === undefined ? 0 : clamp((this.p.z - mz) / MIST.ramp, 0, 1) * (0.7 + 0.3 * clamp(this.p.y / 12, 0, 1));
    fog.near = Q.fogNear * (1 - MIST.near * mist);
    fog.far = Q.fogFar * (1 - MIST.far * mist);
    if (!e && mist > 0) fog.color.lerp(FOG_MIST, mist * 0.75);
    // gloom (a cave, a night level): dim the sun and sky fill, shorten the fog and darken it
    const gloom = this.def.gloom ?? 0;
    if (gloom > 0) {
      this.hemi.intensity *= 1 - 0.55 * gloom;
      this.ambient.intensity *= 1 - 0.4 * gloom;
      this.sun.intensity *= 1 - 0.6 * gloom;
      fog.near *= 1 - 0.5 * gloom;
      fog.far *= 1 - 0.45 * gloom;
      if (!e) fog.color.lerp(FOG_GLOOM, gloom);
    }
    // wayang kulit: the lit kelir's colour and depth, and the player's shadow thrown from the nearest blencong
    this.wayangLook?.frame(dt, fog, p, this.def.wayang, this.shade, this.player.group.visible && !this.swim);
    this.ghaib.render(dt, this.time, e, p, fog);
    // trees and rocks stop at the fog; ferns (small, and many) much sooner
    const fo = this.level.foliage;
    const cam = this.camera.position;
    cullFoliage(fo.treeGroup, cam, fog.far + 8);
    cullFoliage(fo.rockGroup, cam, fog.far);
    cullFoliage(fo.fernGroup, cam, Math.min(fog.far, 45));
    // the falls flow
    if (this.level.flow) this.level.flow.offset.y = (this.time * 0.9) % 1;

    // the hidden tangkal turns and bobs; once taken it swells, rises and fades out
    if (this.charm?.group.visible) {
      this.charm.group.rotation.y += dt * (this.charmPopT === null ? 1.6 : 7);
      this.charm.group.position.y = 1.7 + Math.sin(this.time * 2) * 0.08;
      if (this.charmPopT !== null) {
        this.charmPopT += dt;
        const pop = charmPop(this.charmPopT);
        this.charm.group.scale.setScalar(pop.scale);
        this.charm.group.position.y += pop.lift;
        if (this.charmPopT >= FEEL.charmPop) {
          this.charmPopT = null;
          this.charm.group.visible = false;
          this.charm.group.scale.setScalar(1);
        }
      }
    }
    // exit beam pulse
    const eb = this.level.exitBeam.material as THREE.MeshBasicMaterial;
    if (eb.opacity > 0) eb.opacity = 0.3 + Math.sin(this.time * 3) * 0.08;

    // pepper cloud: swells, then thins out
    if (this.puff) {
      const f = this.puff;
      f.t += dt;
      f.mesh.visible = f.t < 1.4;
      f.mesh.scale.setScalar(0.4 + Math.min(1, f.t / 0.35) * (TOOL.pepperR - 0.4));
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = 0.45 * Math.max(0, 1 - f.t / 1.4);
    }
    // knife flight
    if (this.knifeFly) {
      const k = this.knifeFly;
      k.t += dt / 0.2;
      this.knifeMesh.visible = true;
      this.knifeMesh.position.lerpVectors(k.from, k.to, clamp(k.t, 0, 1));
      this.knifeMesh.lookAt(k.to);
      this.knifeMesh.rotateX(Math.PI / 2);
      if (k.t >= 1) {
        this.knifeFly = null;
        this.knifeMesh.visible = false;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

const CAM_LOOK = new THREE.Vector3();
const CAM_OFF = new THREE.Vector3();
const CAM_WANT = new THREE.Vector3();

/** A horse of boxes, for when the horse model is not loaded: body, neck, head, legs and tail, facing +z. */
function blockHorse(): THREE.Group {
  const g = new THREE.Group();
  const coat = std(0x6b4423);
  const dark = std(0x2b1d12);
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, rx = 0) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    o.rotation.x = rx;
    o.castShadow = true;
    g.add(o);
  };
  box(0.55, 0.6, 1.6, coat, 0, 1.15, 0);
  box(0.3, 0.75, 0.35, coat, 0, 1.6, 0.85, -0.6);
  box(0.28, 0.3, 0.6, coat, 0, 1.95, 1.15);
  box(0.08, 0.55, 0.2, dark, 0, 1.75, 0.75, -0.6);
  for (const [x, z] of [[-0.18, 0.6], [0.18, 0.6], [-0.18, -0.6], [0.18, -0.6]]) box(0.14, 0.9, 0.14, coat, x, 0.45, z);
  box(0.1, 0.6, 0.1, dark, 0, 1.05, -0.85, 0.4);
  // saddle cloth
  box(0.62, 0.08, 0.6, std(0x8c1c13), 0, 1.47, 0);
  return g;
}

/** Every mesh of a loaded model as one InstancedMesh, at each of the spots. */
function instanceModel(model: THREE.Object3D, list: Placed[], shadow: boolean): THREE.Group {
  const g = new THREE.Group();
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const geo = m.geometry.clone().applyMatrix4(m.matrixWorld);
    // alpha-blended leaves are drawn back to front with no depth test benefit: hundreds of overlapping leaf cards
    // cost far more than cut-out ones, which write depth and hide what is behind them
    const cutout = (x: THREE.Material) => {
      if (!x.transparent) return x;
      const c = x.clone();
      c.transparent = false;
      c.alphaTest = 0.5;
      c.depthWrite = true;
      return c;
    };
    g.add(instanced(geo, Array.isArray(m.material) ? m.material.map(cutout) : cutout(m.material), list, shadow));
  });
  return g;
}
