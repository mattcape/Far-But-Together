"use client";

import PageFrame from "@/components/PageFrame";
import DestinationTiles from "@/components/DestinationTiles";
import { YOU } from "@/lib/destinations";

export default function YouPage() {
  return (
    <PageFrame title="You" subtitle="Settings and your mailbox.">
      <DestinationTiles items={YOU} />
    </PageFrame>
  );
}
