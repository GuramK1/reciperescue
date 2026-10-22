import { type Analysis, type Feedback, type Recipe } from "@/domain/rescue";
import { RescueError } from "./errors";

export function demoAnalysis(recipe: Recipe, history: Feedback[]): Analysis {
  if (!/cinnamon rolls?/i.test(recipe.dish))
    throw new RescueError(
      "Demo mode supports the cinnamon-roll example. Load the example, or configure an AI provider for your own recipe.",
      422,
    );
  const base = {
    uncertainty:
      "This is a scripted example, not AI analysis or a diagnosis of your dough.",
    evidence: [
      "The sample describes soft dough tearing during stretching after extended kneading.",
    ],
    alternatives: [
      "Flour type or hydration may affect the dough.",
      "Mixing technique, temperature, or dough tension may also matter.",
    ],
    explanation:
      "The amount of liquid, flour type, and how the dough is worked can all affect how well it stretches.",
    warnings: [
      "Do not add an arbitrary amount of flour. The example does not establish the exact cause.",
    ],
    prevention: [
      "Record flour type and ingredient weights so small changes are easier to understand.",
    ],
    safetyConcern: false,
  };
  if (history.length === 0)
    return {
      ...base,
      status: "needs_more_information",
      recovery: "undetermined",
      problem: "A few recipe details could change the next step.",
      steps: [],
      questions: [
        "What flour did you use, and how much flour and milk are in the dough?",
        "Did you knead by hand or in a mixer, and does the dough feel unusually warm?",
      ],
    };
  return {
    ...base,
    status: "complete",
    recovery: "recoverable",
    problem: "The dough may need time to relax.",
    questions: [],
    steps: [
      {
        title: "Pause before changing the dough",
        instruction:
          "Keep the dough covered while you reassess. Avoid adding flour just because it tears.",
        checkpoint:
          "Notice whether it feels tight, sticky, greasy, or unusually warm.",
        caution:
          "This illustrative step does not establish a cause or assess food safety.",
      },
      {
        title: "Check a small piece gently",
        instruction:
          "Stretch a small piece gently instead of repeatedly pulling the whole dough.",
        checkpoint: "Look for a little more give before it tears.",
        caution:
          "Do not force or repeatedly knead the dough if its condition is worsening.",
      },
      {
        title: "Tell us what changed",
        instruction:
          "If it still tears immediately, describe the texture and any ingredient changes.",
        checkpoint: "Use the follow-up box to record what you observed.",
        caution:
          "Demo follow-ups show this same example plan; they do not evaluate your answer.",
      },
    ],
  };
}
