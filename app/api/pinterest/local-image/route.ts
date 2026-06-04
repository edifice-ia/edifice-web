import { readFile } from "node:fs/promises";
import path from "node:path";

const PINTEREST_ROOT = path.win32.normalize(String.raw`D:\Edifice_IA\projets\Pinterest`);
const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "data",
  "pinterest",
  "pinterest_snapshot.json",
);
const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export const dynamic = "force-dynamic";

type SnapshotRow = Record<string, string>;

type SnapshotAccount = {
  id: string;
  publishing_queue?: SnapshotRow[];
  final_pins_index?: SnapshotRow[];
  posts_with_visuals?: SnapshotRow[];
};

type PinterestSnapshot = {
  accounts?: SnapshotAccount[];
};

const imagePathFields = [
  "image_path",
  "visual_path",
  "image_file",
  "thumbnail",
  "image_url",
  "final_pin_path",
  "selected_visual_path",
  "final_pin_filename",
  "selected_visual_filename",
];

function isAllowedPath(filePath: string) {
  const normalizedPath = path.win32.normalize(filePath);
  const extension = path.win32.extname(normalizedPath).toLowerCase();

  return (
    normalizedPath.startsWith(`${PINTEREST_ROOT}\\`) &&
    Object.prototype.hasOwnProperty.call(IMAGE_CONTENT_TYPES, extension)
  );
}

function normalizeImagePath(filePath: string) {
  if (/^[A-Za-z]:[\\/]/.test(filePath)) {
    return path.win32.normalize(filePath);
  }

  return path.win32.normalize(path.win32.join(PINTEREST_ROOT, filePath));
}

function firstImagePath(...rows: Array<SnapshotRow | undefined>) {
  for (const row of rows) {
    if (!row) {
      continue;
    }

    for (const field of imagePathFields) {
      const value = row[field]?.trim();
      if (value && !value.startsWith("http")) {
        return value;
      }
    }
  }

  return "";
}

async function resolveImagePathById(id: string) {
  const [accountId, postId] = id.split(":");

  if (!accountId || !postId) {
    return "";
  }

  try {
    const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf-8")) as PinterestSnapshot;
    const account = snapshot.accounts?.find((currentAccount) => currentAccount.id === accountId);

    if (!account) {
      return "";
    }

    const matchesPost = (row: SnapshotRow) => row.post_id === postId;

    return firstImagePath(
      account.publishing_queue?.find(matchesPost),
      account.final_pins_index?.find(matchesPost),
      account.posts_with_visuals?.find(matchesPost),
    );
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const imageId = url.searchParams.get("id");
  const rawPath = url.searchParams.get("path");
  const resolvedPath = imageId ? await resolveImagePathById(imageId) : rawPath;

  if (!resolvedPath) {
    return new Response("Missing image path", { status: 400 });
  }

  const filePath = normalizeImagePath(resolvedPath);

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
