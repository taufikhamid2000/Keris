"use client";

import { useState } from "react";

/** The tale of an attempt on a small scroll, with a button to copy it. */
export default function HikayatScroll({ text, title = "Hikayat" }: { text: string; title?: string }) {
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
      <figcaption>{title}</figcaption>
      <blockquote>{text}</blockquote>
      <button className="btn ghost sm" onClick={copy}>
        {copied === "ok" ? "Copied" : copied === "fail" ? "Could not copy" : "Copy tale"}
      </button>
    </figure>
  );
}
