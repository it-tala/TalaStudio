// Item codes (STANDARD CODE), sizes, descriptions and specifications, from the WEBSITE TRACKER tab of TS LINE SHEET via
// the content pipeline (src/data/content.json, see scripts/sync-content.mjs). The CODE column is not used.
// An item is matched on its folder (doheny/living/console-table) when known, else on its collection, room and name.
import { content, type Finish } from '../lib/content';

// "6-Drawer Dresser" = "6 Drawer Dresser"
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const inch = (n: number) => (n / 25.4).toFixed(1).replace(/\.0$/, '');

export type ItemSpec = {
  code: string | null; finish: string | null; size: string | null; sizeIn: string | null; category: string;
  description: string | null; specification: string[]; finishes: Finish[]; handle: Finish | null;
};

export function itemSpec(collection: string, room: string, item: string, folder?: string): ItemSpec | null {
  const hit = (folder && content.items.find((i) => i.folder === folder))
    || content.items.find((i) => key(i.collection) === key(collection) && i.room === room && key(i.name) === key(item));
  if (!hit) return null;
  const [w, d, h] = hit.size ?? [];
  return {
    code: hit.code, finish: null, category: hit.category,
    size: hit.size ? `W ${w} × D ${d} × H ${h} mm` : null,
    sizeIn: hit.size ? `W ${inch(w)} × D ${inch(d)} × H ${inch(h)} in` : null,
    description: hit.description, specification: hit.specification, finishes: hit.finishes, handle: hit.handle,
  };
}

export const itemCode = (collection: string, room: string, item: string, folder?: string) =>
  itemSpec(collection, room, item, folder)?.code ?? null;
