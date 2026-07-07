/**
 * VMailx — StorageProvider Interface
 *
 * Abstracts file storage. Phase 1: LocalStorageProvider.
 * Phase 2: swap in S3-compatible provider (R2, MinIO, S3) without changing service code.
 */

export interface UploadOptions {
  /** Override the generated storage path */
  path?: string;
  /** Content-Type / MIME type */
  mimeType: string;
  /** Max allowed size in bytes (provider should reject if exceeded) */
  maxBytes?: number;
}

export interface UploadResult {
  /** Stable storage path / key — store this in DB */
  path: string;
  /** Public or signed URL valid for the current request (if applicable) */
  url: string;
  sizeBytes: number;
}

export interface StorageProvider {
  /**
   * Upload a file buffer to storage.
   * Returns the storage path and an accessible URL.
   */
  upload(
    buffer: Buffer,
    filename: string,
    options: UploadOptions
  ): Promise<UploadResult>;

  /**
   * Download a file by its storage path.
   */
  download(path: string): Promise<Buffer>;

  /**
   * Delete a file by its storage path.
   */
  delete(path: string): Promise<void>;

  /**
   * Generate a time-limited signed URL for direct client download.
   * For local storage this may be an authenticated API route.
   */
  getSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
}
