import type { Metadata } from "next";
import { notFound } from "next/navigation";
import KapitanClient from "@/components/KapitanClient";
import { kapitanConfig } from "@/game/kapitanNet";

export const metadata: Metadata = {
  title: "Keris · Kapitan",
  description: "Dua pemain: command the guards against a friend playing the pendekar.",
};

/** Dua pemain: the Kapitan's phone page. Not there at all when two-player mode is not configured. */
export default async function KapitanPage({ searchParams }: { searchParams: Promise<{ room?: string | string[] }> }) {
  if (!kapitanConfig()) notFound();
  const { room } = await searchParams;
  return <KapitanClient room={typeof room === "string" ? room : null} />;
}
