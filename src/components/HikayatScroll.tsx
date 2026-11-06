"use client";

import { useState } from "react";
import { DEFAULT_LANG, type Lang } from "@/game/i18n";
import { useT } from "./useT";

/** The tale of an attempt on a small scroll, with a button to copy it. */
export default function HikayatScroll({ text, title, lang = DEFAULT_LANG }: { text: string; title?: string; lang?: Lang }) {
  const t = useT(lang);
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  };
  return (
    <figure className="hikayat-scroll">
      <figcaption>{title ?? t("menu.hikayat.title")}</figcaption>
      <blockquote>{text}</blockquote>
      <button className="btn ghost sm" onClick={copy}>
        {copied === "ok" ? t("menu.hikayat.copied") : copied === "fail" ? t("menu.hikayat.copyFail") : t("menu.hikayat.copy")}
      </button>
    </figure>
  );
}
