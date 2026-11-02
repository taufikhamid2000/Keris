import * as THREE from "three";
import { buildLevel, type Level } from "./level";
import {
  canSee,
  clamp,
  detectionRate,
  dist2D,
  forceAlert,
  isBehind,
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

export type Phase = "title" | "playing" | "paused" | "won" | "lost";
export type LoseReason = "caught" | null;

export interface HudState {
  meter: number;
  alert: GuardState | "calm";
  objective: string;
  northDeg: number;
  objDeg: number | null;
  eagle: boolean;
  crouched: boolean;
  hidden: boolean;
  knives: number;
  prompt: string;
  toast: string;
  caught: number;
}

export interface GameCallbacks {
  onHud: (h: HudState) => void;
  onPhase: (p: Phase, reason: LoseReason) => void;
}

const VIS = { range: 16, halfAngle: 0.6 };
const PLAYER_R = 0.4;
const STEP_H = 0.6;
const CATCH_SECONDS = 2;
const START_KNIVES = 6;

interface Guard {
  id: number;
  isTarget: boolean;
  group: THREE.Group;
  body: THREE.Mesh;
  silhouette: THREE.Mesh;
  marker: THREE.Mesh;
  cone: THREE.Mesh;
  coneMat: THREE.MeshBasicMaterial;
  x: number;
  z: number;
  yaw: number;
  brain: Brain;
  meter: number;
  waypoints: Vec2[];
  wp: number;
  wait: number;
  stun: number;
  dead: boolean;
  fall: number;
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
      if (b.maxY <= feetY + STEP_H) continue;
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
  return { group: g, body };
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
  return { group: g, body };
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
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private level: Level;
  private sky: THREE.Mesh;
  private player = makePendekar();
  private guards: Guard[] = [];
  private keys = new Set<string>();
  private raf = 0;
  private last = 0;
  private hudTimer = 0;
  private time = 0;

  // player state
  private p = { x: 0, y: 0, z: 0, vy: 0, grounded: true, yaw: 0, moving: false, running: false };
  private crouchToggle = false;
  private camYaw = (3 * Math.PI) / 4;
  private camPitch = 0.35;
  private camPos = new THREE.Vector3();
  private climb: { t: number; dur: number; from: THREE.Vector3; to: THREE.Vector3 } | null = null;
  private eagle = false;
  private knives = START_KNIVES;
  private knifeCd = 0;
  private caught = 0;
  private objective: "kill" | "escape" = "kill";
  private hidden = false;
  private toastText = "";
  private toastT = 0;
  private lockedOnce = false;
  private knifeMesh: THREE.Mesh;
  private knifeFly: { t: number; from: THREE.Vector3; to: THREE.Vector3 } | null = null;
  private disposers: (() => void)[] = [];

  constructor(
    private container: HTMLElement,
    private cb: GameCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
    this.scene.fog = new THREE.Fog(0xc98259, 25, 150);

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
    this.scene.add(new THREE.HemisphereLight(0xffc896, 0x3a2a4a, 0.85));
    const sun = new THREE.DirectionalLight(0xffa054, 2.6);
    sun.position.set(-40, 24, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
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

    this.level = buildLevel();
    this.scene.add(this.level.root);
    this.scene.add(this.player.group);

    this.knifeMesh = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 5), new THREE.MeshBasicMaterial({ color: 0xe6e6e6 }));
    this.knifeMesh.visible = false;
    this.scene.add(this.knifeMesh);

    this.level.guards.forEach((def, i) => this.guards.push(this.makeGuard(def.waypoints, !!def.isTarget, i)));

    this.resetWorld();
    this.bindEvents();
    this.onResize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ------------------------------------------------------------------ setup

  private makeGuard(waypoints: Vec2[], isTarget: boolean, id: number): Guard {
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
    return {
      id,
      isTarget,
      group: fig.group,
      body: fig.body,
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
      lastKnown: null,
      investigate: null,
      noiseFlag: false,
      seesPlayer: false,
    };
  }

  private resetWorld() {
    const s = this.level.start;
    this.p = { x: s.x, y: 0, z: s.z, vy: 0, grounded: true, yaw: (3 * Math.PI) / 4, moving: false, running: false };
    this.camYaw = (3 * Math.PI) / 4;
    this.camPitch = 0.35;
    this.climb = null;
    this.eagle = false;
    this.knives = START_KNIVES;
    this.knifeCd = 0;
    this.caught = 0;
    this.objective = "kill";
    this.hidden = false;
    this.crouchToggle = false;
    this.toastText = "";
    (this.level.exitBeam.material as THREE.MeshBasicMaterial).opacity = 0;
    for (const g of this.guards) {
      g.x = g.waypoints[0].x;
      g.z = g.waypoints[0].z;
      g.wp = 1 % g.waypoints.length;
      g.yaw = yawTo(g, g.waypoints[g.wp]);
      g.brain = newBrain();
      g.meter = 0;
      g.stun = 0;
      g.dead = false;
      g.fall = 0;
      g.wait = 0;
      g.lastKnown = null;
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
      if (this.phase !== "playing") return;
      if (["Space", "ArrowUp", "ArrowDown", "Tab"].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === "KeyE") this.tryTakedown();
      if (e.code === "KeyQ") this.tryThrow();
      if (e.code === "KeyV") this.eagle = !this.eagle;
      if (e.code === "KeyC") this.crouchToggle = !this.crouchToggle;
      if (e.code === "Space") this.tryJumpOrClimb();
    });
    on("keyup", (e) => this.keys.delete(e.code));
    on("blur", () => this.keys.clear());
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

  start() {
    this.resetWorld();
    this.setPhase("playing");
    this.lock();
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
      this.setPhase("paused");
    }
  }
  private lock() {
    try {
      const r = this.renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
      r?.catch?.(() => {});
    } catch {
      /* pointer lock unavailable (e.g. headless); keyboard still works */
    }
  }
  look(dx: number, dy: number) {
    this.camYaw -= dx * 0.0022;
    this.camPitch = clamp(this.camPitch + dy * 0.0022, -0.25, 1.2);
  }
  /** Small read-only snapshot used by the automated browser check. */
  debug() {
    return {
      phase: this.phase,
      player: { x: this.p.x, y: this.p.y, z: this.p.z },
      guards: this.guards.map((g) => ({ x: g.x, z: g.z, state: g.brain.state, dead: g.dead, target: g.isTarget })),
      objective: this.objective,
      drawCalls: this.renderer.info.render.calls,
    };
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    this.disposers.forEach((d) => d());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
  private setPhase(p: Phase, reason: LoseReason = null) {
    this.phase = p;
    if (p !== "playing" && document.pointerLockElement) document.exitPointerLock();
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
    if (this.phase === "playing") this.update(dt);
    if (this.phase === "title") this.attractCamera();
    this.render(dt);
  };

  private attractCamera() {
    const a = this.time * 0.08;
    this.camera.position.set(Math.sin(a) * 34, 15, Math.cos(a) * 34);
    this.camera.lookAt(0, 3, 0);
  }

  private get crouched() {
    return this.keys.has("ControlLeft") || this.keys.has("ControlRight") || this.crouchToggle;
  }

  private update(dt: number) {
    this.toastT = Math.max(0, this.toastT - dt);
    this.knifeCd = Math.max(0, this.knifeCd - dt);
    const L = this.level;
    const p = this.p;

    // ---- player movement
    let fwd = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    let str = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    const len = Math.hypot(fwd, str);
    if (len > 0) {
      fwd /= len;
      str /= len;
    }
    const crouched = this.crouched;
    p.running = (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight")) && !crouched && len > 0;

    if (this.climb) {
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
      const speed = crouched ? 1.7 : p.running ? 6.2 : 3.4;
      const fx = Math.sin(this.camYaw);
      const fz = Math.cos(this.camYaw);
      const rx = -Math.cos(this.camYaw);
      const rz = Math.sin(this.camYaw);
      const mx = fx * fwd + rx * str;
      const mz = fz * fwd + rz * str;
      p.moving = len > 0;
      if (p.moving) {
        const target = Math.atan2(mx, mz);
        p.yaw += clamp(wrapAngle(target - p.yaw), -12 * dt, 12 * dt);
        p.x += mx * speed * dt;
        p.z += mz * speed * dt;
      }
      pushOut(p, PLAYER_R, L.colliders, p.y);
      this.applyBounds();

      // vertical
      p.vy -= 20 * dt;
      p.y += p.vy * dt;
      const g = groundHeight(p.x, p.z, p.y, L.colliders);
      if (p.y <= g) {
        p.y = g;
        p.vy = 0;
        p.grounded = true;
      } else if (p.y > g + 0.05) p.grounded = false;

      // holding Space against a wall climbs it
      if (this.keys.has("Space") && p.moving) this.tryClimb();
    }

    // ---- hiding
    this.hidden = L.hides.some((h) => p.y < 1 && dist2D(p, h) < h.r);

    // ---- noise
    const stance = { crouched, running: p.running };
    const nr = this.hidden ? 0 : noiseRadius(stance, p.moving && p.grounded);
    if (nr > 0) for (const g of this.guards) if (!g.dead && dist2D(g, p) < nr * (Math.abs(g.group.position.y - p.y) > 2 ? 0.5 : 1)) this.hear(g, p);

    // ---- guards
    for (const g of this.guards) this.updateGuard(g, dt, stance);

    // ---- caught
    const grabbing = this.guards.some((g) => !g.dead && g.stun <= 0 && g.brain.state === "alert" && dist2D(g, p) < 2.3 && p.y < 2.2);
    this.caught = clamp(this.caught + (grabbing ? dt : -dt * 0.6), 0, CATCH_SECONDS);
    if (this.caught >= CATCH_SECONDS) {
      this.setPhase("lost", "caught");
      return;
    }

    // ---- escape
    if (this.objective === "escape" && dist2D(p, L.exit) < 2.4) {
      this.setPhase("won");
      return;
    }

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.08;
      this.cb.onHud(this.buildHud());
    }
  }

  private applyBounds() {
    const b = this.level.bounds;
    const p = this.p;
    p.x = clamp(p.x, b.minX, b.maxX);
    p.z = clamp(p.z, b.minZ, b.maxZ);
    if (p.z < b.jettyZ) p.x = clamp(p.x, -b.jettyHalf, b.jettyHalf);
  }

  private tryJumpOrClimb() {
    if (this.climb) return;
    if (this.tryClimb()) return;
    if (this.p.grounded) {
      this.p.vy = 7.2;
      this.p.grounded = false;
    }
  }

  /** Vault / climb onto a ledge in front of the player (up to ~3.7 m). */
  private tryClimb(): boolean {
    if (this.climb) return false;
    const p = this.p;
    const dx = Math.sin(p.yaw);
    const dz = Math.cos(p.yaw);
    let best: Box | null = null;
    for (const reach of [0.5, 0.85]) {
      const px = p.x + dx * (PLAYER_R + reach);
      const pz = p.z + dz * (PLAYER_R + reach);
      for (const b of this.level.colliders) {
        if (b.maxY <= p.y + STEP_H || b.maxY > p.y + 3.7) continue;
        if (px < b.minX - 0.05 || px > b.maxX + 0.05 || pz < b.minZ - 0.05 || pz > b.maxZ + 0.05) continue;
        if (!best || b.maxY < best.maxY) best = b;
      }
      if (best) break;
    }
    if (!best) return false;
    const tx = clamp(p.x + dx * (PLAYER_R + 0.95), best.minX + 0.5, best.maxX - 0.5);
    const tz = clamp(p.z + dz * (PLAYER_R + 0.95), best.minZ + 0.5, best.maxZ - 0.5);
    const h = best.maxY - p.y;
    this.climb = {
      t: 0,
      dur: 0.35 + h * 0.13,
      from: new THREE.Vector3(p.x, p.y, p.z),
      to: new THREE.Vector3(tx, best.maxY, tz),
    };
    p.vy = 0;
    return true;
  }

  // ------------------------------------------------------------------ guards

  private hear(g: Guard, src: Vec2) {
    if (g.brain.state === "alert") return;
    g.noiseFlag = true;
    g.investigate = { x: src.x, z: src.z };
  }

  private updateGuard(g: Guard, dt: number, stance: { crouched: boolean; running: boolean }) {
    if (g.dead) {
      g.fall = Math.min(1, g.fall + dt * 3);
      return;
    }
    const p = this.p;
    const L = this.level;

    if (g.stun > 0) {
      g.stun -= dt;
      g.meter = Math.max(0, g.meter - dt * 0.3);
      if (g.stun <= 0) {
        g.brain = { state: "suspicious", timer: 0 };
        g.investigate = { x: p.x, z: p.z };
      }
      return;
    }

    // ---- senses
    const alertNow = g.brain.state === "alert";
    const eye = { x: g.x, y: 1.7, z: g.z };
    const chest = { x: p.x, y: p.y + (stance.crouched ? 0.6 : 1.1), z: p.z };
    const seen = canSee(eye, g.yaw, chest, VIS, L.occluders, this.hidden);
    g.seesPlayer = seen;
    if (seen) {
      g.lastKnown = { x: p.x, z: p.z };
      g.meter = alertNow ? 1 : stepMeter(g.meter, true, detectionRate(dist2D(g, p), VIS.range, stance), dt);
    } else {
      g.meter = stepMeter(g.meter, false, 0, dt, alertNow || g.brain.state === "search" ? 0.1 : 0.25);
    }

    // ---- brain
    const prev = g.brain.state;
    g.brain = stepBrain(g.brain, { meter: g.meter, seesPlayer: seen, heardNoise: g.noiseFlag }, dt);
    const noisePoint = g.noiseFlag ? g.investigate : null;
    g.noiseFlag = false;
    const now = g.brain.state;
    if (now !== prev) {
      if (now === "alert") {
        g.meter = 1;
        if (!g.lastKnown) g.lastKnown = { x: p.x, z: p.z };
        this.toast(g.isTarget ? "The Kapitan has seen you!" : "Spotted!");
        for (const o of this.guards) {
          if (o !== g && !o.dead && o.stun <= 0 && o.brain.state !== "alert" && dist2D(o, g) < 14) {
            o.brain = forceAlert();
            o.meter = 1;
            o.lastKnown = g.lastKnown;
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
      }
    }

    // ---- movement per state
    switch (g.brain.state) {
      case "patrol": {
        const w = g.waypoints[g.wp];
        if (g.wait > 0) {
          g.wait -= dt;
          g.yaw += Math.sin(this.time * 1.3 + g.id) * dt * 0.8;
        } else if (this.moveToward(g, w, 1.7, dt, 4) < 0.5) {
          g.wp = (g.wp + 1) % g.waypoints.length;
          g.wait = 1.2;
        }
        break;
      }
      case "suspicious": {
        if (seen) this.turnToward(g, yawTo(g, p), 6, dt);
        else {
          const pt = g.investigate ?? g.lastKnown;
          if (pt && dist2D(g, pt) > 2) this.moveToward(g, pt, 1.3, dt, 5);
          else g.yaw += Math.sin(this.time * 2 + g.id) * dt * 1.5;
        }
        break;
      }
      case "alert": {
        const pt = g.lastKnown ?? { x: p.x, z: p.z };
        if (dist2D(g, pt) > 1.0) this.moveToward(g, pt, 4.0, dt, 9);
        else this.turnToward(g, yawTo(g, p), 9, dt);
        break;
      }
      case "search": {
        const pt = g.lastKnown;
        if (pt && dist2D(g, pt) > 1.2) this.moveToward(g, pt, 2.4, dt, 6);
        else g.yaw += 1.4 * dt;
        break;
      }
    }
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
      g.x += Math.sin(g.yaw) * step;
      g.z += Math.cos(g.yaw) * step;
      pushOut(g, 0.45, this.level.colliders, 0);
    }
    return d;
  }

  // ------------------------------------------------------------------ actions

  private takedownTarget(): { guard: Guard | null; near: boolean } {
    const p = this.p;
    let best: Guard | null = null;
    let near = false;
    for (const g of this.guards) {
      if (g.dead) continue;
      const d = dist2D(g, p);
      if (d > 2.0 || Math.abs(p.y - 0) > 1.8) continue;
      near = true;
      const ok = g.stun > 0 || (g.brain.state !== "alert" && isBehind(g, g.yaw, p));
      if (ok && (!best || d < dist2D(best, p))) best = g;
    }
    return { guard: best, near };
  }

  private tryTakedown() {
    if (this.climb) return;
    const { guard } = this.takedownTarget();
    if (!guard) return;
    guard.dead = true;
    guard.meter = 0;
    this.p.yaw = yawTo(this.p, guard);
    for (const o of this.guards) if (!o.dead && o !== guard && dist2D(o, guard) < 5) this.hear(o, guard);
    if (guard.isTarget) {
      this.objective = "escape";
      (this.level.exitBeam.material as THREE.MeshBasicMaterial).opacity = 0.35;
      this.toast("The Kapitan is down. Reach the jetty.");
    } else this.toast("Silent kill.");
  }

  private tryThrow() {
    if (this.knives <= 0 || this.knifeCd > 0 || this.climb) return;
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
    if (hitGuard) {
      hitGuard.stun = 5;
      hitGuard.meter = 0;
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
    const tg = this.takedownTarget();
    let prompt = "";
    if (this.climb) prompt = "";
    else if (tg.guard) prompt = tg.guard.isTarget ? "E  Strike the Kapitan with the keris" : tg.guard.stun > 0 ? "E  Finish stunned guard" : "E  Keris takedown";
    else if (tg.near) prompt = "Get behind him";
    else if (this.hidden) prompt = "Hidden";

    const tgt = this.objective === "kill" ? this.guards.find((g) => g.isTarget && !g.dead) : null;
    const obj: Vec2 = tgt ?? this.level.exit;
    const rel = wrapAngle(yawTo(p, obj) - this.camYaw);
    return {
      meter,
      alert,
      objective: this.objective === "kill" ? "Find and silence the Kapitan of the bridge battery" : "Slip away to the jetty",
      northDeg: (this.camYaw * 180) / Math.PI,
      objDeg: (-rel * 180) / Math.PI,
      eagle: this.eagle,
      crouched: this.crouched,
      hidden: this.hidden,
      knives: this.knives,
      prompt,
      toast: this.toastT > 0 ? this.toastText : "",
      caught: this.caught / CATCH_SECONDS,
    };
  }

  // ------------------------------------------------------------------ render

  private syncMeshes() {
    const p = this.p;
    this.player.group.position.set(p.x, p.y, p.z);
    this.player.group.rotation.y = p.yaw;
    for (const g of this.guards) {
      g.group.position.set(g.x, g.dead ? 0.25 * g.fall : 0, g.z);
      g.group.rotation.y = g.yaw;
      g.group.rotation.x = g.dead ? -g.fall * (Math.PI / 2) : 0;
    }
  }

  private render(dt: number) {
    const p = this.p;
    this.syncMeshes();

    const crouch = this.phase !== "title" && this.crouched;
    const bob = p.moving && p.grounded ? Math.sin(this.time * (p.running ? 13 : 8)) * 0.04 : 0;
    this.player.group.scale.y = crouch ? 0.72 : 1;
    this.player.body.rotation.z = p.running ? 0.12 : 0;
    this.player.group.position.y = p.y + bob;
    this.player.group.visible = this.phase !== "title";

    for (const g of this.guards) {
      const showState = g.brain.state !== "patrol" && !g.dead;
      const showAll = this.eagle && !g.dead;
      g.silhouette.visible = showAll;
      g.cone.visible = showAll;
      g.marker.visible = showAll || showState;
      g.marker.rotation.y += dt * 2.5;
      g.marker.scale.setScalar(1 + Math.sin(this.time * 6) * 0.12 * (g.brain.state === "alert" ? 1.5 : 0.5));
      const col = g.brain.state === "patrol" && g.isTarget ? 0xffd24a : STATE_COLOR[g.brain.state];
      (g.marker.material as THREE.MeshBasicMaterial).color.setHex(col);
      g.coneMat.color.setHex(col);
      const beam = g.group.getObjectByName("beam");
      if (beam) beam.visible = !g.dead;
    }

    // camera
    if (this.phase !== "title") {
      const look = new THREE.Vector3(p.x, p.y + (crouch ? 1.1 : 1.55), p.z);
      const rx = -Math.cos(this.camYaw) * 0.45;
      const rz = Math.sin(this.camYaw) * 0.45;
      look.x += rx;
      look.z += rz;
      const dist = 5.4;
      const cp = Math.cos(this.camPitch);
      const off = new THREE.Vector3(-Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), -Math.cos(this.camYaw) * cp);
      const hit = raycastBoxes({ x: look.x, y: look.y, z: look.z }, off, this.level.colliders, dist);
      const d = hit === null ? dist : Math.max(1.0, hit - 0.35);
      const want = look.clone().addScaledVector(off, d);
      want.y = Math.max(want.y, 0.4);
      if (this.camPos.lengthSq() === 0) this.camPos.copy(want);
      this.camPos.lerp(want, 1 - Math.pow(0.0005, dt));
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(look);
    }
    this.sky.position.copy(this.camera.position);

    // Mata Helang look: slightly dimmer, bluish tone
    this.renderer.toneMappingExposure = this.eagle ? 0.8 : 1.05;

    // exit beam pulse
    const eb = this.level.exitBeam.material as THREE.MeshBasicMaterial;
    if (eb.opacity > 0) eb.opacity = 0.3 + Math.sin(this.time * 3) * 0.08;

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
