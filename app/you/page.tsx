"use client";

import Link from "next/link";
import PageFrame from "@/components/PageFrame";
import DestinationTiles from "@/components/DestinationTiles";
import { YOU } from "@/lib/destinations";

export default function YouPage() {
  return (
    <PageFrame title="You" subtitle="Settings and your mailbox.">
      <DestinationTiles items={YOU} />

      <nav aria-label="Legal" className="mt-4 flex gap-5 text-sm text-ink/75">
        <Link href="/privacy" prefetch={false} className="underline underline-offset-4">
          Privacy policy
        </Link>
        <Link href="/terms" prefetch={false} className="underline underline-offset-4">
          Terms of use
        </Link>
      </nav>
    </PageFrame>
  );
}
