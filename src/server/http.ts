import { RescueError } from "./errors";

export const maxRequestBytes = 6 * 1024 * 1024;
export async function readForm(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data;"))
    throw new RescueError("Submit the recipe using the form.", 415);
  const size = Number(request.headers.get("content-length") || 0);
  if (size > maxRequestBytes)
    throw new RescueError(
      "This upload is too large. Choose an image up to 5 MB.",
      413,
    );
  const reader = request.body?.getReader();
  if (!reader) throw new RescueError("The recipe was empty.", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maxRequestBytes)
        throw new RescueError(
          "This upload is too large. Choose an image up to 5 MB.",
          413,
        );
      chunks.push(value);
    }
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": contentType },
    }).formData();
  } catch (error) {
    if (error instanceof RescueError) throw error;
    throw new RescueError(
      "The upload could not be read. Try submitting the recipe again.",
      400,
    );
  } finally {
    // Cancelling an already-failed stream must not replace the upload error.
    await reader.cancel().catch(() => {});
  }
}

// shortcut: quotas apply per process, add shared authenticated limits before public hosting.
const buckets = new Map<string, { count: number; expires: number }>();
let active = 0;
export function acquireRequest(owner: string): () => void {
  const now = Date.now();
  for (const [key, value] of buckets)
    if (value.expires <= now) buckets.delete(key);
  const bucket = buckets.get(owner) ?? { count: 0, expires: now + 60000 };
  if (bucket.count >= 10 || active >= 4 || buckets.size >= 10000)
    throw new RescueError(
      "Too many requests. Wait a minute, then try again.",
      429,
    );
  bucket.count++;
  buckets.set(owner, bucket);
  active++;
  return () => {
    active--;
  };
}
