import { Suspense } from "react";
import UnifiedInbox from "@/components/UnifiedInbox";

export default function InboxPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-white/50">Opening inbox…</p>}>
      <UnifiedInbox />
    </Suspense>
  );
}
