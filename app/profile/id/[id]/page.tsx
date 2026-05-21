import { notFound } from "next/navigation";

import { PublicProfileView } from "@/app/profile/PublicProfileView";
import { getCreatorMarkets, getPublicProfileById } from "@/lib/profiles/public";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PublicIdProfilePage({ params }: PageProps) {
  const { id } = await params;
  const profile = await getPublicProfileById(id);

  if (!profile) {
    notFound();
  }

  const markets = await getCreatorMarkets(profile.id);

  return <PublicProfileView profile={profile} markets={markets} />;
}
