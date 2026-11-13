// In the browser: the best format of a content pipeline picture for pictures built by script (the viewer, the spec page,
// pictures loaded ahead), where there is no <picture> to choose. A page lists the pictures that have an AVIF copy in
// <script type="application/json" id="avif-set"> (hashes, see avifHashes in content.ts); a picture's WebP address
// becomes its AVIF address when it is listed and this browser shows AVIF.
const HASHED = /\/img\/([0-9a-f]{16})\/(\d+)\.webp$/;
const listed = new Set<string>((() => {
  try { return JSON.parse(document.getElementById('avif-set')?.textContent ?? '[]'); } catch { return []; }
})());
let avif = false;
// A 1 x 1 AVIF: does this browser show it? (Every current browser does; old Safari and Edge do not.)
export const avifReady: Promise<boolean> = new Promise((done) => {
  const img = new Image();
  img.onload = () => done((avif = img.width > 0));
  img.onerror = () => done(false);
  img.src = 'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAD6AAEAAAAAAAAAFwAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgSACAAAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAAAAfbWRhdBIACgc4AAYQENBpMgobAAAAQACwE16A';
});

// The address to show: AVIF when listed and shown here (known once avifReady settles; WebP until then)
export const best = (src: string): string => {
  const m = src.match(HASHED);
  return avif && m && listed.has(m[1]) ? src.replace(/\.webp$/, '.avif') : src;
};
