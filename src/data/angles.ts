// The angles an item is shown from, in display order, with their labels (product_images.angle).
// Same list as the check in supabase/migrations/20261021000005_item_angles_finishes.sql and in the admin app.
export const ANGLES = {
  'three-quarter': '3/4 view',
  front: 'Front',
  side: 'Side',
  back: 'Back',
  top: 'Top',
  detail: 'Detail',
  'in-room': 'In a room',
} as const;

export type Angle = keyof typeof ANGLES;

export const angleOrder = (a: string | null | undefined) => {
  const i = Object.keys(ANGLES).indexOf(a ?? '');
  return i < 0 ? Object.keys(ANGLES).length : i;
};
