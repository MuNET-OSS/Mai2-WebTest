// Touch coordinate → zone mapping algorithm
// Ported from AquaMai ExclusiveTouch/TouchSensorMapper.cs + PolygonRaycasting.cs
// Maps raw HID touch coordinates to 34 maimai sensor zones (A1-A8, B1-B8, C1-C2, D1-D8, E1-E8)
// using polygon hit-testing on a 1440×1440 virtual canvas.

function isPointInPolygon(polygon: [number, number][], px: number, py: number): boolean {
  let inside = false;
  const n = polygon.length;
  let [prevX, prevY] = polygon[n - 1];
  for (let i = 0; i < n; i++) {
    const [curX, curY] = polygon[i];
    if ((curY > py) !== (prevY > py) && px < (prevX - curX) * (py - curY) / (prevY - curY) + curX) {
      inside = !inside;
    }
    prevX = curX;
    prevY = curY;
  }
  return inside;
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function isVertexWithinRadius(polygon: [number, number][], cx: number, cy: number, r: number): boolean {
  const r2 = r * r;
  for (const [vx, vy] of polygon) {
    if (distSq(cx, cy, vx, vy) < r2) return true;
  }
  return false;
}

function distanceToSegmentSq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const segX = bx - ax;
  const segY = by - ay;
  const lenSq = segX * segX + segY * segY;
  if (lenSq === 0) return distSq(px, py, ax, ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * segX + (py - ay) * segY) / lenSq));
  const projX = ax + t * segX;
  const projY = ay + t * segY;
  return distSq(px, py, projX, projY);
}

function isCircleIntersectingEdges(polygon: [number, number][], cx: number, cy: number, r: number): boolean {
  const r2 = r * r;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = polygon[i];
    const [bx, by] = polygon[(i + 1) % n];
    if (distanceToSegmentSq(cx, cy, ax, ay, bx, by) <= r2) return true;
  }
  return false;
}

function makePolygon(offsetX: number, offsetY: number, points: [number, number][]): [number, number][] {
  return points.map(([x, y]) => [x + offsetX, y + offsetY]);
}

// Zone order: A1-A8 (0-7), B1-B8 (8-15), C1-C2 (16-17), D1-D8 (18-25), E1-E8 (26-33)
const SENSORS: [number, number][][] = [
  // A1 (0)
  makePolygon(786, 11, [[150, 28], [245, 65], [360, 133], [208, 338], [145, 338], [49, 297], [0, 249], [35, 0]]),
  // A2 (1)
  makePolygon(1091, 292, [[261, 101], [303, 195], [339, 327], [91, 362], [42, 314], [0, 219], [0, 150], [202, 0]]),
  // A3 (2)
  makePolygon(1092, 786, [[305, 150], [269, 246], [201, 364], [0, 213], [0, 144], [41, 48], [89, 0], [337, 34]]),
  // A4 (3)
  makePolygon(786, 1092, [[260, 259], [167, 301], [37, 335], [0, 83], [48, 35], [144, 0], [212, 0], [364, 200]]),
  // A5 (4)
  makePolygon(291, 1092, [[104, 259], [197, 301], [327, 335], [363, 83], [316, 35], [220, 0], [152, 0], [0, 201]]),
  // A6 (5)
  makePolygon(16, 785, [[32, 150], [68, 246], [133, 365], [333, 214], [333, 144], [296, 48], [248, 0], [0, 35]]),
  // A7 (6)
  makePolygon(16, 291, [[78, 101], [36, 195], [0, 327], [248, 362], [297, 314], [333, 219], [333, 151], [132, 0]]),
  // A8 (7)
  makePolygon(295, 11, [[210, 28], [115, 65], [0, 138], [153, 338], [215, 338], [311, 297], [359, 249], [324, 0]]),

  // B1 (8)
  makePolygon(720, 346, [[0, 78], [78, 0], [209, 55], [209, 165], [180, 195], [70, 195], [0, 130]]),
  // B2 (9)
  makePolygon(900, 511, [[117, 209], [195, 132], [140, 0], [30, 0], [0, 30], [0, 139], [65, 209]]),
  // B3 (10)
  makePolygon(900, 721, [[120, 0], [198, 78], [140, 208], [30, 208], [0, 180], [0, 71], [65, 0]]),
  // B4 (11)
  makePolygon(721, 901, [[0, 112], [87, 198], [208, 140], [208, 29], [177, 0], [71, 0], [0, 65]]),
  // B5 (12)
  makePolygon(512, 901, [[208, 112], [121, 198], [0, 140], [0, 29], [31, 0], [137, 0], [208, 65]]),
  // B6 (13)
  makePolygon(349, 721, [[78, 0], [0, 78], [58, 208], [163, 208], [193, 180], [193, 71], [133, 0]]),
  // B7 (14)
  makePolygon(345, 511, [[82, 209], [0, 127], [55, 0], [165, 0], [195, 30], [195, 139], [137, 209]]),
  // B8 (15)
  makePolygon(511, 346, [[209, 78], [131, 0], [0, 55], [0, 165], [29, 195], [139, 195], [209, 130]]),

  // C1 (16)
  makePolygon(720, 583, [[0, 0], [60, 0], [140, 80], [140, 200], [60, 280], [0, 280]]),
  // C2 (17)
  makePolygon(579, 583, [[141, 280], [81, 280], [0, 199], [1, 81], [81, 0], [141, 0]]),

  // D1 (18)
  makePolygon(620, 6, [[0, 5], [50, 2], [100, 0], [150, 2], [200, 5], [165, 253], [100, 188], [35, 253]]),
  // D2 (19)
  makePolygon(995, 144, [[153, 0], [187, 32], [225, 67], [259, 104], [295, 147], [96, 297], [96, 205], [0, 205]]),
  // D3 (20)
  makePolygon(1182, 620, [[248, 0], [251, 48], [253, 100], [251, 150], [247, 199], [0, 165], [65, 100], [0, 35]]),
  // D4 (21)
  makePolygon(1000, 1000, [[292, 151], [260, 187], [225, 225], [188, 259], [151, 291], [0, 92], [92, 92], [92, 0]]),
  // D5 (22)
  makePolygon(621, 1175, [[199, 252], [151, 255], [99, 257], [49, 255], [0, 252], [34, 0], [99, 65], [164, 0]]),
  // D6 (23)
  makePolygon(150, 1000, [[140, 292], [104, 260], [66, 225], [32, 188], [0, 151], [199, 0], [199, 92], [291, 92]]),
  // D7 (24)
  makePolygon(10, 620, [[5, 199], [2, 151], [0, 99], [2, 49], [6, 0], [253, 34], [188, 99], [253, 164]]),
  // D8 (25)
  makePolygon(149, 150, [[0, 140], [32, 104], [67, 66], [104, 32], [145, 0], [298, 199], [200, 199], [200, 291]]),

  // E1 (26)
  makePolygon(607, 195, [[0, 113], [113, 0], [226, 113], [113, 226]]),
  // E2 (27)
  makePolygon(930, 350, [[0, 0], [0, 160], [160, 160], [160, 0]]),
  // E3 (28)
  makePolygon(1020, 607, [[0, 113], [113, 0], [226, 113], [113, 226]]),
  // E4 (29)
  makePolygon(930, 930, [[0, 0], [0, 160], [160, 160], [160, 0]]),
  // E5 (30)
  makePolygon(607, 1013, [[0, 113], [113, 0], [226, 113], [113, 226]]),
  // E6 (31)
  makePolygon(350, 930, [[0, 0], [0, 160], [160, 160], [160, 0]]),
  // E7 (32)
  makePolygon(200, 607, [[0, 113], [113, 0], [226, 113], [113, 226]]),
  // E8 (33)
  makePolygon(350, 350, [[0, 0], [0, 160], [160, 160], [160, 0]]),
];

const ZONE_NAMES = [
  'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8',
  'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8',
  'c1', 'c2',
  'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8',
  'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8',
] as const;

export interface TouchSensorMapperConfig {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  flip: boolean;
  radius: number;
  aExtraRadius: number;
  bExtraRadius: number;
  cExtraRadius: number;
  dExtraRadius: number;
  eExtraRadius: number;
}

function mapCoordinate(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  return toMin + (value - fromMin) * (toMax - toMin) / (fromMax - fromMin);
}

function getEffectiveRadius(sensorIndex: number, cfg: TouchSensorMapperConfig): number {
  let extra: number;
  if (sensorIndex <= 7) extra = cfg.aExtraRadius;
  else if (sensorIndex <= 15) extra = cfg.bExtraRadius;
  else if (sensorIndex <= 17) extra = cfg.cExtraRadius;
  else if (sensorIndex <= 25) extra = cfg.dExtraRadius;
  else extra = cfg.eExtraRadius;
  return Math.max(0, cfg.radius + extra);
}

export function mapTouchPoint(rawX: number, rawY: number, cfg: TouchSensorMapperConfig): string[] {
  let cx = mapCoordinate(rawX, cfg.minX, cfg.maxX, 0, 1440);
  let cy = mapCoordinate(rawY, cfg.minY, cfg.maxY, 0, 1440);
  if (cx < 0 || cx > 1440 || cy < 0 || cy > 1440) return [];

  if (cfg.flip) {
    const tmp = cx;
    cx = cy;
    cy = tmp;
  }

  const zones: string[] = [];

  for (let i = 0; i < 34; i++) {
    const polygon = SENSORS[i];
    const r = getEffectiveRadius(i, cfg);
    let hit: boolean;

    if (r > 0) {
      hit = isVertexWithinRadius(polygon, cx, cy, r)
        || isCircleIntersectingEdges(polygon, cx, cy, r)
        || isPointInPolygon(polygon, cx, cy);
    } else {
      hit = isPointInPolygon(polygon, cx, cy);
    }

    if (hit) zones.push(ZONE_NAMES[i]);
  }

  return zones;
}
