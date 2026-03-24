#!/usr/bin/env node
/**
 * stitch.mjs — CLI wrapper for Google Stitch SDK
 * Uses raw MCP tool calls because the SDK wrapper classes
 * don't match the actual API response structure.
 */

import { stitch } from '@google/stitch-sdk';
import { join } from 'node:path';
import {
  RUNS_DIR, makeRunDir, downloadFile, saveLatest, loadLatest,
  saveScreenArtifacts, saveResult, resolveUrl,
} from './artifacts.mjs';

// --- Helpers ---

function die(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function ok(data) {
  console.log(JSON.stringify({ ok: true, ...data }, null, 2));
}

function parseArgs(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      flags[key] = val;
    } else {
      positional.push(args[i]);
    }
  }
  return { flags, positional };
}

// --- Argument Parsing ---

function resolveDevice(flag) {
  if (!flag) return undefined;
  const map = { desktop: 'DESKTOP', mobile: 'MOBILE', tablet: 'TABLET', agnostic: 'AGNOSTIC' };
  return map[flag.toLowerCase()] || die(`Unknown device: ${flag}`);
}

function resolveModel(flag) {
  if (!flag) return undefined;
  const map = { pro: 'GEMINI_3_1_PRO', flash: 'GEMINI_3_FLASH' };
  return map[flag.toLowerCase()] || die(`Unknown model: ${flag}`);
}

function resolveRange(flag) {
  if (!flag) return 'EXPLORE';
  const map = { refine: 'REFINE', explore: 'EXPLORE', reimagine: 'REIMAGINE' };
  return map[flag.toLowerCase()] || die(`Unknown range: ${flag}`);
}

function resolveAspects(flag) {
  if (!flag) return undefined;
  const valid = ['LAYOUT', 'COLOR_SCHEME', 'IMAGES', 'TEXT_FONT', 'TEXT_CONTENT'];
  return flag.split(',').map(a => {
    const upper = a.trim().toUpperCase();
    if (!valid.includes(upper)) die(`Unknown aspect: ${a}. Use: ${valid.join(', ')}`);
    return upper;
  });
}



async function resolveProjectId(flags) {
  if (flags.project) return flags.project;
  const latest = await loadLatest();
  if (latest?.projectId) return latest.projectId;
  die('No --project given and no latest-screen.json. Specify --project <id>.');
}

/** Extract screen ID from name like "projects/123/screens/abc" */
function extractScreenId(screen) {
  if (screen.id) return screen.id;
  if (screen.name) {
    const parts = screen.name.split('/');
    return parts[parts.length - 1];
  }
  return null;
}

async function cleanup() {
  try { await stitch.close(); } catch {}
}

/**
 * Robust tool call wrapper.
 * 
 * The Stitch MCP server uses SSE streaming. Long operations (generate, edit, variants)
 * can take 2-5 minutes. The TCP connection often drops before completion, causing
 * callTool to throw — but the server-side operation may still succeed.
 * 
 * Strategy (per SDK docs: "DO NOT RETRY, use get_screen if connection fails"):
 * 1. Call the tool
 * 2. If it succeeds → extract screen from response
 * 3. If it fails with a connection error → poll list_screens to find the new screen
 */
async function callToolRobust(toolName, args, projectId) {
  try {
    const raw = await stitch.callTool(toolName, args);
    const screen = raw?.outputComponents?.[0]?.design?.screens?.[0];
    if (screen) return screen;
    // Response came back but no screen — try recovery
    console.error(`⚠️ No screen in response, attempting recovery via list_screens...`);
  } catch (err) {
    console.error(`⚠️ Connection error during ${toolName}: ${err.message}`);
    console.error(`   Attempting recovery via list_screens (server may still be processing)...`);
  }

  // Recovery: poll list_screens for a new screen that appeared after our call
  // Wait a bit for the server to finish processing
  for (let attempt = 1; attempt <= 6; attempt++) {
    const waitSec = attempt <= 3 ? 30 : 60;
    console.error(`   Recovery attempt ${attempt}/6 — waiting ${waitSec}s...`);
    await new Promise(r => setTimeout(r, waitSec * 1000));

    try {
      const listRaw = await stitch.callTool('list_screens', { projectId });
      const screens = listRaw?.screens || [];
      if (screens.length > 0) {
        // Get the most recently created screen 
        const latest = screens[screens.length - 1];
        const screenId = extractScreenId(latest);
        if (screenId) {
          console.error(`   ✅ Found screen via recovery: ${screenId}`);
          // Fetch full screen data
          const full = await stitch.callTool('get_screen', {
            projectId, screenId,
            name: `projects/${projectId}/screens/${screenId}`,
          });
          return full;
        }
      }
    } catch (pollErr) {
      console.error(`   Recovery poll failed: ${pollErr.message}`);
    }
  }

  die(`${toolName} failed and recovery could not find the screen. The operation may still be processing — check stitch.withgoogle.com.`);
}

// --- Commands ---

async function cmdProjects() {
  const raw = await stitch.callTool('list_projects', {});
  const projects = raw.projects || [];
  ok({
    count: projects.length,
    projects: projects.map(p => ({
      id: p.name?.split('/').pop() || p.id,
      title: p.title || '(untitled)',
    })),
  });
}

async function cmdCreate(title) {
  if (!title) die('Usage: create "Project Title"');
  const raw = await stitch.callTool('create_project', { title });
  const id = raw.name?.split('/').pop() || raw.id;
  ok({ projectId: id, title });
  console.error(`✅ Project "${title}" created: ${id}`);
}

async function cmdInfo(projectId) {
  if (!projectId) die('Usage: info <project-id>');
  const projectRaw = await stitch.callTool('get_project', { name: `projects/${projectId}` });
  const screenRaw = await stitch.callTool('list_screens', { projectId });
  const screens = screenRaw.screens || [];
  ok({
    projectId,
    title: projectRaw.title || '(untitled)',
    screenCount: screens.length,
    screens: screens.map(s => ({
      id: extractScreenId(s),
      title: s.title || s.name || '(unnamed)',
    })),
  });
}

async function cmdGenerate(projectId, prompt, flags) {
  if (!projectId || !prompt) die('Usage: generate <project-id> "prompt" [--device desktop] [--model pro]');

  const args = { projectId, prompt };
  const device = resolveDevice(flags.device);
  const model = resolveModel(flags.model);
  if (device) args.deviceType = device;
  if (model) args.modelId = model;

  console.error(`🎨 Generating screen... (this may take 1-5 minutes)`);
  const screen = await callToolRobust('generate_screen_from_text', args, projectId);

  const screenId = extractScreenId(screen);
  const runDir = await makeRunDir('generate', prompt);
  const artifacts = await saveScreenArtifacts(runDir, screen);

  await saveResult(runDir, {
    projectId, screenId, prompt, device: device || 'default', model: model || 'default',
    title: screen.title, width: screen.width, height: screen.height,
    screenshotUrl: resolveUrl(screen.screenshot), htmlUrl: resolveUrl(screen.htmlCode),
    timestamp: new Date().toISOString(),
  });
  artifacts.push('result.json');

  await saveLatest(projectId, screenId, 'generate');

  ok({ projectId, screenId, prompt, runDir, artifacts });
  console.error(`✅ Screen generated: ${screenId}`);
  console.error(`📁 Artifacts: ${runDir}`);
}

async function cmdEdit(screenId, prompt, flags) {
  if (!screenId || !prompt) die('Usage: edit <screen-id> "prompt" [--project <id>]');
  const projectId = await resolveProjectId(flags);

  const args = { projectId, prompt, selectedScreenIds: [screenId] };
  const device = resolveDevice(flags.device);
  const model = resolveModel(flags.model);
  if (device) args.deviceType = device;
  if (model) args.modelId = model;

  console.error(`✏️ Editing screen... (this may take 1-5 minutes)`);
  const screen = await callToolRobust('edit_screens', args, projectId);

  const newScreenId = extractScreenId(screen);
  const runDir = await makeRunDir('edit', prompt);
  const artifacts = await saveScreenArtifacts(runDir, screen);

  await saveResult(runDir, {
    projectId, screenId: newScreenId, originalScreenId: screenId, prompt,
    title: screen.title, timestamp: new Date().toISOString(),
  });
  artifacts.push('result.json');

  await saveLatest(projectId, newScreenId, 'edit');

  ok({ projectId, screenId: newScreenId, originalScreenId: screenId, prompt, runDir, artifacts });
  console.error(`✅ Screen edited: ${newScreenId}`);
  console.error(`📁 Artifacts: ${runDir}`);
}

async function cmdVariants(screenId, prompt, flags) {
  if (!screenId || !prompt) die('Usage: variants <screen-id> "prompt" [--project <id>] [--count 3] [--range explore]');
  const projectId = await resolveProjectId(flags);

  const count = parseInt(flags.count || '3', 10);
  if (isNaN(count) || count < 1 || count > 5) die('--count must be between 1 and 5');
  const variantOptions = {
    variantCount: count,
    creativeRange: resolveRange(flags.range),
  };
  const aspects = resolveAspects(flags.aspects);
  if (aspects) variantOptions.aspects = aspects;

  const args = { projectId, prompt, selectedScreenIds: [screenId], variantOptions };
  const device = resolveDevice(flags.device);
  const model = resolveModel(flags.model);
  if (device) args.deviceType = device;
  if (model) args.modelId = model;

  console.error(`🔀 Generating ${variantOptions.variantCount} variants (${variantOptions.creativeRange})...`);
  
  // Variants returns multiple screens — use robust wrapper for the first, then extract all
  let screens;
  try {
    const raw = await stitch.callTool('generate_variants', args);
    screens = raw?.outputComponents?.[0]?.design?.screens || [];
  } catch (err) {
    console.error(`⚠️ Connection error during variants: ${err.message}`);
    console.error(`   Variants recovery is limited — checking list_screens...`);
    // For variants, recovery is harder since we don't know which screens are new
    // Best effort: return whatever we find
    screens = [];
  }
  if (screens.length === 0) die('No variants in API response. The operation may still be processing — check stitch.withgoogle.com.');

  const runDir = await makeRunDir('variants', prompt);
  const allArtifacts = [];
  const variants = [];

  for (let i = 0; i < screens.length; i++) {
    const s = screens[i];
    const vid = extractScreenId(s);
    const arts = await saveScreenArtifacts(runDir, s, i);
    allArtifacts.push(...arts);
    variants.push({ index: i + 1, screenId: vid, title: s.title });
  }

  await saveResult(runDir, {
    projectId, originalScreenId: screenId, prompt, variantOptions,
    variants: variants.map(v => ({ ...v })),
    timestamp: new Date().toISOString(),
  });
  allArtifacts.push('result.json');

  if (variants.length > 0) {
    await saveLatest(projectId, variants[0].screenId, 'variants');
  }

  ok({ projectId, originalScreenId: screenId, prompt, variantCount: variants.length, runDir, variants, artifacts: allArtifacts });
  console.error(`✅ ${variants.length} variants generated`);
  console.error(`📁 Artifacts: ${runDir}`);
}

async function cmdExport(screenId, flags) {
  if (!screenId) die('Usage: export <screen-id> [--project <id>]');
  const projectId = await resolveProjectId(flags);

  const raw = await stitch.callTool('get_screen', {
    projectId, screenId, name: `projects/${projectId}/screens/${screenId}`,
  });

  const runDir = await makeRunDir('export', screenId);
  const artifacts = await saveScreenArtifacts(runDir, raw);

  await saveResult(runDir, {
    projectId, screenId, title: raw.title,
    timestamp: new Date().toISOString(),
  });
  artifacts.push('result.json');

  ok({ projectId, screenId, runDir, artifacts });
  console.error(`✅ Export: ${runDir}`);
}

async function cmdHtml(screenId, flags) {
  if (!screenId) die('Usage: html <screen-id> [--project <id>]');
  const projectId = await resolveProjectId(flags);

  const raw = await stitch.callTool('get_screen', {
    projectId, screenId, name: `projects/${projectId}/screens/${screenId}`,
  });

  const htmlUrl = resolveUrl(raw.htmlCode);
  if (!htmlUrl) die('No HTML code in screen data');
  const runDir = await makeRunDir('html', screenId);
  await downloadFile(htmlUrl, join(runDir, 'screen.html'));

  ok({ projectId, screenId, runDir, artifacts: ['screen.html'] });
  console.error(`✅ HTML saved: ${runDir}/screen.html`);
}

async function cmdImage(screenId, flags) {
  if (!screenId) die('Usage: image <screen-id> [--project <id>]');
  const projectId = await resolveProjectId(flags);

  const raw = await stitch.callTool('get_screen', {
    projectId, screenId, name: `projects/${projectId}/screens/${screenId}`,
  });

  const imgUrl = resolveUrl(raw.screenshot);
  if (!imgUrl) die('No screenshot in screen data');
  const runDir = await makeRunDir('image', screenId);
  await downloadFile(imgUrl, join(runDir, 'screen.png'));

  ok({ projectId, screenId, runDir, artifacts: ['screen.png'] });
  console.error(`✅ Image saved: ${runDir}/screen.png`);
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(`Usage: stitch.mjs <command> [args] [--flags]

Commands:
  projects                          List all projects
  create "title"                    Create a new project
  info <project-id>                 Show project details + screens
  generate <project-id> "prompt"    Generate a new screen
  edit <screen-id> "prompt"         Edit an existing screen
  variants <screen-id> "prompt"     Generate design variants
  html <screen-id>                  Download HTML code
  image <screen-id>                 Download screenshot
  export <screen-id>                Download HTML + screenshot

Flags:
  --device desktop|mobile|tablet    Device type (default: SDK default)
  --model pro|flash                 Model (default: SDK default)
  --project <id>                    Project ID (auto from latest-screen.json)
  --count 1-5                       Number of variants (default: 3)
  --range refine|explore|reimagine  Creative range (default: explore)
  --aspects layout,color_scheme     Variant aspects to change`);
    process.exit(1);
  }

  const command = args[0];
  const { flags, positional } = parseArgs(args.slice(1));

  try {
    switch (command) {
      case 'projects': return await cmdProjects();
      case 'create': return await cmdCreate(positional[0]);
      case 'info': return await cmdInfo(positional[0]);
      case 'generate': return await cmdGenerate(positional[0], positional[1], flags);
      case 'edit': return await cmdEdit(positional[0], positional[1], flags);
      case 'variants': return await cmdVariants(positional[0], positional[1], flags);
      case 'html': return await cmdHtml(positional[0], flags);
      case 'image': return await cmdImage(positional[0], flags);
      case 'export': return await cmdExport(positional[0], flags);
      default: die(`Unknown command: ${command}`);
    }
  } catch (err) {
    if (err.code || err.status) {
      die(`Stitch API: ${err.message}`);
    }
    throw err;
  } finally {
    await cleanup();
  }
}

main();
