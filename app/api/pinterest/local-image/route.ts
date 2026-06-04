import { readFile } from "node:fs/promises";
import path from "node:path";

const PINTEREST_ROOT = path.win32.normalize(String.raw`D:\Edifice_IA\projets\Pinterest`);
const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export const dynamic = "force-dynamic";

function isAllowedPath(filePath: string) {
  const normalizedPath = path.win32.normalize(filePath);
  const extension = path.win32.extname(normalizedPath).toLowerCase();

  return (
    normalizedPath.startsWith(`${PINTEREST_ROOT}\\`) &&
    Object.prototype.hasOwnProperty.call(IMAGE_CONTENT_TYPES, extension)
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawPath = url.searchParams.get("path");

  if (!rawPath) {
    return new Response("Missing image path", { status: 400 });
  }

  const filePath = decodeURIComponent(rawPath);

  if (!isAllowedPath(filePath)) {
    return new Response("Image path not allowed", { status: 403 });
  }

  try {
    const normalizedPath = path.win32.normalize(filePath);
    const image = await readFile(normalizedPath);
    const contentType =
      IMAGE_CONTENT_TYPES[path.win32.extname(normalizedPath).toLowerCase()] ??
      "application/octet-stream";

    return new Response(image, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Type": contentType,
      },
    });
  } catch {
    return new Response("Image not found", { status: 404 });
  }
}
