// Build-time helper: adds ?v=<file date> to a picture in public/, so a picture replaced under the same name
// (hero.jpg) is fetched again instead of coming from the browser's or Cloudflare's cache.
import { statSync } from 'node:fs';
import { join } from 'node:path';

export function versioned(src: string): string {
  try {
    return `${src}?v=${Math.round(statSync(join(process.cwd(), 'public', src)).mtimeMs).toString(36)}`;
  } catch {
    return src;
  }
}
