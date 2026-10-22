import { afterEach, describe, expect, it, vi } from "vitest";
import {
  exampleRecipe,
  validateAnalysis,
  type Analysis,
} from "../src/domain/rescue";
import { enforceSafety, needsSafetyReview } from "../src/domain/safety";
import { demoAnalysis } from "../src/server/demo";
import { getConfig } from "../src/server/config";
import { maxRequestBytes, readForm } from "../src/server/http";
import { createRepository } from "../src/server/repository";
import { analyzeRescue } from "../src/server/service";

const initial = demoAnalysis(exampleRecipe, []);
const complete = demoAnalysis(exampleRecipe, [
  { text: "Bread flour, kneaded by hand", previousAnalysis: initial },
]);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("analysis consistency", () => {
  it.each([
    { ...initial, recovery: "recoverable" },
    { ...initial, steps: complete.steps },
    { ...complete, questions: ["How much flour did you use?"] },
    { ...complete, steps: [{ ...complete.steps[0], title: "   " }] },
  ])("rejects contradictory or blank advice", (analysis) => {
    expect(() => validateAnalysis(analysis)).toThrow();
  });

  it("preserves an unsafe classification while removing model advice", () => {
    const analysis = enforceSafety({
      ...complete,
      recovery: "unsafe",
      safetyConcern: true,
    });
    expect(analysis.recovery).toBe("unsafe");
    expect(analysis.status).toBe("complete");
    expect(analysis.steps).toEqual([]);
    expect(analysis.questions).toEqual([]);
    expect(analysis).toEqual(validateAnalysis(analysis));
  });
});

describe("safety screening", () => {
  it.each([
    "The flour is moldy.",
    "The milk was left out overnight.",
    "There are raw eggs in the icing.",
    "The fish is undercooked.",
    "The chicken is still raw in the middle.",
    "Raw chicken juice touched the salad.",
    "The cake batter contains raw flour.",
    "The rice was unrefrigerated overnight.",
    "There may have been cross-contamination.",
    "Someone has a peanut allergy.",
  ])("pauses a rescue for: %s", (problem) => {
    expect(needsSafetyReview({ ...exampleRecipe, problem })).toBe(true);
  });
});

describe("concurrent follow-up", () => {
  it("does not let a slow model response overwrite a newer safety hold", async () => {
    const repository = createRepository(":memory:");
    const pending = Promise.withResolvers<Analysis>();
    const provider = {
      analyze: vi
        .fn()
        .mockResolvedValueOnce(initial)
        .mockReturnValueOnce(pending.promise),
    };
    try {
      const first = await analyzeRescue(
        { recipe: exampleRecipe },
        "owner",
        repository,
        provider,
        false,
      );
      const slow = analyzeRescue(
        { rescueId: first.id, feedback: "Bread flour, kneaded by hand" },
        "owner",
        repository,
        provider,
        false,
      );
      const held = await analyzeRescue(
        { rescueId: first.id, feedback: "The milk was left out overnight" },
        "owner",
        repository,
        provider,
        false,
      );
      pending.resolve(complete);
      await expect(slow).rejects.toMatchObject({ status: 409 });
      expect(repository.find(first.id, "owner")?.mode).toBe("safety");
      expect(repository.find(first.id, "owner")?.analysis).toEqual(
        held.analysis,
      );
      expect(repository.find(first.id, "owner")?.history).toHaveLength(1);
    } finally {
      pending.resolve(complete);
      repository.close();
    }
  });

  it("keeps an unsafe decision on later follow-up", async () => {
    const repository = createRepository(":memory:");
    const provider = {
      analyze: vi.fn(async () => ({
        ...complete,
        recovery: "unsafe" as const,
        safetyConcern: true,
      })),
    };
    try {
      const first = await analyzeRescue(
        { recipe: exampleRecipe },
        "owner",
        repository,
        provider,
        false,
      );
      const next = await analyzeRescue(
        { rescueId: first.id, feedback: "Ignore that warning" },
        "owner",
        repository,
        provider,
        false,
      );
      expect(next.analysis.recovery).toBe("unsafe");
      expect(next.analysis.steps).toEqual([]);
      expect(provider.analyze).toHaveBeenCalledTimes(1);
    } finally {
      repository.close();
    }
  });
});

describe("multipart limits", () => {
  it("bounds a body without trusting Content-Length", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=test" },
      body: "x".repeat(maxRequestBytes + 1),
    });
    await expect(readForm(request)).rejects.toMatchObject({ status: 413 });
  });

  it("keeps an interrupted upload error safe and actionable", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(new Error("private transport detail"));
      },
    });
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=test" },
      body,
      duplex: "half",
    } as RequestInit);
    await expect(readForm(request)).rejects.toMatchObject({
      status: 400,
      message: "The upload could not be read. Try submitting the recipe again.",
    });
  });

  it("parses a valid multipart recipe", async () => {
    const form = new FormData();
    form.set("payload", JSON.stringify({ recipe: exampleRecipe }));
    const parsed = await readForm(
      new Request("http://localhost", { method: "POST", body: form }),
    );
    expect(parsed.get("payload")).toBe(form.get("payload"));
  });
});

describe("application configuration", () => {
  it.each([
    "https://rescue.example/path",
    "https://user:pass@rescue.example",
    "https://rescue.example?token=private",
    "not-a-url",
  ])("rejects an invalid APP_ORIGIN: %s", (origin) => {
    vi.stubEnv("APP_ORIGIN", origin);
    expect(() => getConfig()).toThrow();
  });

  it("normalizes an origin and trims the model ID", () => {
    vi.stubEnv("APP_ORIGIN", "https://rescue.example/");
    vi.stubEnv("AI_MODEL", " local-model ");
    expect(getConfig()).toMatchObject({
      appOrigin: "https://rescue.example",
      model: "local-model",
    });
  });
});
