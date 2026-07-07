/**
 * VMailx — LocalStorageProvider
 *
 * Phase 1 storage implementation using the local filesystem.
 * Stores files under STORAGE_PATH (defaults to ./uploads).
 * Replace with S3Provider in Phase 2 by updating lib/container.ts.
 */

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { StorageProvider, UploadOptions, UploadResult } from "../index";

export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string;

  constructor(config: { basePath: string }) {
    this.basePath = config.basePath;
  }

  async upload(
    buffer: Buffer,
    filename: string,
    options: UploadOptions
  ): Promise<UploadResult> {
    const storagePath = options.path ?? this.generatePath(filename);
    const absolutePath = path.join(this.basePath, storagePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    return {
      path: storagePath,
      // In local storage, the URL is an internal API route that serves the file
      url: `/api/attachments/${encodeURIComponent(storagePath)}`,
      sizeBytes: buffer.byteLength,
    };
  }

  async download(storagePath: string): Promise<Buffer> {
    const absolutePath = path.join(this.basePath, storagePath);
    return fs.readFile(absolutePath);
  }

  async delete(storagePath: string): Promise<void> {
    const absolutePath = path.join(this.basePath, storagePath);
    await fs.unlink(absolutePath).catch(() => {
      // Ignore file-not-found errors during cleanup
    });
  }

  async getSignedUrl(storagePath: string, expiresInSeconds: number): Promise<string> {
    // For local storage, generate a time-limited token
    const expiry = Date.now() + expiresInSeconds * 1000;
    const token = crypto
      .createHmac("sha256", process.env.ENCRYPTION_KEY ?? "dev-secret")
      .update(`${storagePath}:${expiry}`)
      .digest("hex");

    return `/api/attachments/${encodeURIComponent(storagePath)}?token=${token}&expires=${expiry}`;
  }

  private generatePath(filename: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const id = crypto.randomUUID();
    const ext = path.extname(filename);
    const base = path.basename(filename, ext)
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()
      .slice(0, 40);
    return `${year}/${month}/${id}-${base}${ext}`;
  }
}
