// One-time helper for the admin app's "Import V1 collections" button (see admin/README.md).
// Copies the V1 list from src/data/collections.ts, items included, to admin/src/data/v1-collections.json.
// Run from this folder after changing the V1 list: node scripts/export-v1-for-admin.mjs
// Needs Node 22.18 or newer: it reads the .ts file directly.
import { writeFileSync } from 'node:fs';
import { staticCollections, staticProducts, staticProductImages } from '../src/data/collections.ts';

const products = staticProducts();
const images = staticProductImages();
const list = staticCollections().map(({ slug, name, room, description, hero_image_path, gallery }) => ({
  slug, name, room, description, hero_image_path,
  gallery: (gallery ?? []).map(({ src, name }) => ({ src, name })),
  items: products.filter((p) => p.collection_id === slug).map(({ id, collection_id, sort_order, ...fields }) => ({
    ...fields,
    images: images.filter((i) => i.product_id === id).map(({ image_path, angle, finish }) => ({ src: image_path, angle, finish })),
  })),
}));

writeFileSync(new URL('../admin/src/data/v1-collections.json', import.meta.url), JSON.stringify(list, null, 2) + '\n');
const items = list.reduce((n, c) => n + c.items.length, 0);
console.log(`Wrote ${list.length} collections and ${items} items to admin/src/data/v1-collections.json`);
