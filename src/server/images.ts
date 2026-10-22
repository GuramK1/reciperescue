import sharp from "sharp";
import { RescueError } from "./errors";

export const maxImageBytes = 5 * 1024 * 1024;
export async function prepareImage(file: File): Promise<string> {
  const formats: Record<string, string> = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (!formats[file.type] || file.size === 0 || file.size > maxImageBytes)
    throw new RescueError("Choose a JPG, PNG, or WebP image up to 5 MB.", 400);
  try {
    const input = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 16_000_000,
      animated: false,
    });
    const metadata = await input.metadata();
    if (metadata.format !== formats[file.type] || (metadata.pages ?? 1) > 1)
      throw new Error("Invalid format");
    const jpeg = await input
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    throw new RescueError(
      "That image couldn’t be read. Choose a valid, non-animated image under 16 megapixels.",
      400,
    );
  }
}
