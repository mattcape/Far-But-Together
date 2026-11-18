"use client";

import PageFrame from "@/components/PageFrame";
import DestinationTiles from "@/components/DestinationTiles";
import { REMEMBER } from "@/lib/destinations";

export default function RememberPage() {
  return (
    <PageFrame title="Remember" subtitle="Memories, photos and how far you've come.">
      <DestinationTiles items={REMEMBER} />
    </PageFrame>
  );
}
