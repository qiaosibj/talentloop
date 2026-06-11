import { TierListClient } from "@/components/TierListClient";

export default async function TierPage({ params }: { params: Promise<{ tier: string }> }) {
  const { tier } = await params;
  return <TierListClient tier={tier} />;
}
