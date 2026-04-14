import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENE_LAYOUT, normalizeSceneLayout, sanitizeSceneBackgroundImage } from './scene-layout';

describe('scene layout schema', () => {
  it('defines a default persisted layout with background and seven seats', () => {
    expect(DEFAULT_SCENE_LAYOUT.version).toBe(1);
    expect(DEFAULT_SCENE_LAYOUT.backgroundImage).toBeNull();
    expect(DEFAULT_SCENE_LAYOUT.seatLayout).toHaveLength(7);
    expect(new Set(DEFAULT_SCENE_LAYOUT.seatLayout.map((seat) => seat.id)).size).toBe(7);
    expect(DEFAULT_SCENE_LAYOUT.seatLayout.every((seat) => seat.visibleOn.includes('page'))).toBe(true);
  });

  it('normalizes partial persisted input onto the default layout schema', () => {
    const layout = normalizeSceneLayout({
      backgroundImage: 'paperclip://office.png',
      seatLayout: [
        {
          id: 'desk-2',
          position: { x: '50%', y: '35%' },
          layer: 4,
          nameplate: {
            position: { x: '50%', y: '43%' },
            layer: 5,
          },
        },
      ],
    });

    expect(layout.backgroundImage).toBe('paperclip://office.png');
    expect(layout.seatLayout).toHaveLength(7);
    expect(layout.seatLayout[1]).toMatchObject({
      id: 'desk-2',
      position: { x: '50%', y: '35%' },
      layer: 4,
      nameplate: {
        position: { x: '50%', y: '43%' },
        layer: 5,
      },
    });
    expect(layout.seatLayout[0]).toMatchObject(DEFAULT_SCENE_LAYOUT.seatLayout[0]);
  });

  it('rejects external background image URLs and keeps the default background', () => {
    expect(sanitizeSceneBackgroundImage('paperclip://office.png')).toBe('paperclip://office.png');
    expect(sanitizeSceneBackgroundImage('https://attacker.example/track.png')).toBeNull();
    expect(sanitizeSceneBackgroundImage('javascript:alert(1)')).toBeNull();
    expect(sanitizeSceneBackgroundImage('paperclip://office.png), url(https://attacker.example/track.png')).toBeNull();
    expect(sanitizeSceneBackgroundImage('paperclip://office background.png')).toBeNull();

    const layout = normalizeSceneLayout({
      backgroundImage: 'https://attacker.example/track.png',
    });

    expect(layout.backgroundImage).toBeNull();
  });
});
