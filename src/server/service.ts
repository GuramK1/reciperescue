import { randomUUID } from "node:crypto";
import {
  requestSchema,
  type Feedback,
  type Recipe,
  type RescueResult,
} from "@/domain/rescue";
import {
  enforceSafety,
  needsSafetyReview,
  safetyAssessment,
} from "@/domain/safety";
import { demoAnalysis } from "./demo";
import type { AnalysisProvider } from "./provider";
import { RescueError } from "./errors";
import type { RescueRepository, StoredRescue } from "./repository";

export async function analyzeRescue(
  input: unknown,
  owner: string,
  repository: RescueRepository,
  provider: AnalysisProvider,
  demo: boolean,
  image?: string,
): Promise<RescueResult> {
  const request = requestSchema.parse(input);
  let previous: StoredRescue | undefined;
  let recipe: Recipe;
  let history: Feedback[] = [];
  if ("recipe" in request) {
    recipe = request.recipe;
  } else {
    previous = repository.find(request.rescueId, owner);
    if (!previous)
      throw new RescueError(
        "This rescue has expired or belongs to another session. Start a new rescue with your recipe details.",
        404,
      );
    if (previous.history.length >= 6)
      throw new RescueError(
        "This rescue has reached six updates. Start a new rescue with the latest details.",
        422,
      );
    if (previous.mode !== "safety" && (previous.mode === "demo") !== demo)
      throw new RescueError(
        "The analysis mode changed. Start a new rescue to use the new configuration.",
        409,
      );
    recipe = previous.recipe;
    history = [
      ...previous.history,
      { text: request.feedback, previousAnalysis: previous.analysis },
    ];
  }
  const safety =
    previous?.mode === "safety" ||
    needsSafetyReview(recipe, history.map((h) => h.text).join(" "));
  const analysis = safety
    ? safetyAssessment(previous?.analysis.recovery === "unsafe")
    : enforceSafety(
        demo
          ? demoAnalysis(recipe, history)
          : await provider.analyze(recipe, history, image),
      );
  const mode = analysis.safetyConcern ? "safety" : demo ? "demo" : "ai";
  const id = previous?.id ?? randomUUID();
  let saved = true;
  try {
    repository.save({
      id,
      owner,
      recipe,
      history,
      analysis,
      mode,
      createdAt: previous?.createdAt ?? Date.now(),
    });
  } catch (error) {
    if (error instanceof RescueError) throw error;
    saved = false;
  }
  return { id, mode, analysis, recipe, saved };
}
