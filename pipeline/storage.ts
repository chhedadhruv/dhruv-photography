import fs from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import type { ImageFormat } from "@/lib/images";

/**
 * Where derivatives get written.
 *
 * Two implementations behind one interface: Cloudflare R2 for real use, and the local
 * `public/images` directory for `--local`. The local one exists so the whole site can be
 * run end-to-end before any cloud account is set up -- the pipeline and the pages can be
 * verified independently of credentials.
 */

export interface Storage {
  readonly describe: string;
  put(key: string, body: Buffer, format: ImageFormat): Promise<void>;
}

const CONTENT_TYPES: Record<ImageFormat, string> = {
  avif: "image/avif",
  webp: "image/webp",
};

export const LOCAL_IMAGE_DIR = path.join(process.cwd(), "public", "images");

export function createLocalStorage(): Storage {
  return {
    describe: `local directory public/images`,
    async put(key, body) {
      const destination = path.join(LOCAL_IMAGE_DIR, key);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, body);
    },
  };
}

/** Reads a required env var, naming it clearly when absent. */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in your R2 credentials, or run with --local to write to public/images instead.`,
    );
  }
  return value;
}

export function createR2Storage(): Storage {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const bucket = requireEnv("R2_BUCKET");

  const client = new S3Client({
    // R2 is S3-compatible but has no regions; "auto" is what Cloudflare documents.
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });

  return {
    describe: `R2 bucket "${bucket}"`,
    async put(key, body, format) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: CONTENT_TYPES[format],
          // Derivatives are immutable: a given slug and width always means the same bytes,
          // because re-editing a photo produces a new ingest. So they can be cached
          // effectively forever, which is what makes the CDN do the work.
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    },
  };
}
