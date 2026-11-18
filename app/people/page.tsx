"use client";

import PageFrame from "@/components/PageFrame";
import DestinationTiles from "@/components/DestinationTiles";
import { FRIENDS } from "@/lib/destinations";

export default function FriendsPage() {
  return (
    <PageFrame title="Friends" subtitle="Your friends, requests and rewards.">
      <DestinationTiles items={FRIENDS} />
    </PageFrame>
  );
}
