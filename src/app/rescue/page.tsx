import { getConfig } from "@/server/config";
import { Workspace } from "@/components/workspace";

export const dynamic = "force-dynamic";
export default async function RescuePage({
  searchParams,
}: {
  searchParams: Promise<{ example?: string; problem?: string }>;
}) {
  const params = await searchParams;
  let settings = { demo: false, images: false, configured: false };
  try {
    const config = getConfig();
    settings = {
      demo: config.demo,
      images: config.images,
      configured: config.configured,
    };
  } catch {
    /* The interface exposes configuration failure without leaking server settings. */
  }
  return (
    <Workspace
      settings={settings}
      loadExample={params.example === "1"}
      initialProblem={
        typeof params.problem === "string" ? params.problem.slice(0, 4000) : ""
      }
    />
  );
}
