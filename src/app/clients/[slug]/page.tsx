import ClientProfileView from "@/components/ClientProfile";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ClientProfileView slug={slug} />;
}
