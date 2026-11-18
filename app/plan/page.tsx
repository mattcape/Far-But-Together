"use client";

import PageFrame from "@/components/PageFrame";
import DestinationTiles from "@/components/DestinationTiles";
import { PLAN } from "@/lib/destinations";

export default function PlanPage() {
  return (
    <PageFrame title="Plan" subtitle="Dates, visits, countdowns and surprises.">
      <DestinationTiles items={PLAN} />
    </PageFrame>
  );
}
