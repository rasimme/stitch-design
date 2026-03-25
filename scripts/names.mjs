/**
 * names.mjs — Screen Alias Registry for Stitch Design skill.
 *
 * Provides persistent name-to-screenId mappings per Stitch project.
 * The Stitch API is the source of truth for screen data (title, HTML,
 * screenshots). This module only stores the local alias → screenId binding.
 *
 * State lives in: state/projects/<projectId>/names.json
 * Separate from runs/ (artifacts) — state ≠ artifacts.
 */

import { writeFile, readFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, '..', 'state', 'projects');

const SCHEMA_VERSION = 1;

// --- Slug validation ---

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

/**
 * Validate and normalize an alias to a slug.
 * Accepts: a-z, 0-9, hyphens. Case-insensitive (lowercased).
 * Rejects: spaces, special chars, leading/trailing hyphens.
 */
export function normalizeAlias(input) {
  const slug = input.toLowerCase().trim();
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      `Invalid alias "${input}". Use lowercase letters, numbers, and hyphens only (e.g. "concept-a", "home-v2").`
    );
  }
  if (slug.length > 64) {
    throw new Error(`Alias too long (max 64 chars): "${slug}"`);
  }
  return slug;
}

// --- File paths ---

function namesFilePath(projectId) {
  return join(STATE_DIR, projectId, 'names.json');
}

// --- Load / Save with atomic writes ---

/**
 * Load the names registry for a project.
 * Returns { version, project, names: { alias: { screenId, updatedAt, note? } } }
 */
export async function loadNames(projectId) {
  const fp = namesFilePath(projectId);
  if (!existsSync(fp)) {
    return { version: SCHEMA_VERSION, project: projectId, names: {} };
  }
  try {
    const raw = JSON.parse(await readFile(fp, 'utf8'));
    // Schema migration placeholder
    if (!raw.version || raw.version < SCHEMA_VERSION) {
      raw.version = SCHEMA_VERSION;
    }
    return raw;
  } catch {
    return { version: SCHEMA_VERSION, project: projectId, names: {} };
  }
}

/**
 * Save the names registry atomically (write to temp file, then rename).
 */
async function saveNames(projectId, data) {
  const fp = namesFilePath(projectId);
  const dir = dirname(fp);
  await mkdir(dir, { recursive: true });

  // Atomic write: temp file → rename
  const tmp = fp + '.' + randomBytes(4).toString('hex') + '.tmp';
  await writeFile(tmp, JSON.stringify(data, null, 2) + '\n');
  await rename(tmp, fp);
}

// --- Public API ---

/**
 * Set an alias for a screen ID.
 * @param {string} projectId
 * @param {string} alias — raw input, will be normalized
 * @param {string} screenId
 * @param {object} [opts] — { note, force }
 */
export async function setName(projectId, alias, screenId, opts = {}) {
  const slug = normalizeAlias(alias);
  const data = await loadNames(projectId);

  if (data.names[slug] && data.names[slug].screenId !== screenId && !opts.force) {
    throw new Error(
      `Alias "${slug}" already exists (screen ${data.names[slug].screenId}). Use --force to overwrite.`
    );
  }

  data.names[slug] = {
    screenId,
    updatedAt: new Date().toISOString(),
    ...(opts.note ? { note: opts.note } : {}),
  };

  await saveNames(projectId, data);
  return slug;
}

/**
 * Remove an alias.
 */
export async function removeName(projectId, alias) {
  const slug = normalizeAlias(alias);
  const data = await loadNames(projectId);

  if (!data.names[slug]) {
    throw new Error(`Alias "${slug}" not found in project ${projectId}.`);
  }

  delete data.names[slug];
  await saveNames(projectId, data);
  return slug;
}

/**
 * Rename an alias (old → new).
 */
export async function renameName(projectId, oldAlias, newAlias) {
  const oldSlug = normalizeAlias(oldAlias);
  const newSlug = normalizeAlias(newAlias);
  const data = await loadNames(projectId);

  if (!data.names[oldSlug]) {
    throw new Error(`Alias "${oldSlug}" not found.`);
  }
  if (data.names[newSlug]) {
    throw new Error(`Alias "${newSlug}" already exists.`);
  }

  data.names[newSlug] = { ...data.names[oldSlug], updatedAt: new Date().toISOString() };
  delete data.names[oldSlug];
  await saveNames(projectId, data);
  return { from: oldSlug, to: newSlug };
}

/**
 * Resolve an alias to a screen ID.
 * Returns { screenId, updatedAt, note? } or null.
 */
export async function resolveName(projectId, alias) {
  const slug = normalizeAlias(alias);
  const data = await loadNames(projectId);
  return data.names[slug] || null;
}

/**
 * List all aliases for a project.
 * Returns { alias: { screenId, updatedAt, note? } }
 */
export async function listNames(projectId) {
  const data = await loadNames(projectId);
  return data.names;
}
