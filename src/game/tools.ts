// Plain tool data, kept out of engine.ts so menus and the HUD can use it without loading three.js.

/** Alat: what Q / RT / the touch Q button uses. Picked on the tool wheel (hold Tab or d-pad up), 1-3, or d-pad left / right. */
export type ToolId = "knife" | "stone" | "pepper";
export const TOOLS: { id: ToolId; name: string; desc: string }[] = [
  { id: "knife", name: "Pisau lempar", desc: "Stuns the guard it hits; a miss clatters and draws guards to it" },
  { id: "stone", name: "Batu", desc: "A thrown stone: guards within 14 m of where it lands go and look" },
  { id: "pepper", name: "Serbuk lada", desc: "Pepper in the face: blinds every guard within 4.5 m, even in a fight" },
];
