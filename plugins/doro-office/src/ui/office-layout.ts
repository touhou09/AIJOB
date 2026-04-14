import { DEFAULT_SCENE_LAYOUT } from '../shared/scene-layout';

export type OfficeSeat = {
  id: string;
  x: string;
  y: string;
  label: string;
};

export const OFFICE_SEATS: OfficeSeat[] = DEFAULT_SCENE_LAYOUT.seatLayout.map((seat) => ({
  id: seat.id,
  x: seat.position.x,
  y: seat.position.y,
  label: seat.label,
}));
