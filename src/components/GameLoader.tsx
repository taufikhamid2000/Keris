"use client";

import dynamic from "next/dynamic";
import { useT } from "./useT";
import { useLang } from "./useLang";

function Loading() {
  const t = useT(useLang());
  return <div className="center-screen">{t("hud.loading")}</div>;
}

const GameClient = dynamic(() => import("./GameClient"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function GameLoader() {
  return <GameClient />;
}
