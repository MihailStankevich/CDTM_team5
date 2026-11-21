import { Suspense } from "react";
import ClientProfileView from "@/components/ClientProfile";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense fallback={<div className="skeleton m-8 h-40" />}>
      <ClientProfileView slug={slug} />
    </Suspense>
  );
}
