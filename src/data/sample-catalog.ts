// SAMPLE CATALOG for UI preview only. Invented names and sizes. No prices, no real designs.
// Used only when PUBLIC_USE_SAMPLE_DATA=true and Supabase is not configured.
import type { Collection, Product } from '../lib/supabase';

const col = (n: number, slug: string, name: string, room: Collection['room'], description: string): Collection => ({
  id: `c${n}`, slug, name, room, description, hero_image_path: null, sort_order: n,
});

export const sampleCollections: Collection[] = [
  col(1, 'kenari', 'Kenari', 'bedroom', 'Soft curves and a low profile. A calm bedroom group in solid wood with a hand-rubbed finish.'),
  col(2, 'selatan', 'Selatan', 'bedroom', 'Straight lines and slatted headboards. Built light, packed flat, easy to mix in a container.'),
  col(3, 'pasir', 'Pasir', 'living', 'Deep seating on a wood frame, with tables that share the same rounded edge.'),
  col(4, 'gading', 'Gading', 'dining', 'A table made to gather round, with chairs that stack carton by carton.'),
];

type Spec = [slug: string, name: string, w: number, d: number, h: number, cbm: number, per40: number];

const rows: Record<string, Spec[]> = {
  c1: [
    ['kenari-bed-king', 'Kenari Bed, King', 205, 220, 110, 0.62, 48],
    ['kenari-bed-queen', 'Kenari Bed, Queen', 165, 215, 108, 0.52, 56],
    ['kenari-nightstand', 'Kenari Nightstand', 55, 42, 55, 0.14, 210],
    ['kenari-dresser', 'Kenari Dresser', 160, 48, 85, 0.48, 60],
    ['kenari-bench', 'Kenari Bench', 120, 40, 45, 0.18, 160],
  ],
  c2: [
    ['selatan-bed-king', 'Selatan Bed, King', 200, 215, 120, 0.55, 52],
    ['selatan-nightstand', 'Selatan Nightstand', 50, 40, 52, 0.12, 240],
    ['selatan-chest', 'Selatan Chest', 90, 45, 120, 0.4, 70],
    ['selatan-mirror', 'Selatan Mirror', 70, 5, 160, 0.09, 300],
  ],
  c3: [
    ['pasir-sofa-3', 'Pasir Sofa, 3 Seat', 220, 95, 78, 1.1, 24],
    ['pasir-armchair', 'Pasir Armchair', 85, 88, 78, 0.55, 48],
    ['pasir-coffee-table', 'Pasir Coffee Table', 110, 70, 38, 0.32, 90],
    ['pasir-side-table', 'Pasir Side Table', 50, 50, 50, 0.1, 280],
    ['pasir-console', 'Pasir Console', 140, 38, 80, 0.3, 100],
  ],
  c4: [
    ['gading-table-180', 'Gading Table, 180', 180, 90, 76, 0.6, 40],
    ['gading-table-220', 'Gading Table, 220', 220, 100, 76, 0.75, 32],
    ['gading-chair', 'Gading Chair', 48, 55, 88, 0.15, 190],
    ['gading-bench', 'Gading Bench', 160, 40, 46, 0.2, 140],
    ['gading-sideboard', 'Gading Sideboard', 180, 45, 80, 0.55, 48],
  ],
};

export const sampleProducts: Product[] = Object.entries(rows).flatMap(([cid, specs], ci) =>
  specs.map(([slug, name, w, d, h, cbm, per40], i) => ({
    id: slug, sku: `SMP-${ci + 1}${String(i + 1).padStart(2, '0')}`, collection_id: cid, slug, name,
    description: 'Sample piece for layout preview. Real specifications arrive with the final data.',
    width_cm: w, depth_cm: d, height_cm: h,
    materials: ['Solid wood', 'Hardware'],
    finishes: ['Natural', 'Dark brown', 'Warm grey'],
    carton_length_cm: w + 6, carton_width_cm: d + 6, carton_height_cm: Math.max(10, Math.round(h / 3)),
    carton_weight_kg: Math.round(cbm * 120), cbm, pieces_per_40hq: per40,
    moq: 20, lead_time_days: 60, sort_order: i,
  })),
);
