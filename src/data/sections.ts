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
