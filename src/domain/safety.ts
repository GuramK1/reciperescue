import type { Analysis, Recipe } from "./rescue";

export const safetySource = {
  title: "FDA: Are You Storing Food Safely?",
  url: "https://www.fda.gov/consumers/consumer-updates/are-you-storing-food-safely",
  reviewed: "2026-10-21",
};

// shortcut: screening covers English only, evaluate other languages before supporting them.
export function needsSafetyReview(recipe: Recipe, feedback = "") {
  const context = [
    recipe.dish,
    recipe.problem,
    recipe.context,
    ...recipe.ingredients.map((ingredient) => ingredient.name),
    feedback,
  ].join(" ");
  return (
    recipe.safetyConcern !== "no" ||
    /\b(mou?ld\w*|spoil\w*|rotten|contaminat\w*|food poisoning|salmonella|left out|overnight on|undercooked|unrefrigerated|unpasteuri[sz]ed|allerg\w*)\b/i.test(
      context,
    ) ||
    /\braw\b[\s\S]{0,40}\b(chicken|poultry|meat|eggs?|fish|seafood|pork|beef|flour|dough|batter|milk)\b/i.test(
      context,
    ) ||
    /\b(chicken|poultry|meat|eggs?|fish|seafood|pork|beef|flour|dough|batter|cake)\b[\s\S]{0,40}\braw\b/i.test(
      context,
    )
  );
}

export function safetyAssessment(unsafe = false): Analysis {
  return {
    status: unsafe ? "complete" : "needs_more_information",
    recovery: unsafe ? "unsafe" : "undetermined",
    safetyConcern: true,
    problem: unsafe
      ? "Do not try to rescue food flagged as unsafe."
      : "Pause to check food safety before trying a rescue.",
    uncertainty:
      "A description or photograph cannot establish that food is safe to eat.",
    evidence: ["A possible safety concern was reported or identified."],
    alternatives: [],
    steps: [],
    questions: unsafe
      ? []
      : [
          "What is the safety concern, and how was the food stored or handled? Include measured temperatures and time if known.",
        ],
    explanation:
      "Changing texture or flavor does not resolve contamination or unsafe storage. This MVP does not make individualized food-safety clearance decisions.",
    warnings: [
      "Do not taste food to decide whether it is safe.",
      "FDA guidance: refrigerate perishable food within two hours, or within one hour when the air temperature is above 90°F (32°C).",
    ],
    prevention: [
      "Keep track of storage times and use a food thermometer where appropriate.",
    ],
  };
}

export function enforceSafety(analysis: Analysis): Analysis {
  return analysis.safetyConcern || analysis.recovery === "unsafe"
    ? safetyAssessment(analysis.recovery === "unsafe")
    : analysis;
}
