import { mkdtemp, mkdir, realpath, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { loadAvailableSkins } from './skin-loader';

const tempRoots: string[] = [];

async function createTempHome() {
  const root = await mkdtemp(join(tmpdir(), 'doro-office-skins-'));
  tempRoots.push(root);
  return root;
}

async function writeJson(path: string, payload: unknown) {
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(async (root) => {
      await import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true }));
    }),
  );
});

describe('loadAvailableSkins', () => {
  it('returns the builtin dororong skin when ~/.hermes/skins is missing', async () => {
    const homeDir = await createTempHome();

    const catalog = await loadAvailableSkins({ homeDir });

    expect(catalog.selectedSkin).toBe('dororong');
    expect(catalog.skins).toEqual([
      expect.objectContaining({
        id: 'dororong',
        name: '도로롱',
        source: 'builtin',
      }),
    ]);
    expect(catalog.warnings).toEqual([]);
  });

  it('loads valid custom manifests from ~/.hermes/skins/*/skin.json', async () => {
    const homeDir = await createTempHome();
    const skinDir = join(homeDir, '.hermes', 'skins', 'night-shift');
    await mkdir(skinDir, { recursive: true });
    await writeFile(join(skinDir, 'idle.png'), 'idle', 'utf8');
    await writeFile(join(skinDir, 'working.png'), 'working', 'utf8');
    await writeJson(join(skinDir, 'skin.json'), {
      id: 'night-shift',
      name: 'Night Shift',
      states: {
        idle: './idle.png',
        working: './working.png',
      },
      author: 'team-doro',
      description: 'Late-night dororong',
    });

    const catalog = await loadAvailableSkins({ homeDir, selectedSkin: 'night-shift' });
    const realSkinDir = await realpath(skinDir);

    expect(catalog.selectedSkin).toBe('night-shift');
    expect(catalog.skins).toHaveLength(2);
    expect(catalog.skins[1]).toEqual(
      expect.objectContaining({
        id: 'night-shift',
        name: 'Night Shift',
        source: 'custom',
        availableStates: ['idle', 'working'],
        author: 'team-doro',
      }),
    );
    expect(catalog.skins[1]?.manifestPath).toContain('/night-shift/skin.json');
    expect(catalog.skins[1]?.stateAssets.idle).toBe(pathToFileURL(join(realSkinDir, 'idle.png')).href);
    expect(catalog.skins[1]?.stateAssets.working).toBe(pathToFileURL(join(realSkinDir, 'working.png')).href);
    expect(catalog.warnings).toEqual([]);
  });

  it('falls back to builtin selectedSkin when the requested skin is unavailable', async () => {
    const homeDir = await createTempHome();
    const skinDir = join(homeDir, '.hermes', 'skins', 'night-shift');
    await mkdir(skinDir, { recursive: true });
    await writeFile(join(skinDir, 'idle.png'), 'idle', 'utf8');
    await writeJson(join(skinDir, 'skin.json'), {
      id: 'night-shift',
      name: 'Night Shift',
      states: {
        idle: './idle.png',
      },
    });

    const catalog = await loadAvailableSkins({ homeDir, selectedSkin: 'missing-skin' });

    expect(catalog.selectedSkin).toBe('dororong');
    expect(catalog.skins.map((skin) => skin.id)).toEqual(['dororong', 'night-shift']);
  });

  it('rejects custom skin assets whose symlink target escapes the skin directory', async () => {
    const homeDir = await createTempHome();
    const skinsRoot = join(homeDir, '.hermes', 'skins');
    const skinDir = join(skinsRoot, 'linked-outside');
    const outsideDir = join(homeDir, 'outside');
    await mkdir(skinDir, { recursive: true });
    await mkdir(outsideDir, { recursive: true });
    await writeFile(join(outsideDir, 'idle.png'), 'outside', 'utf8');
    await symlink(join(outsideDir, 'idle.png'), join(skinDir, 'idle.png'));
    await writeJson(join(skinDir, 'skin.json'), {
      id: 'linked-outside',
      name: 'Linked Outside',
      states: {
        idle: './idle.png',
      },
    });

    const catalog = await loadAvailableSkins({ homeDir, selectedSkin: 'linked-outside' });

    expect(catalog.selectedSkin).toBe('dororong');
    expect(catalog.skins).toHaveLength(1);
    expect(catalog.warnings).toEqual([
      expect.stringContaining('linked-outside/skin.json: states.idle escapes the skin directory'),
    ]);
  });

  it('skips invalid manifests and path traversal without breaking the builtin fallback', async () => {
    const homeDir = await createTempHome();
    const skinsRoot = join(homeDir, '.hermes', 'skins');
    const invalidDir = join(skinsRoot, 'broken');
    await mkdir(invalidDir, { recursive: true });
    await writeJson(join(invalidDir, 'skin.json'), {
      id: 'broken',
      name: 'Broken',
      states: {
        idle: '../outside.png',
      },
    });

    const malformedDir = join(skinsRoot, 'malformed');
    await mkdir(malformedDir, { recursive: true });
    await writeFile(join(malformedDir, 'skin.json'), '{not-json', 'utf8');

    const catalog = await loadAvailableSkins({ homeDir, selectedSkin: 'broken' });

    expect(catalog.selectedSkin).toBe('dororong');
    expect(catalog.skins).toHaveLength(1);
    expect(catalog.skins[0]?.id).toBe('dororong');
    expect(catalog.warnings).toHaveLength(2);
    expect(catalog.warnings.join('\n')).toContain('broken/skin.json');
    expect(catalog.warnings.join('\n')).toContain('malformed/skin.json');
  });
});
