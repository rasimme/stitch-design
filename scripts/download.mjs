/**
 * download.mjs — HTTP download helper for Stitch Design skill.
 * Handles URL-to-file downloads (network → disk, never the reverse).
 */

import { writeFile } from 'node:fs/promises';

/** Download a URL to a local file */
export async function downloadFile(url, dest) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  await writeFile(dest, buf);
}
