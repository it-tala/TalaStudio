// The content pages, each built from a list of section blocks. src/pages/[...page].astro makes one page per entry
// and src/components/Blocks.astro draws each block. To add a page, add an entry; to change a section, edit its block.
// The home page, the product pages and the articles keep their own files (they read the tracker and the insights).
import { privacy, terms, updated } from './legal';

// ---------- Blocks ----------

// Dark title band (components/PageHero.astro)
export type HeroBlock = { type: 'hero'; eyebrow: string; title: string; lede?: string };
// "Talk to us" band with one button (components/CtaBand.astro). Hidden while its page is switched off.
export type CtaBlock = { type: 'cta'; title?: string; text?: string; href?: string; label?: string };
// Big title with numbered links down the page: [number, label, section id]
export type StepsHeroBlock = { type: 'steps-hero'; eyebrow: string; title: string; intro: string; steps: [string, string, string][] };

// A photo on How We Work: drop public/how-we-work/<name>.jpg in and it replaces the labelled box (components/Shot.astro)
export type ShotProps = { name: string; label: string; hint?: string; ratio?: string; class?: string };
// One photo, or two that overlap (the first with class 'back', the second 'front')
export type StoryFigure = { shots: ShotProps[]; caption?: string };
export type StoryCopy = string | { quote: string } | { docs: [string, string][] } | { trace: string[] };
export type StoryBlock = {
  type: 'story';
  id?: string;
  tone?: 'alt' | 'goal';
  num: string;
  title: string;
  copy?: StoryCopy[];
  figure?: StoryFigure;
  figureFirst?: boolean;  // photo on the left
  aside?: StoryFigure;    // small photo under the copy
  gallery?: { row: StoryFigure[]; wide?: StoryFigure }; // photos in a row of three under the text, then one wide
  top?: boolean;          // text and photo line up at the top instead of the middle
  link?: { href: string; label: string };
};

// Labelled rows of text, then people with a photo
export type Person = { name: string; role: string; photo: string; text: string };
export type RowsBlock = { type: 'rows'; eyebrow: string; title: string; rows: [string, string[]][]; peopleLabel?: string; people?: Person[]; outro?: string };
// Contact people (leave phone empty to hide it), then plain cards whose text may hold links
export type ContactBlock = {
  type: 'contact'; eyebrow: string; title: string; lede: string;
  people: { role: string; name: string; email: string; phone?: string }[];
  cards?: { title: string; html: string }[];
};
// Headings (h), paragraphs (p, may hold links) and numbered lists (ol). `when`: show only while that page is on.
export type ProseBlock = { type: 'prose'; items: { h?: string; p?: string; ol?: string[]; when?: string }[] };
// Every published insight, newest first
export type PostsBlock = { type: 'posts'; empty: string };
// Numbered legal text with a contents list
export type LegalBlock = { type: 'legal'; parts: { id: string; title: string; intro: string; items: [string, string, string[]][] }[] };
// The buyer dashboard demo (data/demo-dashboard.ts)
export type DashboardBlock = { type: 'dashboard' };

export type Block = HeroBlock | CtaBlock | StepsHeroBlock | StoryBlock | RowsBlock | ContactBlock | ProseBlock | PostsBlock | LegalBlock | DashboardBlock;
export type Page = { path: string; title: string; description: string; blocks: Block[] };

// ---------- Pages ----------

// The QC inspection photo on How We Work is off for now: drop it in as qc.jpg and set this to true
const showQcPhoto = false;

export const pages: Page[] = [
  {
    // Laid out as TalaStudio_How_We_Work_Layout_v5.pdf (2 Nov 2026); photos taken from that PDF
    path: 'how-we-work',
    title: 'How we work',
    description: 'From a single line on paper to a container on the water. Every TalaStudio collection is designed in our Jepara studio, built with our factory partners and checked piece by piece.',
    blocks: [
      {
        type: 'steps-hero',
        eyebrow: 'Jepara · Central Java · Indonesia',
        title: 'How we work',
        intro: 'From a single line on paper to a container on the water. Designed in our studio, built with our factory partners, checked piece by piece.',
        steps: [
          ['01', 'Facility', 'facility'],
          ['02', 'Design process', 'design'],
          ['03', 'Product development', 'development'],
          ['04', 'Sourcing & production', 'sourcing'],
          ['05', 'Built lean', 'lean'],
          ['06', 'Quality control', 'qc'],
        ],
      },
      {
        type: 'story', id: 'facility', num: '01 Facility',
        title: 'A converted factory on the north coast of Java.',
        copy: [
          'TalaStudio works out of a converted factory in Jepara, a town on the north coast of Java where furniture has been made for as long as anyone can remember.',
          'Our studio is an actual factory, with a full panel line, solid wood machining and a finishing line. We use 3D printing, workstations and CNC. We are a small team of designers, drafters, IT personnel and sample makers.',
        ],
        gallery: {
          row: [
            { shots: [{ name: 'panel-line', label: 'Panel line', hint: 'Panel line, studio floor', ratio: '3 / 4' }], caption: 'Panel line' },
            { shots: [{ name: 'assembly', label: 'Assembly', hint: 'Assembly on the studio floor', ratio: '3 / 4' }], caption: 'Assembly' },
            { shots: [{ name: 'solid-wood', label: 'Solid wood', hint: 'Solid wood parts before finishing', ratio: '3 / 4' }], caption: 'Solid wood, before finishing' },
          ],
          wide: { shots: [{ name: 'machining', label: 'Solid wood machining', hint: 'Solid wood machining on the studio floor, Jepara', ratio: '16 / 9' }], caption: 'Solid wood machining · studio floor, Jepara' },
        },
      },
      {
        type: 'story', id: 'design', tone: 'alt', num: '02 Design process',
        title: 'It begins as a single line.',
        copy: [
          'A collection begins as a single idea, often just a line or a proportion. We draw it, render it and develop it.',
          { quote: 'We lavish attention on the details: handles, finishes, profiles.' },
          'We model in CAD, Blender and D5, and by hand sketch. Every trick to visualise and refine the details and proportions. As we work, we consider how to build it and what it costs. Then it moves to the bench.',
        ],
        figure: {
          shots: [
            { name: 'samples', label: 'Handles and cord', hint: 'Brass handles, cord and finish samples', ratio: '1 / 1', class: 'back' },
            { name: 'samples-detail', label: 'Finish samples', hint: 'Finish samples with cord and a handle', ratio: '12 / 11', class: 'front' },
          ],
          caption: 'Handles, cord and finish samples',
        },
      },
      {
        type: 'story', id: 'development', num: '03 Product development', top: true,
        title: 'Built first by hand, in our studio.',
        copy: [
          'In our studio, a small team of samplemakers builds the first pieces by hand. This is where we work out the details, the finishes and the textures.',
          "We 3D print the handles, then have them hand cast. We keep refining until it's right, and then we build the key pieces.",
        ],
        figure: { shots: [{ name: 'samplemaker', label: 'Samplemaker at the bench', hint: 'Samplemaker shaping a piece by hand at the bench', ratio: '7 / 12' }], caption: 'Samplemaker at the bench' },
        figureFirst: true,
        aside: { shots: [{ name: 'key-piece', label: 'Key piece', hint: 'Key piece, a studio sample in raw wood', ratio: '4 / 3' }], caption: 'Key piece · studio sample' },
      },
      {
        type: 'story', id: 'sourcing', tone: 'alt', num: '04 Sourcing & production', top: true,
        title: "We never design what we don't know how to make.",
        copy: [
          'When the key pieces are right, we take the collection to our factory partners to make the full set of pre-production samples (PPS). They build from our samples, and from a full document set, so what comes off their line still speaks in our voice.',
          { docs: [
            ['Studio key pieces', 'Physical sample'],
            ['Detailed drawings', 'Shop drawing'],
            ['Material specifications', 'Spec sheet'],
            ['Bill of materials', 'BOM'],
          ] },
          'We care about more than the look. Every item is engineered for performance and for cost, and we never design anything unless we know exactly how it will be made. The result is furniture with the right design, proportion and detail, at a very competitive cost.',
        ],
        figure: { shots: [{ name: 'finish-boards', label: 'Finish boards', hint: 'Finish boards laid out for the PPS run', ratio: '9 / 16' }], caption: 'Finish boards for the PPS run' },
      },
      {
        type: 'story', id: 'lean', num: '05 Built lean',
        title: 'A lean team, and every tool we know.',
        copy: [
          'Our team is lean, and we use every tool we know, from hand sketches to 3D printing, from sanding to CNC.',
          'Because we draw and cost every piece in detail, we get the best possible prices from our factories. Because we run lean, we add only a low markup to the factory cost.',
          { quote: "That's how we bring beautiful furniture to market at scale, at an accessible price." },
        ],
        figure: { shots: [{ name: 'office', label: 'Studio office', hint: 'Drafting and rendering in the studio office', ratio: '16 / 9' }], caption: 'Drafting and rendering, studio office' },
        figureFirst: true,
      },
      {
        type: 'story', id: 'qc', tone: 'alt', num: '06 Quality control',
        title: 'Checked, barcoded, followed to the water.',
        copy: [
          'Our QC team checks and documents every piece to our standards. Each item is barcoded and each carton is marked. We can trace every item, the container it went into, and that container on the water.',
          { trace: ['Item barcoded', 'Carton marked', 'Container loaded', 'On the water'] },
          "We're building a dashboard that puts production status, order status, shipping status and every document online, in real time.",
        ],
        figure: showQcPhoto ? { shots: [{ name: 'qc', label: 'Photo needed · QC inspection', hint: 'Inspector checking a piece, barcode label visible', ratio: '4 / 5' }] } : undefined,
      },
      {
        type: 'story', tone: 'goal', num: 'Our goal is simple',
        title: 'Well-designed, on-trend furniture, built right and shipped direct by the container, at scale.',
        figure: { shots: [{ name: 'finished-piece', label: 'Finished piece', hint: 'A finished dining chair with a woven seat', ratio: '37 / 40' }], caption: 'Finished piece' },
        figureFirst: true,
        link: { href: '/request-catalog', label: 'Request catalog' },
      },
    ],
  },
  {
    // Layout and copy from TalaStudio_Who_We_Are.pdf. Founder photos are in public/team/.
    path: 'who-we-are',
    title: 'Who we are',
    description: 'TalaStudio was founded by Evin Oshima and David Wormald: fresh, detailed furniture design brought to market in volume, at a very competitive price. Jepara, Indonesia.',
    blocks: [
      {
        type: 'rows',
        eyebrow: 'Jepara, Indonesia',
        title: 'Who We Are',
        rows: [
          ['Our story', [
            'TalaStudio was founded by Evin Oshima and David Wormald. They met 23 years ago, when David, then working for Palliser, walked into Evin’s booth at a furniture fair in Jakarta. Evin went on to design several collections for him, and the two have worked together on and off ever since.',
          ]],
          ['Why TalaStudio', [
            'Too much furniture at volume price points looked the same as it did 20 or 30 years ago. We believed buyers shouldn’t have to choose between fresh design and a competitive price. So we created TalaStudio to develop design-forward, lovingly detailed, interesting products and bring them to market in volume, at a very competitive price.',
            'Together we bring more than 65 years of combined industry experience, a skilled in-house studio team, and a network of large factories we have worked with for decades.',
          ]],
          ['Our design point of view', [
            'We’re not locked into a single look. Our first collection takes its cue from 1960s Los Angeles, but our taste is eclectic: we watch trends closely without being bound by them. What stays constant is our attention to proportion, detail and price.',
            'We welcome ideas from our customers and can quickly develop new designs to fill a gap in their line. Our job is to give buyers furniture that fits their customers’ homes and the way they live.',
          ]],
        ],
        peopleLabel: 'The founders',
        people: [
          { name: 'Evin Oshima', role: 'Director of Operations', photo: '/team/evin-oshima-2.jpg',
            text: 'Evin handles operations and design. He is a designer and a maker who has been in design and furniture since 1988, and has run factories making hotel interiors in China, the Philippines and Indonesia. He lives in Jepara, Indonesia, where he recently converted his factory into the TalaStudio studio.' },
          { name: 'David Wormald', role: 'Director of Marketing', photo: '/team/david-wormald.jpg',
            text: 'David has been in the furniture industry for more than 30 years. He has worked with Palliser, Lane, Natuzzi and other major brands, as well as large manufacturers across Asia. As Director of Marketing, he leads sales, marketing, product development and sourcing, along with upholstery, trend and merchandising. David is based in Vietnam.' },
        ],
        outro: 'To see how we design and build, visit <a href="/how-we-work">How We Work</a>. To talk about a collection, <a href="/contact">contact us</a>.',
      },
    ],
  },
  {
    path: 'contact',
    title: 'Contact',
    description: 'Talk to TalaStudio about a product or an idea: container orders, new designs or a showroom visit in Jepara, Indonesia.',
    blocks: [
      {
        type: 'contact',
        eyebrow: 'Contact',
        title: 'Talk to us.',
        lede: "For information, don't hesitate to reach out! Need a product, or have an idea? Give us a few days and we will create it.",
        people: [
          { role: 'Director of Sales', name: 'David Wormald', email: 'david@talastudio.net', phone: '+61-448-440-418' },
          { role: 'Director of Operations', name: 'Evin Oshima', email: 'evin@talastudio.net', phone: '+62-812-3661-7795' },
        ],
        cards: [
          { title: 'General', html: '<a href="mailto:hello@talastudio.net">hello@talastudio.net</a>' },
          { title: 'Showroom visit', html: 'Jepara, Central Java, Indonesia. By appointment. Email us with your dates and we will confirm.' },
        ],
      },
    ],
  },
  {
    path: 'insights',
    title: 'Insights',
    description: 'Articles from the TalaStudio studio on design, engineering, and buying furniture by the container from Indonesia.',
    blocks: [
      { type: 'hero', eyebrow: 'Insights', title: 'Notes from the studio.' },
      { type: 'posts', empty: 'First articles coming soon.' },
    ],
  },
  {
    path: 'sourcing-from-indonesia',
    title: 'Sourcing furniture from Indonesia',
    description: "A buyer's guide to sourcing furniture from Indonesia: Jepara's furniture heritage, how we work with partner factories, and how a container order works.",
    blocks: [
      { type: 'hero', eyebrow: 'Buyer guide', title: 'Sourcing furniture from Indonesia.', lede: 'What to know before you source from Indonesia, and how TalaStudio works with its makers.' },
      {
        // Copy deck v2. Confirm with Evin: partner factories are in the Jepara region.
        type: 'prose',
        items: [
          { h: 'Why Jepara' },
          { p: "Jepara, on the north coast of Central Java, is Indonesia's best known furniture town. Woodworking is the local trade, and skilled makers are close to where the wood is worked." },
          { h: 'What you can source' },
          { p: 'Indonesian makers work in solid woods such as teak and mahogany, alongside veneers and mixed materials. Ask each supplier what species, grade and finish they use, and get it in writing.' },
          { h: 'How to import, in short' },
          { ol: [
            'Choose pieces and confirm the minimum order.',
            'Agree terms, usually FOB Indonesia.',
            'Check production and inspect before loading.',
            'Arrange freight and customs for your market.',
          ] },
          { p: 'See <a href="/how-a-container-works">how a container works</a> with us.', when: '/how-a-container-works' },
          { h: 'How TalaStudio works with makers' },
          { p: 'We design and engineer every collection in our Jepara studio. Partner factories in the region build to our drawings. We inspect every piece before it ships, and you can see the QC photos online.' },
        ],
      },
      { type: 'cta', title: 'Talk to us.', text: 'Ask us about your range and your market.' },
    ],
  },
  {
    path: 'buyer-dashboard',
    title: 'Buyer dashboard demo',
    description: 'See how TalaStudio buyers follow orders, QC inspection photos and shipping online. A demo with sample data.',
    blocks: [
      { type: 'hero', eyebrow: 'Demo', title: 'Follow your order, step by step.', lede: 'Buyers see status, QC photos and shipping in one place. Everything below is sample data.' },
      { type: 'dashboard' },
      { type: 'cta', title: 'Want this for your orders?', text: 'Every buyer gets a dashboard like this.' },
    ],
  },
  {
    path: 'privacy-and-terms',
    title: 'Privacy and terms',
    description: "TalaStudio's privacy policy and terms of use: what the catalog form collects, how we protect it, your rights, and the terms for using this site.",
    blocks: [
      { type: 'hero', eyebrow: 'Legal', title: 'Privacy and terms.', lede: `Last updated ${updated}.` },
      {
        type: 'legal',
        parts: [
          { id: 'privacy', title: 'Privacy policy', intro: 'This policy explains how TalaStudio handles personal data collected through this website, our catalog requests, our buyer accounts and our business outreach.', items: privacy },
          { id: 'terms', title: 'Terms of use', intro: 'These terms apply to your use of talastudio.net.', items: terms },
        ],
      },
    ],
  },
];
