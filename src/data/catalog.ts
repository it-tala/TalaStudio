// The buyer catalog PDF, in public/catalog. To publish a new edition, replace the file and keep its name, so links
// already sent to buyers stay valid. The button is in the footer (components/Footer.astro); mark any other link to it
// with `data-catalog` so VisitTracker logs the download.
export const catalog = {
  href: '/catalog/TalaStudio-Buyer-Catalog.pdf',
  file: 'TalaStudio-Buyer-Catalog.pdf',
  label: 'Download catalog',
};
