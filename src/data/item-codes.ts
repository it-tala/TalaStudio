// Item code numbers, sizes, descriptions and specifications (one line per part), from the "WEBSITE TRACKER" tab of TS LINE SHEET 25 OCT 26 (Google Sheets).
// tracker-items.json is written by isi_item_website.py (C:\PROJECT\tala-render-studio\Studio_Furniture\06_SPEC_SHEET),
// which also fills the item photo folders from the sheet's Google Photos links: change the sheet, then run it again.
// An item is matched on its folder (doheny/living/console-table-za-211) when known, else on its collection, room and name.
import items from './tracker-items.json';

type Item = {
  code: string | null; collection: string; room: string; name: string; folder: string;
  description: string | null; specification?: string[] | null; size: [number, number, number] | null;
};

// "6-Drawer Dresser" = "6 Drawer Dresser"
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// The tracker name of an item folder ("doheny/living/console-table-za-211" -> "Console Table"), if the tracker has it
export const trackerName = (folder: string) => (items as Item[]).find((i) => i.folder === folder)?.name ?? null;

export function itemSpec(collection: string, room: string, item: string, folder?: string):
  { code: string | null; finish: string | null; size: string | null; description: string | null; specification: string[] } | null {
  const list = items as Item[];
  const hit = (folder && list.find((i) => i.folder === folder))
    || list.find((i) => i.collection === collection && i.room === room && key(i.name) === key(item));
  if (!hit) return null;
  const [w, d, h] = hit.size ?? [];
  return { code: hit.code, finish: null, size: hit.size ? `W ${w} × D ${d} × H ${h} mm` : null, description: hit.description, specification: hit.specification ?? [] };
}

export const itemCode = (collection: string, room: string, item: string, folder?: string) =>
  itemSpec(collection, room, item, folder)?.code ?? null;
