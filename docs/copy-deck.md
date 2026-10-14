# TalaStudio website copy deck

**Status: DRAFT v2 for review by Evin, Rian and Azkia.** Nothing here is on the live site until approved.
**v2 changes (14 Oct):** copy now says TalaStudio designs and engineers, and partner factories build to our drawings. No "our factory" or "we build" claims. The Indonesia vs Vietnam section is removed. No years number.
**Audience on the site:** trade buyers (owners, buyers, merchandisers at retailers, buying groups and distributors), mainly in the US.
**Date:** 14 October 2026

## How to review

- Mark each block **OK**, **EDIT** (with your change) or **CUT**.
- Anything in `[CONFIRM: ...]` is a fact we have not confirmed. Do not publish it until it is.
- Copy follows the voice in `talastudio-stack/06-brand-voice.md`: direct, short sentences, concrete details, no hype.

## Rules applied to every line

- No prices, margins, costs or discounts.
- Nothing about other businesses, partners or ownership.
- No claims we can't prove: no certifications, volumes or named customers. No number of years until Evin decides how to phrase it.
- TalaStudio is a design and engineering company. Production is by partner factories. Never say "our factory", "we build" or "we make".
- No people. Renders and studio shots only.
- Show part of each collection. The full range is in the catalog.
- Words used on purpose: "forward look", "value price", "designed where it's made", "every piece checked".
- Words avoided: revolutionary, world-class, passionate, game-changing, premium, luxury, best-in-class.

## Open facts

**Answered (14 Oct)**
- **Production:** TalaStudio designs and engineers. Partner factories build to our drawings. We inspect every piece. Copy follows this.
- **Protected designs:** confirmed as yes by Azkia. Keep "protected by copyright" in the footer. `[CONFIRM with Evin]` before launch.
- **Vietnam comparison:** removed. The page now focuses on TalaStudio.

**Still open**
1. **[CONFIRM: years]** There is a number of years in furniture production, and the plan is for TalaStudio to become in-house production as a new company. Do not use the number until Evin decides how to word it. It must describe the TalaStudio team, and must not point to another business.
2. **[CONFIRM: studio wording]** The brief says "our factory turned into a design studio and showroom". That conflicts with partner factories. This deck uses "our design studio and showroom in Jepara". Evin should confirm.
3. **[CONFIRM: partner factories in Jepara]** Copy says partner factories are in the Jepara region. Confirm.
4. **[CONFIRM: first shipment]** "First container ships in early 2027" is optional on Home.
5. **[CONFIRM: dashboard]** Needs Evin's approval. Copy says buyers get an online dashboard. The page shows a demo with sample data. Live version due by February 2027.

---

## Global

**Site name:** TalaStudio
**Tagline:** Designed where it's made. The forward look, at a value price.

**Header links:** Collections · How we work · The Studio · How a container works · Partner with us · Contact · Request catalog

**Footer description:** Furniture designed, engineered and costed in one place. Jepara, Indonesia.
**Footer small print:** © 2026 TalaStudio. All designs are protected by copyright. `[CONFIRM with Evin]`

**Primary button:** Request catalog
**Secondary button:** View collections

**404 page**
- Headline: This page isn't here.
- Text: It may have moved. Try the collections or request the catalog.
- Buttons: View collections · Request catalog

---

## 1. Home

**Meta title:** TalaStudio | The forward look, at a value price
**Meta description:** TalaStudio designs bedroom, living and dining furniture in Jepara, Indonesia and sells it by the container to retailers, buying groups and distributors.

### Hero
- Eyebrow: Jepara, Indonesia
- Headline: The forward look, at a value price.
- Text: TalaStudio designs furniture with the look the most forward retailers are selling. We price it where your customers actually buy.
- Buttons: Request catalog · View collections

### Proof strip (4 points)
1. **One place** — Design, engineering and costing together
2. **Every piece checked** — Inspected before it ships
3. **Fully visible** — Orders and QC photos online
4. **Container direct** — Jepara to your warehouse

### By space (3 tiles)
- Section heading: By space
- Link: All collections
- **Bedroom** — Rest, in calm shapes.
- **Living** — Seating made to be sat in.
- **Dining** — Tables made to gather round.
- Tile link: Explore

### Studio story
- Eyebrow: The studio
- Headline: Designed where it's made.
- Text: We draw it, engineer it and price it in one place. We pick the joint, the finish and the hardware with the maker while the sketch is still wet. Then we check every piece before it ships.
- Links: See the studio · Our story

### Collections
- Eyebrow: Collections
- Headline: Designed in-house.
- Text: A selection from the range. The full range is in the catalog.
- Link: Explore every collection
- Empty state (before data): First collections arrive soon. Request the catalog to be first to see them.

### Materials and finishes (3 tiles)
- Eyebrow: Materials and finishes
- Headline: Built to be used, made to last.
- **Solid wood** — Worked in Jepara, where the craft is local.
- **Finishes** — Developed and tested in the studio.
- **Joinery** — Engineered while we design, not after.

### Insights teaser
- Heading: Insights
- Link: All articles
- *(shows the latest three articles from the Insights page)*

### For buyers
- Eyebrow: For buyers
- Headline: Mix collections in one container.
- Text: For retailers, buying groups and distributors. Regional exclusivity is available and agreed case by case.
- Buttons: How a container works · Partner with us

### Visit
- Eyebrow: Visit us
- Headline: See, sit and feel the range.
- Text: Our showroom is the Jepara studio. Visits are by appointment.
- Button: Book a visit

### Catalog
- Eyebrow: Catalog
- Headline: The full range, in one catalog.
- Text: Sizes, materials, finishes and container data for every piece. Tell us who you are and we will send it.
- Optional line: `[CONFIRM: first shipment]` Our first container ships in early 2027.
- Button: Request catalog

---

## 2. Collections (index)

**Meta title:** Collections | TalaStudio
**Meta description:** Bedroom, living and dining collections designed and engineered in Jepara, Indonesia. A selection is shown here. The full range is in the catalog.

- Eyebrow: Collections
- Headline: Designed in-house.
- Intro: Each collection is drawn, engineered and costed in our Jepara studio. A selection is shown here. The full range is in the catalog.
- Filter chips: All · Bedroom · Living · Dining
- Section headings: Bedroom · Living · Dining
- Card pattern: room label · collection name · two-line description · (whole card is a link)
- Empty state: Collections are being rendered now. They appear here as each one is ready.
- Closing band: **See the full range.** Tell us who you are and we will send the catalog. [Request catalog]

---

## 3. Collection page (template)

**Meta title pattern:** {Collection name} | TalaStudio
**Meta description pattern:** {Collection name}: a TalaStudio {room} collection, designed and engineered in Jepara. {First sentence of description}.

- Hero: collection render, eyebrow "{Room} collection", headline = collection name
- Intro (one or two sentences, from Supabase `description`)
- Heading: The {Collection name} pieces
- Card: piece name · "{n} finishes" · View details
- Empty state: Pieces are added as they are finalised.
- Materials and finishes lists (from Supabase)
- Closing band: **The full {Collection name} range is in the catalog.** [Request catalog]

**Writing rule for collection descriptions (stored in Supabase):**
- Two sentences, under 30 words.
- Sentence 1: the shape or idea. Sentence 2: how it is used or built.
- Concrete, no adjectives like "beautiful" or "stunning".
- Example pattern: *Soft curves and a low profile. A calm bedroom group in solid wood with a hand-rubbed finish.* (sample only, not a real collection)

---

## 4. Product page (template)

**Meta title pattern:** {Product name} | TalaStudio
**Meta description pattern:** {Product name}, {collection} collection. Sizes, materials, finishes and container data from TalaStudio, Jepara.

- Eyebrow: collection name (links back)
- Headline: product name
- Short description (from Supabase)
- Button: Request catalog
- Accordion 1: **Specifications** — SKU, width, depth, height (cm and inches), materials, finishes
- Accordion 2: **Carton and container** — carton size, weight, CBM, pieces per 40HQ, MOQ, lead time
- Section: **Complete the look** — other pieces in the same collection
- Closing band: **See the full range.** [Request catalog]

**Writing rule for product descriptions:** one or two plain sentences on what it is and how it is built. No prices. No "perfect for".

---

## 5. How we work

**Meta title:** How we work | TalaStudio
**Meta description:** TalaStudio engineers and costs each piece as it designs it, checks every piece, and shows buyers their orders online.

### Hero
- Eyebrow: How we work
- Headline: Designed where it's made.
- Text: We do not draw a piece and then throw it over the wall. We work it out with the makers from the first sketch.

### How we do it (2 points)
- **We engineer while we design.** Construction, materials and hardware are worked out alongside the look.
- **We cost as we go.** Every line is priced before the design is final, so the value is built in from the start.

### Six steps, one place
1. **Design** — The studio draws each collection in Jepara.
2. **Engineer** — Construction, materials and hardware are worked out while we draw.
3. **Cost** — Every line is priced before the design is final.
4. **Build** — Our partner factories build to our drawings, with us checking at each step.
5. **Check** — We inspect every piece, not a sample.
6. **Show** — You follow orders, QC photos and shipping online.

### What you can count on
- **Every piece checked.** We inspect every piece, not a sample.
- **Fully transparent, fully online.** See your order status, inspections and shipping as they happen.
- **Lean by design.** Low overhead, and no layers between you and us.
- **Fast.** Decisions, samples and shipments move without waiting.

- Closing band: **See the full range.** [Request catalog]

---

## 6. The Studio, Jepara

**Meta title:** The Studio, Jepara | TalaStudio
**Meta description:** TalaStudio's design studio and showroom in Jepara, Indonesia. See how we design, engineer and check every piece, and book a visit.

### Hero
- Eyebrow: Jepara, Central Java
- Headline: Our design studio, in Jepara. `[CONFIRM: studio wording]`
- Text: This is where we draw, engineer and cost every collection. Design, engineering and costing happen in one place, so you get the forward look at a value price.

### Image
- Wide studio shot: studio or showroom. No people.

### One room, four jobs
- **Design** — Collections are drawn here, by our own studio.
- **Engineering** — Joints, finishes and cartons are worked out while we design, not after.
- **Costing** — We cost each piece as it takes shape, so there are no surprises later.
- **Inspection** — Every piece is checked before it is packed and shipped.

### The showroom
- Eyebrow: The showroom
- Headline: See, sit and feel the range.
- Text: Our showroom is in the studio. Visits are by appointment, so we can walk you through the collections at your pace.
- Button: Book a visit

---

## 7. Buyer dashboard (demo)

**Meta title:** Buyer dashboard demo | TalaStudio
**Meta description:** See how TalaStudio buyers follow orders, QC inspection photos and shipping online. A demo with sample data.

- Eyebrow: Demo
- Headline: Follow your order, step by step.
- Text: Buyers see status, QC photos and shipping in one place. Everything below is sample data.
- Badge: Sample data. Not a real order.
- Panels: Items · QC inspections · Shipping
- Closing band: **Want this for your orders?** Every buyer gets a dashboard like this. [Request catalog]
- `[CONFIRM: dashboard]` Live dashboard due by February 2027. Do not say "live" until it is.

---

## 8. Partner with us

**Meta title:** Partner with us | TalaStudio
**Meta description:** TalaStudio offers regional exclusivity to retailers, buying groups and distributors. Terms are negotiated case by case.

### Hero
- Eyebrow: Partner with us
- Headline: Your region. Your range.
- Text: We offer regional exclusivity to the right partners. Terms are negotiated case by case.

### Who we work with
- Retailers
- Buying groups
- Distributors

### What exclusivity means
- Text: A named territory where you are our only partner for an agreed range. We agree scope, duration and volumes together. There is no standard deal.
- Button: Start the conversation

---

## 9. How a container works

**Meta title:** How a container works | TalaStudio
**Meta description:** How buying a TalaStudio container works: MOQ, mixing collections, lead times, FOB terms, carton data and inspection, direct from Jepara.

### Hero
- Eyebrow: For buyers
- Headline: How a container works.
- Text: Direct from our studio in Jepara to your warehouse. Here is what to expect.

### Six topics
- **MOQ** — Each product page shows its minimum order quantity. You build a container from many pieces, not one.
- **Mix collections** — Combine bedroom, living and dining pieces in a single container to fit your floor plan.
- **Lead time** — Each product page shows its lead time. We confirm the schedule when you place the order.
- **FOB** — Prices are quoted FOB Indonesia. You get them in the catalog and in your quote, not on this site.
- **Cartons and CBM** — Every piece lists carton size, weight, CBM and pieces per 40HQ, so you can plan the load.
- **Inspection** — We check every piece. You see the QC photos online before the container ships.

### From order to dock
1. Request the catalog and choose your pieces.
2. We send a quote and confirm lead time.
3. We build, check and photograph each piece.
4. You review the QC photos online.
5. The container is loaded and ships.

- Closing band: **Plan your first container.** [Request catalog]

---

## 10. Sourcing from Indonesia

**Meta title:** Sourcing furniture from Indonesia | TalaStudio
**Meta description:** A buyer's guide to sourcing furniture from Indonesia: Jepara's furniture heritage, how we work with partner factories, and how a container order works.

*(Search page. Target phrases: furniture made in Indonesia, how to import furniture from Indonesia, direct container furniture. Focus on TalaStudio, not on comparisons.)*

### Hero
- Eyebrow: Buyer guide
- Headline: Sourcing furniture from Indonesia.
- Text: What to know before you source from Indonesia, and how TalaStudio works with its makers.

### Sections
**Why Jepara**
Jepara, on the north coast of Central Java, is Indonesia's best known furniture town. Woodworking is the local trade, and skilled makers work close to the wood.

**What you can source**
Indonesian makers work in solid woods such as teak and mahogany, alongside veneers and mixed materials. Ask each supplier what species, grade and finish they use, and get it in writing.

**How to import, in short**
1. Choose pieces and confirm the minimum order.
2. Agree terms, usually FOB Indonesia.
3. Check production and inspect before loading.
4. Arrange freight and customs for your market.
See how a container works with us.

**How TalaStudio works with makers**
We design and engineer every collection in our Jepara studio. Partner factories in the region build to our drawings. We inspect every piece before it ships, and you can see the QC photos online. `[CONFIRM: partner factories in Jepara]`

- Closing band: **Talk to us.** Ask us about your range and your market. [Request catalog]

---

## 11. About

**Meta title:** About | TalaStudio
**Meta description:** TalaStudio designs furniture where it is made, in Jepara, Indonesia: the forward look at a value price, every piece checked, fully online.

### Hero
- Eyebrow: About
- Headline: Designed where it's made.
- Text: TalaStudio designs furniture with the look the most forward retailers are selling. We price it where your customers actually buy.

### Our story
Most furniture starts as a drawing in one country and becomes a problem in another. A designer sends a sketch overseas. A factory works out how to build it. Somewhere between the two, the price climbs, the details soften, and months slip by.

We decided to close that gap.

TalaStudio is a design and engineering studio in Jepara, Indonesia, working side by side with the factories that build our collections. We pick the joint, the veneer and the hardware with the maker while the sketch is still wet. We price it before we fall in love with it. If a curve adds cost without adding beauty, it goes. If a detail makes the piece, we find a way to keep it and keep the price.

That's how we can give you the look the most forward retailers are selling, at a price your customers will actually pay.

Then we watch over it. Every piece is checked, not a sample from the batch. Every step is online, so you see what we see, from the first cut to the container door. No layers, no waiting for answers. We keep overhead low and move fast.

We love this work: the first prototype off the line, the finish that comes out exactly right, the container that lands on time. `[CONFIRM: years]` Add the team's years in furniture only once Evin has agreed the wording.

**Closing line:** Fresh design, honest pricing, nothing hidden. Let's build your first container.
- Button: Request catalog

*(Note: "cost without adding beauty" uses the word cost in a design sense, not a figure. Evin to confirm.)*

### What you can count on
Same four points as How we work.

### The team
- **Evin** — Owner and designer
- **David** — Sales and buyer relations
- Closing band: **See the full range.** [Request catalog]

---

## 12. Insights

**Meta title:** Insights | TalaStudio
**Meta description:** Articles from the TalaStudio studio on design, engineering, and buying furniture by the container from Indonesia.

### Index page
- Eyebrow: Insights
- Headline: Notes from the studio.
- Empty state: First articles coming soon.
- Each entry: date · title · one-line summary

### Article page
- Eyebrow: Insights · {date}
- Headline: article title
- Closing band: **See the full range.** [Request catalog]

### First article ideas (one or two a month)
1. What goes in a mixed container
2. How we check every piece
3. Why we engineer while we design
4. How to compare real quotes from furniture suppliers
5. Reading carton data to plan a load
6. From render to container: the life of one piece

*Article rules: 400 to 700 words, plain language, one idea each, end with a link to the catalog.*

---

## 13. Request catalog

**Meta title:** Request the catalog | TalaStudio
**Meta description:** Request the TalaStudio catalog: the full bedroom, living and dining range, with sizes, materials, finishes and container data.

- Eyebrow: Catalog
- Headline: Request the catalog.
- Text: The full range, with sizes, materials, finishes and container data. For retailers, buying groups and distributors.

**Form labels:** Full name · Company · Country · Email · Phone (optional) · Buyer type (Retailer, Buying group, Distributor, Other) · Message (optional)
**Privacy line:** By sending this you agree to our privacy policy. *(link)*
**Button:** Send request
**While sending:** Sending...
**Success:** Thank you. We will send the catalog shortly.
**Error:** Something went wrong. Please email hello@talastudio.net.

---

## 14. Contact

**Meta title:** Contact | TalaStudio
**Meta description:** Talk to TalaStudio about container orders, regional exclusivity or a showroom visit in Jepara, Indonesia.

- Eyebrow: Contact
- Headline: Talk to us.
- Text: Container orders, exclusivity, or a visit to the studio. We reply within one working day. `[CONFIRM: reply time]`

**Cards**
- **Email** — hello@talastudio.net
- **Showroom visit** — Jepara, Central Java, Indonesia. By appointment. Email us with your dates and we will confirm.
- **Want the catalog?** — Request it here.

---

## 15. Privacy and terms

Legal text is already drafted on the site in `privacy-and-terms.astro`. **Do not rewrite it as marketing copy.** It needs a lawyer's review before launch.

**Meta title:** Privacy and terms | TalaStudio
**Meta description:** TalaStudio's privacy policy and terms of use: what the catalog form collects, how we protect it, your rights, and the terms for using this site.

---

## Link preview text (for LinkedIn, WhatsApp and email)

| Page | Preview title | Preview line |
| --- | --- | --- |
| Home | TalaStudio: the forward look, at a value price | Furniture designed in Jepara, sold by the container. |
| Collections | TalaStudio collections | Bedroom, living and dining, designed in-house. |
| How we work | Designed where it's made | We engineer and cost as we design, and check every piece. |
| The Studio | The TalaStudio design studio, Jepara | Where we draw, engineer and check every collection. |
| Request catalog | Request the TalaStudio catalog | The full range, with container data. |

*Preview image: `/og-default.jpg` (still to be made, 1200 x 630, a render crop with watermark, no people).*

---

## What changes on the live site after approval

If approved as written, these existing blocks are replaced or adjusted:
- Home: studio story block, collections intro, "For buyers" text
- Contact: "within one working day" line (only if confirmed)
- About: the story (partner-factory wording) and the footer "protected" line
- The Studio, How we work, Sourcing: partner-factory wording, Vietnam section removed
- Footer small print
- All meta titles and descriptions

Everything else in this deck matches what is already live.
