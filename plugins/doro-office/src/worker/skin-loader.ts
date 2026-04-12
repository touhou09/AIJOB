import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import type { Dirent } from 'node:fs';
import type { DororongVisualState, SkinCatalog, SkinMetadata, SkinStateAssets } from '../shared/types';

const BUILTIN_SKIN_ID = 'dororong';
const BUILTIN_SKIN: SkinMetadata = {
  id: BUILTIN_SKIN_ID,
  name: '도로롱',
  source: 'builtin',
  manifestPath: null,
  directoryPath: null,
  stateAssets: {},
  availableStates: ['idle', 'working', 'error', 'sleeping'],
  description: '기본 번들 스킨',
};

const VALID_VISUAL_STATES: readonly DororongVisualState[] = ['idle', 'working', 'error', 'sleeping'];

type ReadDirFn = typeof readdir;
type ReadFileFn = typeof readFile;
type RealpathFn = typeof realpath;
type StatFn = typeof stat;

type SkinManifest = {
  id: string;
  name: string;
  author?: string;
  description?: string;
  states: SkinStateAssets;
};

type LoadAvailableSkinsOptions = {
  homeDir?: string;
  rootDir?: string;
  readdirFn?: ReadDirFn;
  readFileFn?: ReadFileFn;
  realpathFn?: RealpathFn;
  statFn?: StatFn;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function startsWithinPath(parentPath: string, candidatePath: string) {
  return candidatePath === parentPath || candidatePath.startsWith(`${parentPath}${sep}`);
}

function formatWarning(manifestPath: string, message: string) {
  return `${manifestPath}: ${message}`;
}

async function ensureRegularFile(filePath: string, statFn: StatFn) {
  const fileStat = await statFn(filePath);
  return fileStat.isFile();
}

async function parseManifest(manifestPath: string, readFileFn: ReadFileFn): Promise<SkinManifest> {
  const rawManifest = await readFileFn(manifestPath, 'utf8');
  const parsed = JSON.parse(rawManifest) as {
    id?: unknown;
    name?: unknown;
    author?: unknown;
    description?: unknown;
    states?: unknown;
    assets?: unknown;
  };

  const statesCandidate = parsed.states ?? parsed.assets;
  if (!isNonEmptyString(parsed.id)) {
    throw new Error('id must be a non-empty string');
  }
  if (!isNonEmptyString(parsed.name)) {
    throw new Error('name must be a non-empty string');
  }
  if (!statesCandidate || typeof statesCandidate !== 'object' || Array.isArray(statesCandidate)) {
    throw new Error('states must be an object');
  }

  const stateAssets: SkinStateAssets = {};
  for (const state of VALID_VISUAL_STATES) {
    const candidate = (statesCandidate as Record<string, unknown>)[state];
    if (candidate === undefined) {
      continue;
    }
    if (!isNonEmptyString(candidate)) {
      throw new Error(`states.${state} must be a non-empty string`);
    }
    stateAssets[state] = candidate;
  }

  if (Object.keys(stateAssets).length === 0) {
    throw new Error('at least one visual state asset is required');
  }

  return {
    id: parsed.id,
    name: parsed.name,
    author: isNonEmptyString(parsed.author) ? parsed.author.trim() : undefined,
    description: isNonEmptyString(parsed.description) ? parsed.description.trim() : undefined,
    states: stateAssets,
  };
}

async function loadCustomSkin(entry: Dirent, skinsRoot: string, rootRealPath: string, readFileFn: ReadFileFn, realpathFn: RealpathFn, statFn: StatFn) {
  const manifestPath = join(skinsRoot, entry.name, 'skin.json');
  const manifestRealPath = await realpathFn(manifestPath);
  if (!startsWithinPath(rootRealPath, manifestRealPath)) {
    throw new Error('manifest path escapes ~/.hermes/skins root');
  }

  const manifestDir = resolve(manifestRealPath, '..');
  const manifest = await parseManifest(manifestRealPath, readFileFn);

  const resolvedAssets: SkinStateAssets = {};
  for (const state of VALID_VISUAL_STATES) {
    const assetPath = manifest.states[state];
    if (!assetPath) {
      continue;
    }

    const resolvedAssetPath = resolve(manifestDir, assetPath);
    if (!startsWithinPath(manifestDir, resolvedAssetPath)) {
      throw new Error(`states.${state} escapes the skin directory`);
    }
    if (!(await ensureRegularFile(resolvedAssetPath, statFn))) {
      throw new Error(`states.${state} must reference a regular file`);
    }

    resolvedAssets[state] = resolvedAssetPath;
  }

  return {
    id: manifest.id,
    name: manifest.name,
    source: 'custom',
    manifestPath: manifestRealPath,
    directoryPath: manifestDir,
    stateAssets: resolvedAssets,
    availableStates: VALID_VISUAL_STATES.filter((state) => resolvedAssets[state]),
    author: manifest.author,
    description: manifest.description,
  } satisfies SkinMetadata;
}

export async function loadAvailableSkins(options: LoadAvailableSkinsOptions = {}): Promise<SkinCatalog> {
  const readdirFn = options.readdirFn ?? readdir;
  const readFileFn = options.readFileFn ?? readFile;
  const realpathFn = options.realpathFn ?? realpath;
  const statFn = options.statFn ?? stat;
  const homeDir = options.homeDir ?? homedir();
  const skinsRoot = options.rootDir ?? join(homeDir, '.hermes', 'skins');

  const skins: SkinMetadata[] = [BUILTIN_SKIN];
  const warnings: string[] = [];

  let entries: Dirent[];
  try {
    entries = (await readdirFn(skinsRoot, { withFileTypes: true })) as Dirent[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        selectedSkin: BUILTIN_SKIN_ID,
        skins,
        warnings,
      };
    }
    throw error;
  }

  const rootRealPath = await realpathFn(skinsRoot);

  for (const entry of entries.filter((candidate) => candidate.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
    const manifestPath = join(skinsRoot, entry.name, 'skin.json');
    const displayPath = relative(homeDir, manifestPath) || manifestPath;

    try {
      skins.push(await loadCustomSkin(entry, skinsRoot, rootRealPath, readFileFn, realpathFn, statFn));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(formatWarning(displayPath, message));
    }
  }

  return {
    selectedSkin: BUILTIN_SKIN_ID,
    skins,
    warnings,
  };
}
