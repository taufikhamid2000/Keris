import { t, type Lang } from "./i18n";

// Plain tool data, kept out of engine.ts so menus and the HUD can use it without loading three.js.

/** Alat: what Q / RT / the touch Q button uses. Picked on the tool wheel (hold Tab or d-pad up), 1-3, or d-pad left / right. */
export type ToolId = "knife" | "stone" | "pepper";
export const TOOLS: { id: ToolId; name: string; desc: string }[] = (["knife", "stone", "pepper"] as const).map((id) => ({
  id,
  name: t("ms", `tool.${id}.name`),
  desc: t("ms", `tool.${id}.desc`),
}));

/** Wording in one language (the name / desc fields above are Malay). */
export const toolName = (lang: Lang, id: ToolId) => t(lang, `tool.${id}.name`);
export const toolDesc = (lang: Lang, id: ToolId) => t(lang, `tool.${id}.desc`);
