import { notFound } from "next/navigation";

import { PublicProfileView } from "@/app/profile/PublicProfileView";
import { getCreatorMarkets, getPublicProfileByUsername } from "@/lib/profiles/public";

type PageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function PublicUsernameProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const markets = await getCreatorMarkets(profile.id);

  return <PublicProfileView profile={profile} markets={markets} />;
}
