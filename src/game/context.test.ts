import { describe, expect, it } from "vitest";
import { Held, action, actionLabel, defend, defendLabel, padCircle, padCross, type ActionCtx } from "./context";

const base: ActionCtx = { combat: false, incoming: false, carrying: false, takedownPrompt: false, canCarry: false };
const c = (o: Partial<ActionCtx>): ActionCtx => ({ ...base, ...o });

describe("action", () => {
  it("defaults to E", () => expect(action(base)).toBe("KeyE"));
  it("takedown prompt beats carry", () => expect(action(c({ takedownPrompt: true, canCarry: true, carrying: true }))).toBe("KeyE"));
  it("combat beats carry", () => expect(action(c({ combat: true, canCarry: true }))).toBe("KeyE"));
  it("carrying drops with F", () => expect(action(c({ carrying: true }))).toBe("KeyF"));
  it("a body in reach is carried with F", () => expect(action(c({ canCarry: true }))).toBe("KeyF"));
});

describe("defend", () => {
  it("parries when a blow is incoming", () => expect(defend(c({ incoming: true }))).toBe("KeyR"));
  it("rolls otherwise", () => expect(defend(base)).toBe("KeyX"));
});

describe("labels", () => {
  it("match the action", () => {
    expect(actionLabel(base)).toBe("touch.stab");
    expect(actionLabel(c({ combat: true }))).toBe("touch.strike");
    expect(actionLabel(c({ combat: true, takedownPrompt: true }))).toBe("touch.stab");
    expect(actionLabel(c({ canCarry: true }))).toBe("touch.carry");
    expect(actionLabel(c({ carrying: true }))).toBe("touch.drop");
    expect(defendLabel(c({ incoming: true }))).toBe("touch.parry");
    expect(defendLabel(base)).toBe("touch.roll");
  });
});

describe("pad Cross / Circle", () => {
  it("jump and interact when calm", () => {
    expect(padCross(base)).toBe("Space");
    expect(padCircle(base)).toBe("KeyF");
  });
  it("dodge and parry in combat", () => {
    expect(padCross(c({ combat: true }))).toBe("KeyX");
    expect(padCircle(c({ combat: true }))).toBe("KeyR");
  });
});

describe("Held", () => {
  it("releases the code resolved at press, not the current context", () => {
    const h = new Held();
    h.press("act", action(base));
    expect(action(c({ carrying: true }))).toBe("KeyF");
    expect(h.release("act")).toBe("KeyE");
    expect(h.release("act")).toBeUndefined();
  });
});
