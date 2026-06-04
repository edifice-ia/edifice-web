import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const pinterestRoot =
  process.env.PINTEREST_LOCAL_PROJECT_DIR || String.raw`D:\Edifice_IA\projets\Pinterest`;
const snapshotPath = path.resolve("data", "pinterest", "pinterest_snapshot.json");

const accounts = [
  {
    id: "edifice_discipline",
    name: "Édifice Discipline",
    niche: "discipline, productivité, habitudes",
  },
  {
    id: "solution_sommeil",
    name: "Solution Sommeil",
    niche: "sommeil, relaxation, routine du soir",
  },
];

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function splitCsvRecords(content) {
  const records = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += character;
      current += nextCharacter;
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (current.trim()) {
        records.push(current);
      }
      current = "";
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      continue;
    }

    current += character;
  }

  if (current.trim()) {
    records.push(current);
  }

  return records;
}

function parseCsv(content) {
  const records = splitCsvRecords(content.replace(/^\uFEFF/, ""));
  const [headerLine, ...dataLines] = records;

  if (!headerLine) {
    return [];
  }

  const headers = splitCsvLine(headerLine);
  return dataLines.map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

async function readCsv(filePath) {
  try {
    return parseCsv(await readFile(filePath, "utf-8"));
  } catch {
    return [];
  }
}

async function listImages(dirPath) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .filter((entry) => /\.(png|jpe?g|webp)$/i.test(entry.name))
      .map((entry) => path.win32.join(dirPath, entry.name))
      .sort();
  } catch {
    return [];
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "fr"),
  );
}

async function buildAccountSnapshot(account) {
  const accountDir = path.win32.join(pinterestRoot, account.id);
  const sources = {
    posts_queue: path.win32.join(accountDir, "posts_queue.csv"),
    posts_with_visuals: path.win32.join(accountDir, "posts_with_visuals.csv"),
    final_pins_index: path.win32.join(accountDir, "final_pins_index.csv"),
    publishing_queue: path.win32.join(accountDir, "publishing_queue.csv"),
    visuals_index: path.win32.join(accountDir, "visuals_index.csv"),
    pins_ready_dir: path.win32.join(accountDir, "PINS_READY"),
    visuals_dir: path.win32.join(accountDir, "VISUALS"),
    visuals_sorted_dir: path.win32.join(accountDir, "VISUALS_SORTED"),
  };

  const [postsQueue, postsWithVisuals, finalPinsIndex, publishingQueue, visualsIndex, readyImages] =
    await Promise.all([
      readCsv(sources.posts_queue),
      readCsv(sources.posts_with_visuals),
      readCsv(sources.final_pins_index),
      readCsv(sources.publishing_queue),
      readCsv(sources.visuals_index),
      listImages(sources.pins_ready_dir),
    ]);

  const boards = unique([
    ...postsQueue.map((row) => row.board_name),
    ...postsWithVisuals.map((row) => row.board_name),
    ...finalPinsIndex.map((row) => row.board_name),
    ...publishingQueue.map((row) => row.board_name),
  ]);

  return {
    ...account,
    sources,
    stats: {
      posts_queue: postsQueue.length,
      posts_with_visuals: postsWithVisuals.length,
      final_pins: finalPinsIndex.length,
      publishing_queue: publishingQueue.length,
      ready_to_publish: publishingQueue.filter(
        (row) => row.publish_status === "ready_to_publish",
      ).length,
      dry_run: publishingQueue.filter((row) => row.publish_status === "dry_run").length,
      images_ready: readyImages.length,
      visuals_index: visualsIndex.length,
    },
    boards,
    images: {
      pins_ready: readyImages,
    },
    posts_queue: postsQueue,
    posts_with_visuals: postsWithVisuals,
    final_pins_index: finalPinsIndex,
    publishing_queue: publishingQueue,
  };
}

const accountSnapshots = await Promise.all(accounts.map(buildAccountSnapshot));
const totals = accountSnapshots.reduce(
  (currentTotals, account) => ({
    posts_queue: currentTotals.posts_queue + account.stats.posts_queue,
    posts_with_visuals:
      currentTotals.posts_with_visuals + account.stats.posts_with_visuals,
    final_pins: currentTotals.final_pins + account.stats.final_pins,
    publishing_queue: currentTotals.publishing_queue + account.stats.publishing_queue,
    ready_to_publish: currentTotals.ready_to_publish + account.stats.ready_to_publish,
    dry_run: currentTotals.dry_run + account.stats.dry_run,
    images_ready: currentTotals.images_ready + account.stats.images_ready,
  }),
  {
    posts_queue: 0,
    posts_with_visuals: 0,
    final_pins: 0,
    publishing_queue: 0,
    ready_to_publish: 0,
    dry_run: 0,
    images_ready: 0,
  },
);

const snapshot = {
  synced_at: new Date().toISOString(),
  accounts: accountSnapshots,
  totals,
};

await mkdir(path.dirname(snapshotPath), { recursive: true });
await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");

console.log(`Pinterest snapshot written: ${snapshotPath}`);
for (const account of accountSnapshots) {
  console.log(
    `${account.id}: ${account.stats.posts_queue} posts, ${account.stats.final_pins} pins, ${account.stats.ready_to_publish} ready`,
  );
}
