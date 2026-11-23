// The buyer catalog PDF, in public/catalog. To publish a new edition, replace the file and keep its name, so links
// already sent to buyers stay valid. The button is in the header (components/Header.astro); mark any other link to it
// with `data-catalog` so VisitTracker logs the download.
// The catalog preview on the home page is the live Canva design (26 pages), so it follows every edit made in Canva.
// `canva` must be a PUBLIC view link ("Anyone with the link can view") or an embed link (Share > More > Embed).
// The PDF below is a copy: replace it when the Canva design changes (Canva > Share > Download > PDF).
export const canva = {
  design: 'DAHbah-Wr-U',
  view: 'https://www.canva.com/d/7OMRtDLDHz9Y6vM',
  embed: 'https://www.canva.com/d/7OMRtDLDHz9Y6vM',
};

export const catalog = {
  href: '/catalog/TalaStudio-Buyer-Catalog.pdf',
  file: 'TalaStudio-Buyer-Catalog.pdf',
  label: 'Download catalog',
};
