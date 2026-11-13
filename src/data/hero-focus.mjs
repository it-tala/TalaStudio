// Where each landing page hero is cut, per collection room (`<collection slug>/<room>`). Plain JS: the content pipeline
// (scripts/sync-content.mjs) reads it to cut the phone pictures, the site to place the picture on screen.
//
//   x, y      object-position of the 16:9 picture on a landscape screen, in % (50 = centred). The hero fills the screen
//             (object-fit: cover, user 13 Nov 2026), so a screen wider than 16:9 loses a little top and bottom, a squarer
//             one a little of the sides: this keeps the piece in view.
//   portrait  the middle of the 9:16 phone picture cut from the 16:9 master, in % of its width (0 = left edge).
//             Left out: the pipeline finds the busiest part of the picture itself (sharp's attention crop) and stores it.
//             Changing it cuts the phone pictures again on the next sync (new file names; the old ones stay).
//
// A phone picture made by the team (LP 1 MOBILE LINK in the sheet, when that column exists) replaces the cut one.
// Set by hand where the attention crop picked a bright window over the furniture (13 Nov 2026); the rest are automatic.
export const heroFocus = {
  'doheny/bedroom': { portrait: 45 },   // the bed (auto: the window on the right)
  'doheny/living': { portrait: 52 },    // sofa and arm chair (auto: the window on the left)
  'calabasas/living': { portrait: 56 }, // the sofa (auto: the view through the window)
  'palisades/bedroom': { portrait: 52 },// the whole bed, both feet
  'zuma/dining': { portrait: 46 },      // the table and chairs (auto: the window on the left)
};

export const focusOf = (key) => heroFocus[key] ?? {};
