// Pages switched off for now: left out of the menu, footer and links, and their address sends visitors to the home page.
// Take a path out of this list to bring the page back (and out of the sitemap filter in astro.config.mjs).
export const disabledPages = ['/the-studio', '/how-a-container-works', '/partner-with-us'];
export const pageOn = (path: string) => !disabledPages.includes(path);

// V1 shows the collections only. Set a flag to true to bring a section back.
// Sections marked "needs images" are hidden until the real photos arrive.
export const showSection = {
  home: {
    byRoom: false,       // needs 3 room renders
    studioStory: false,  // needs studio photo
    materials: false,    // needs 3 close-up photos
    forBuyers: false,    // needs container photo
    visit: false,        // needs showroom photo
    catalogImage: false, // needs catalog cover (a text-only catalog band shows instead)
  },
};
