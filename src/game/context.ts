// Context-sensitive actions for touch and gamepad (no DOM). Fewer buttons: one "action" and one "defend" control
// resolve to the key the keyboard would use. Resolve on press and remember the code until release (see Held).

export interface ActionCtx {
  /** an alert guard is close (hud.combat) */
  combat: boolean;
  /** a guard is winding up a strike (hud.incoming) */
  incoming: boolean;
  /** a body is on the player's shoulder (hud.carrying) */
  carrying: boolean;
  /** the takedown prompt is showing (hud.prompt === "§play.prompt.takedown") */
  takedownPrompt: boolean;
  /** a body is within reach (hud.canCarry) */
  canCarry: boolean;
}

export const TAKEDOWN_PROMPT = "§play.prompt.takedown";

export function ctxFromHud(h: { combat: boolean; incoming: boolean; carrying: boolean; prompt: string; canCarry?: boolean }): ActionCtx {
  return { combat: h.combat, incoming: h.incoming, carrying: h.carrying, takedownPrompt: h.prompt === TAKEDOWN_PROMPT, canCarry: !!h.canCarry };
}

/** Touch action button: strike or stab, else carry / drop. */
export function action(c: ActionCtx): "KeyE" | "KeyF" {
  if (c.takedownPrompt || c.combat) return "KeyE";
  if (c.carrying || c.canCarry) return "KeyF";
  return "KeyE";
}

/** Defend button: parry an incoming blow, otherwise roll. */
export function defend(c: ActionCtx): "KeyR" | "KeyX" {
  return c.incoming ? "KeyR" : "KeyX";
}

/** Gamepad Cross: jump / climb, or dodge in a fight. */
export function padCross(c: ActionCtx): "Space" | "KeyX" {
  return c.combat ? "KeyX" : "Space";
}

/** Gamepad Circle: interact (carry / drop), or parry in a fight. */
export function padCircle(c: ActionCtx): "KeyF" | "KeyR" {
  return c.combat ? "KeyR" : "KeyF";
}

/** UI label keys (touch.* strings) for what the action button will do. */
export function actionLabel(c: ActionCtx): "touch.stab" | "touch.strike" | "touch.carry" | "touch.drop" {
  if (action(c) === "KeyF") return c.carrying ? "touch.drop" : "touch.carry";
  return c.combat && !c.takedownPrompt ? "touch.strike" : "touch.stab";
}

export function defendLabel(c: ActionCtx): "touch.parry" | "touch.roll" {
  return defend(c) === "KeyR" ? "touch.parry" : "touch.roll";
}

/** Remembers the code resolved at press time so down and up always match, even if the context changes mid-press. */
export class Held {
  private m = new Map<string | number, string>();
  press(id: string | number, code: string): string {
    this.m.set(id, code);
    return code;
  }
  release(id: string | number): string | undefined {
    const c = this.m.get(id);
    this.m.delete(id);
    return c;
  }
}
