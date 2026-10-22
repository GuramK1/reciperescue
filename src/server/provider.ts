import {
  validateAnalysis,
  type Analysis,
  type Feedback,
  type Recipe,
} from "@/domain/rescue";
import type { ProviderConfig } from "./config";
import { outputSchema, systemPrompt, userContext } from "./prompt";

import { RescueError } from "./errors";

export interface AnalysisProvider {
  analyze(
    recipe: Recipe,
    history: Feedback[],
    image?: string,
  ): Promise<Analysis>;
}

export function openAICompatibleProvider(
  config: ProviderConfig,
  fetcher: typeof fetch = fetch,
): AnalysisProvider {
  const responseFormat = {
    none: undefined,
    json_object: { type: "json_object" },
    json_schema: {
      type: "json_schema",
      json_schema: {
        name: "rescue_analysis",
        strict: true,
        schema: outputSchema,
      },
    },
  }[config.responseFormat];

  return {
    async analyze(recipe, history, image) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeout);
      try {
        const response = await fetcher(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          redirect: "error",
          headers: {
            "Content-Type": "application/json",
            ...(config.key ? { Authorization: `Bearer ${config.key}` } : {}),
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: image
                  ? [
                      { type: "text", text: userContext(recipe, history) },
                      { type: "image_url", image_url: { url: image } },
                    ]
                  : userContext(recipe, history),
              },
            ],
            response_format: responseFormat,
          }),
        });
        if (!response.ok)
          throw new RescueError(
            response.status === 429
              ? "The model is busy. Wait a moment, then try again."
              : "The model rejected the request. Check the server’s provider configuration and try again.",
          );
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Missing body");
        let bytes = 0;
        const chunks: Uint8Array[] = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.length;
            if (bytes > 128 * 1024) throw new Error("Oversized output");
            chunks.push(value);
          }
        } finally {
          await reader.cancel();
        }
        const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const choice = data.choices?.[0];
        if (choice?.finish_reason && choice.finish_reason !== "stop")
          throw new Error("Incomplete output");
        if (
          typeof choice?.message?.content !== "string" ||
          choice.message.refusal
        )
          throw new Error("Missing content");
        return validateAnalysis(JSON.parse(choice.message.content));
      } catch (error) {
        if (error instanceof RescueError) throw error;
        if (controller.signal.aborted)
          throw new RescueError(
            "The model took too long. Your recipe is still here; try again.",
            504,
          );
        throw new RescueError(
          "We couldn’t get a valid rescue plan from the model. Your recipe is still here; try again.",
        );
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
