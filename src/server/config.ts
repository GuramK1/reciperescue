import { z } from "zod";

const environmentSchema = z.object({
  DEMO_MODE: z.enum(["true", "false"]).default("true"),
  AI_BASE_URL: z.url().default("https://api.openai.com/v1"),
  AI_MODEL: z.string().trim().default(""),
  AI_API_KEY: z.string().default(""),
  AI_SUPPORTS_IMAGES: z.enum(["true", "false"]).default("false"),
  AI_RESPONSE_FORMAT: z
    .enum(["json_schema", "json_object", "none"])
    .default("json_schema"),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(45000),
  APP_ORIGIN: z.string().trim().default(""),
});

export function getConfig() {
  const env = environmentSchema.parse(process.env);
  const base = new URL(env.AI_BASE_URL);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw new Error("Invalid provider URL");
  if (
    base.protocol === "http:" &&
    ![
      "localhost",
      "127.0.0.1",
      "[::1]",
      "host.docker.internal",
      "ollama",
    ].includes(base.hostname)
  )
    throw new Error("Remote providers require HTTPS");
  const demo = env.DEMO_MODE === "true";
  let appOrigin: string | undefined;
  if (env.APP_ORIGIN) {
    const origin = new URL(env.APP_ORIGIN);
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    )
      throw new Error("APP_ORIGIN must contain only a scheme and host");
    appOrigin = origin.origin;
  }
  return {
    appOrigin,
    demo,
    baseUrl: env.AI_BASE_URL.replace(/\/$/, ""),
    model: env.AI_MODEL,
    key: env.AI_API_KEY,
    images: !demo && env.AI_SUPPORTS_IMAGES === "true",
    responseFormat: env.AI_RESPONSE_FORMAT,
    timeout: env.AI_TIMEOUT_MS,
    configured: demo || Boolean(env.AI_MODEL),
  };
}
export type ProviderConfig = ReturnType<typeof getConfig>;
