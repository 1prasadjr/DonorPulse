import fs from "fs/promises";

export async function safeUnlink(filePath?: string): Promise<void> {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch {
    // Best-effort cleanup for temporary uploads.
  }
}
