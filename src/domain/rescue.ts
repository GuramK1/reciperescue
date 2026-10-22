import { z } from "zod";

export const stages = [
  "Preparing",
  "Mixing",
  "Kneading",
  "Resting or rising",
  "Cooking or baking",
  "Cooling",
  "Finished",
] as const;
const line = z.string().trim().min(1).max(1200);
export const ingredientSchema = z
  .object({
    name: z.string().trim().min(1, "Name this ingredient.").max(100),
    quantity: z.string().trim().max(40),
    unit: z.string().trim().max(40),
  })
  .strict();
export const recipeSchema = z
  .object({
    dish: z.string().trim().min(2, "Tell us what you’re making.").max(120),
    ingredients: z
      .array(ingredientSchema)
      .min(1, "Add at least one ingredient.")
      .max(40),
    stage: z.enum(stages),
    problem: z
      .string()
      .trim()
      .min(10, "Describe what went wrong in a little more detail.")
      .max(4000),
    context: z.string().trim().max(8000),
    safetyConcern: z.enum(["no", "yes", "unsure"]),
  })
  .strict();
export const requestSchema = z.union([
  z.object({ recipe: recipeSchema }).strict(),
  z
    .object({
      rescueId: z.uuid(),
      feedback: z.string().trim().min(3).max(2000),
    })
    .strict(),
]);
export const analysisSchema = z
  .object({
    status: z.enum(["complete", "needs_more_information"]),
    recovery: z.enum([
      "recoverable",
      "partial",
      "unlikely",
      "unsafe",
      "undetermined",
    ]),
    problem: line,
    uncertainty: line,
    evidence: z.array(line).max(8),
    alternatives: z.array(line).max(5),
    steps: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(150),
            instruction: line,
            checkpoint: line,
            caution: z.string().max(600),
          })
          .strict(),
      )
      .max(8),
    questions: z.array(line).max(3),
    explanation: line,
    warnings: z.array(line).max(6),
    prevention: z.array(line).max(5),
    safetyConcern: z.boolean(),
  })
  .strict();
export type Recipe = z.infer<typeof recipeSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type RescueResult = {
  id: string;
  mode: "demo" | "ai" | "safety";
  analysis: Analysis;
  recipe: Recipe;
  saved: boolean;
};
export type Feedback = { text: string; previousAnalysis: Analysis };

export function validateAnalysis(value: unknown): Analysis {
  const result = analysisSchema.parse(value);
  if (
    result.status === "needs_more_information" &&
    (result.questions.length === 0 ||
      result.recovery !== "undetermined" ||
      result.steps.length > 0)
  )
    throw new Error(
      "Clarification requires questions, undetermined recovery, and no rescue steps",
    );
  if (result.status === "complete" && result.questions.length > 0)
    throw new Error("A completed assessment cannot require clarification");
  if (result.status === "complete" && result.recovery === "undetermined")
    throw new Error("Undetermined recovery requires clarification");
  if (
    result.status === "complete" &&
    ["recoverable", "partial"].includes(result.recovery) &&
    result.steps.length === 0
  )
    throw new Error("Missing rescue steps");
  return result;
}

export const exampleRecipe: Recipe = {
  dish: "Cinnamon rolls",
  ingredients: ["Flour", "Milk", "Yeast", "Sugar", "Butter", "Salt"].map(
    (name) => ({ name, quantity: "", unit: "" }),
  ),
  stage: "Kneading",
  problem:
    "My dough feels soft but tears whenever I stretch it. I’ve already been kneading for a long time.",
  context: "",
  safetyConcern: "no",
};
