export type SceneSurface = 'page' | 'sidebar' | 'widget';

export type ScenePoint = {
  x: string;
  y: string;
};

export type SceneSeatNameplateLayout = {
  position: ScenePoint;
  layer: number;
};

export type SceneSeatLayout = {
  id: string;
  label: string;
  position: ScenePoint;
  size: {
    width: string;
    height: string;
  };
  layer: number;
  visibleOn: SceneSurface[];
  nameplate: SceneSeatNameplateLayout;
};

export type SceneLayout = {
  version: 1;
  backgroundImage: string | null;
  seatLayout: SceneSeatLayout[];
};

export type SceneSeatLayoutInput = Partial<Omit<SceneSeatLayout, 'nameplate' | 'position' | 'size' | 'visibleOn'>> & {
  position?: Partial<ScenePoint>;
  size?: Partial<SceneSeatLayout['size']>;
  visibleOn?: SceneSurface[];
  nameplate?: Partial<Omit<SceneSeatNameplateLayout, 'position'>> & {
    position?: Partial<ScenePoint>;
  };
};

export type SceneLayoutInput = Partial<Omit<SceneLayout, 'seatLayout'>> & {
  seatLayout?: SceneSeatLayoutInput[];
};

const DEFAULT_SEAT_LAYOUT: SceneSeatLayout[] = [
  {
    id: 'desk-1',
    label: 'Support desk',
    position: { x: '12%', y: '24%' },
    size: { width: '10rem', height: 'auto' },
    layer: 1,
    visibleOn: ['page', 'sidebar', 'widget'],
    nameplate: { position: { x: '12%', y: '31%' }, layer: 2 },
  },
  {
    id: 'desk-2',
    label: 'Engineering desk',
    position: { x: '42%', y: '24%' },
    size: { width: '10rem', height: 'auto' },
    layer: 1,
    visibleOn: ['page', 'sidebar', 'widget'],
    nameplate: { position: { x: '42%', y: '31%' }, layer: 2 },
  },
  {
    id: 'desk-3',
    label: 'Ops desk',
    position: { x: '72%', y: '24%' },
    size: { width: '10rem', height: 'auto' },
    layer: 1,
    visibleOn: ['page', 'sidebar', 'widget'],
    nameplate: { position: { x: '72%', y: '31%' }, layer: 2 },
  },
  {
    id: 'desk-4',
    label: 'Planning desk',
    position: { x: '18%', y: '58%' },
    size: { width: '10rem', height: 'auto' },
    layer: 1,
    visibleOn: ['page', 'sidebar', 'widget'],
    nameplate: { position: { x: '18%', y: '65%' }, layer: 2 },
  },
  {
    id: 'desk-5',
    label: 'QA desk',
    position: { x: '48%', y: '58%' },
    size: { width: '10rem', height: 'auto' },
    layer: 1,
    visibleOn: ['page', 'sidebar', 'widget'],
    nameplate: { position: { x: '48%', y: '65%' }, layer: 2 },
  },
  {
    id: 'desk-6',
    label: 'Research desk',
    position: { x: '78%', y: '58%' },
    size: { width: '10rem', height: 'auto' },
    layer: 1,
    visibleOn: ['page', 'sidebar', 'widget'],
    nameplate: { position: { x: '78%', y: '65%' }, layer: 2 },
  },
  {
    id: 'desk-7',
    label: 'Town hall stage',
    position: { x: '48%', y: '82%' },
    size: { width: '10rem', height: 'auto' },
    layer: 1,
    visibleOn: ['page', 'sidebar', 'widget'],
    nameplate: { position: { x: '48%', y: '89%' }, layer: 2 },
  },
];

export const DEFAULT_SCENE_LAYOUT: SceneLayout = {
  version: 1,
  backgroundImage: null,
  seatLayout: DEFAULT_SEAT_LAYOUT,
};

const SAFE_PAPERCLIP_BACKGROUND_IMAGE_PATTERN = /^paperclip:\/\/[A-Za-z0-9._~!$&'*+=:@%/-]+$/;

export function sanitizeSceneBackgroundImage(backgroundImage: string | null | undefined) {
  if (!backgroundImage) {
    return null;
  }

  return SAFE_PAPERCLIP_BACKGROUND_IMAGE_PATTERN.test(backgroundImage) ? backgroundImage : null;
}

function mergeSeatLayout(defaultSeat: SceneSeatLayout, seatOverride?: SceneSeatLayoutInput): SceneSeatLayout {
  return {
    ...defaultSeat,
    label: seatOverride?.label ?? defaultSeat.label,
    position: {
      x: seatOverride?.position?.x ?? defaultSeat.position.x,
      y: seatOverride?.position?.y ?? defaultSeat.position.y,
    },
    size: {
      width: seatOverride?.size?.width ?? defaultSeat.size.width,
      height: seatOverride?.size?.height ?? defaultSeat.size.height,
    },
    layer: seatOverride?.layer ?? defaultSeat.layer,
    visibleOn: seatOverride?.visibleOn ?? defaultSeat.visibleOn,
    nameplate: {
      position: {
        x: seatOverride?.nameplate?.position?.x ?? defaultSeat.nameplate.position.x,
        y: seatOverride?.nameplate?.position?.y ?? defaultSeat.nameplate.position.y,
      },
      layer: seatOverride?.nameplate?.layer ?? defaultSeat.nameplate.layer,
    },
  };
}

export function normalizeSceneLayout(layout?: SceneLayoutInput): SceneLayout {
  const seatsById = new Map(layout?.seatLayout?.map((seat) => [seat.id, seat]));

  return {
    version: 1,
    backgroundImage: sanitizeSceneBackgroundImage(layout?.backgroundImage),
    seatLayout: DEFAULT_SCENE_LAYOUT.seatLayout.map((defaultSeat) => mergeSeatLayout(defaultSeat, seatsById.get(defaultSeat.id))),
  };
}
