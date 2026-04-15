import { describe, expect, it } from 'vitest';
import { OFFICE_SEATS } from './office-layout';

describe('OFFICE_SEATS', () => {
  it('defines seven unique seats for the office view', () => {
    expect(OFFICE_SEATS).toHaveLength(7);
    expect(new Set(OFFICE_SEATS.map((seat) => seat.id)).size).toBe(7);
    expect(OFFICE_SEATS.every((seat) => seat.label.length > 0)).toBe(true);
  });
});
