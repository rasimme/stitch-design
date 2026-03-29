/**
 * design-system.mjs — Design system file reader for Stitch Design skill.
 * Handles local file I/O for the --design-system flag (separation of concerns).
 */

import { readFile } from 'node:fs/promises';

/**
 * Append design system file content to prompt if --design-system flag is set.
 * @param {string} prompt - The original prompt
 * @param {object} flags - Parsed CLI flags
 * @param {function} die - Error handler (exits process)
 * @returns {Promise<string>} prompt with design system appended
 */
export async function applyDesignSystem(prompt, flags, die) {
  if (!flags['design-system']) return prompt;
  if (flags['design-system'] === true) die('--design-system requires a file path');
  let content;
  try {
    content = await readFile(flags['design-system'], 'utf-8');
  } catch (err) {
    die(`--design-system: cannot read ${flags['design-system']}: ${err.message}`);
  }
  return prompt + '\n\n--- Design System ---\n' + content + '\n\nDo NOT create or modify any design system.';
}
