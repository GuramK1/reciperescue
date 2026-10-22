import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { ZodError } from "zod";
import { getConfig } from "@/server/config";
import { getRepository } from "@/server/repository";
import { openAICompatibleProvider } from "@/server/provider";
import { RescueError } from "@/server/errors";
import { analyzeRescue } from "@/server/service";
import { prepareImage } from "@/server/images";
import { acquireRequest, readForm } from "@/server/http";
import { requestSchema } from "@/domain/rescue";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  let release: (() => void) | undefined;
  try {
    const config = getConfig();
    // Next normalizes loopback hostnames; preserve the browser's actual Host for same-origin checks.
    const expectedOrigin =
      config.appOrigin ||
      `${request.nextUrl.protocol}//${request.headers.get("host") || request.nextUrl.host}`;
    if (request.headers.get("origin") !== expectedOrigin)
      throw new RescueError(
        "This request came from another site. Open RecipeRescue directly and try again.",
        403,
      );
    const existingCookie = request.cookies.get("rr-session")?.value;
    const token =
      existingCookie && /^[a-f0-9]{64}$/.test(existingCookie)
        ? existingCookie
        : randomBytes(32).toString("hex");
    const owner = createHash("sha256").update(token).digest("hex");
    release = acquireRequest(owner);
    if (!config.configured)
      throw new RescueError(
        "No AI model is configured. Set AI_MODEL on the server, or explicitly enable demo mode.",
        503,
      );
    const form = await readForm(request);
    const payload = form.get("payload");
    if (typeof payload !== "string" || payload.length > 25000)
      throw new RescueError(
        "The recipe could not be read. Keep the description and recipe text shorter.",
        400,
      );
    let json: unknown;
    try {
      json = JSON.parse(payload);
    } catch {
      throw new RescueError(
        "The recipe could not be read. Try submitting it again.",
        400,
      );
    }
    const input = requestSchema.parse(json);
    const file = form.get("image");
    let image: string | undefined;
    if (file !== null) {
      if (!(file instanceof File))
        throw new RescueError("The photo must be an uploaded image file.", 400);
      if (!config.images || "rescueId" in input)
        throw new RescueError(
          "Photo analysis is not available for this request. Remove the photo to continue.",
          400,
        );
      image = await prepareImage(file);
    }
    const result = await analyzeRescue(
      input,
      owner,
      getRepository(),
      openAICompatibleProvider(config),
      config.demo,
      image,
    );
    const response = NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
    response.cookies.set("rr-session", token, {
      httpOnly: true,
      secure: expectedOrigin.startsWith("https://"),
      sameSite: "strict",
      path: "/",
      maxAge: 86400,
    });
    return response;
  } catch (error) {
    let status = 500;
    let message =
      "We couldn’t process this rescue. Your recipe is still here; try again.";
    if (error instanceof RescueError) {
      status = error.status;
      message = error.message;
    } else if (error instanceof ZodError) {
      status = 400;
      message =
        "Some recipe details or server settings are invalid. Check the form and configuration.";
    }
    return NextResponse.json(
      { error: message },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
          ...(status === 429 ? { "Retry-After": "60" } : {}),
        },
      },
    );
  } finally {
    release?.();
  }
}
