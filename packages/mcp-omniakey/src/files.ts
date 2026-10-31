import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import type { MediaAsset, OmniaKeyClient } from "./client.js";

// An allowlist keeps a prompt-injected path such as ~/.ssh/id_rsa from being uploaded.
const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
};

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/mp4": ".m4a",
};

/** Keeps URLs and data URIs as they are and inlines local media files as data URIs. */
export async function resolveMediaSource(source: string): Promise<string> {
  if (/^(https?:|data:)/i.test(source)) return source;

  const mimeType = MIME_BY_EXTENSION[extname(source).toLowerCase()];
  if (!mimeType) {
    throw new Error(`Unsupported media file "${source}". Allowed: ${Object.keys(MIME_BY_EXTENSION).join(", ")}.`);
  }
  const content = await readFile(resolve(source));
  return `data:${mimeType};base64,${content.toString("base64")}`;
}

export interface SavedAsset {
  path: string;
  mime_type: string | undefined;
  byte_size: number;
}

/** Downloads one asset, verifies its checksum and only then writes it to disk. */
export async function saveAsset(
  client: OmniaKeyClient,
  asset: MediaAsset,
  fallbackName: string,
  outputDir: string,
): Promise<SavedAsset> {
  const content = await client.downloadAsset(asset.url);

  if (asset.sha256) {
    const actual = createHash("sha256").update(content).digest("hex");
    if (actual !== asset.sha256) {
      throw new Error(`Checksum mismatch for ${asset.asset_id ?? fallbackName}. The file was not saved.`);
    }
  }

  // The name comes from the API, so path separators are stripped before it touches the disk.
  const baseName = (asset.asset_id ?? fallbackName).replace(/[^\w.-]/g, "_");
  const extension = EXTENSION_BY_MIME[asset.mime_type ?? ""] ?? ".bin";
  const directory = resolve(outputDir);
  const path = join(directory, `${baseName}${extension}`);

  await mkdir(directory, { recursive: true });
  await writeFile(path, content);
  return { path, mime_type: asset.mime_type, byte_size: content.length };
}
