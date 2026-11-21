import { Suspense } from "react";
import UnifiedInbox from "@/components/UnifiedInbox";

export default function InboxPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">Opening inbox…</p>}>
      <UnifiedInbox />
    </Suspense>
  );
}
