/**
 * download.mjs — HTTP download helper for Stitch Design skill.
 * Handles URL-to-file downloads (network → disk, never the reverse).
 */

import { writeFile } from 'node:fs/promises';

const PNG_SIG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

/** Returns true if the buffer starts with the PNG magic bytes */
export function isPngBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 8 && PNG_SIG.every((b, i) => buf[i] === b);
}

/** Download a URL to a local file. Throws if the server returns HTML or JSON instead of a binary file. */
export async function downloadFile(url, dest) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
  const ct = resp.headers.get('content-type') || '';
  if (ct.startsWith('text/html') || ct.startsWith('application/json')) {
    throw new Error(`CDN returned HTML instead of image (URL may be expired)`);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  await writeFile(dest, buf);
}

/**
 * Download a screenshot with automatic URL refresh on failure.
 *
 * If the first download attempt returns HTML (expired CDN token), fetches a
 * fresh screenshotUrl via getScreen() and tries once more. Checks both the
 * Content-Type header and PNG magic bytes.
 *
 * @param {string} url - Initial download URL (hires)
 * @param {string} dest - Destination file path
 * @param {{ projectId: string, screenId: string, getScreen: Function, resolveUrl: Function }} opts
 * @returns {Promise<{ ok: boolean, url: string|null }>}
 */
export async function downloadScreenshotWithRefresh(url, dest, { projectId, screenId, getScreen, resolveUrl }) {
  const tryFetch = async (u) => {
    const resp = await fetch(u);
    if (!resp.ok) throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
    const ct = resp.headers.get('content-type') || '';
    if (ct.startsWith('text/html') || ct.startsWith('application/json')) {
      throw new Error(`CDN returned HTML instead of image (URL may be expired)`);
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (!isPngBuffer(buf)) throw new Error(`CDN returned HTML instead of image (URL may be expired)`);
    await writeFile(dest, buf);
    return u;
  };

  // First attempt with the provided URL
  try {
    const finalUrl = await tryFetch(url);
    return { ok: true, url: finalUrl };
  } catch {}

  // URL may be expired — fetch a fresh screenshotUrl from the API
  try {
    const fresh = await getScreen({ projectId, screenId });
    const rawUrl = resolveUrl(fresh?.screenshot);
    if (!rawUrl) throw new Error('No screenshot URL in refreshed screen data');
    const freshUrl = rawUrl + '=w780';
    const finalUrl = await tryFetch(freshUrl);
    return { ok: true, url: finalUrl };
  } catch {}

  return { ok: false, url: null };
}
