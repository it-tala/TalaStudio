# Website copy, storytelling draft (v3 proposal)

A storytelling pass over every page and section of the site, including each collection. It builds on `copy-deck.md` (v2, 14 Oct 2026) and does not replace it until approved. Draft of 16 Oct 2026, for Evin's review.

Audience: trade buyers (retailers, buying groups, distributors), mainly in the US. They land here from an outreach email and decide in a few seconds whether we look credible.

## The story in one thread

Most furniture is drawn in one place and solved in another. Somewhere between the two, the price climbs and the details soften. TalaStudio closes that gap: we draw, engineer and cost every piece together in Jepara, partner factories build to our drawings, we check every piece, and the buyer watches it all online until the container door.

Every page tells one beat of that thread, in this order:

| Beat | Page |
|---|---|
| The gap | Home (hero, studio), About |
| Closing the gap | How we work, The Studio |
| What it looks like | Collections, each collection page |
| What you can count on | Home, How we work, Buyer dashboard |
| How you buy | How a container works, Sourcing, Partner with us |
| Come and see | Contact, Request catalog |

## Voice rules (from 06 and 00, applied below)

- Direct and confident. Short sentences. Concrete details over adjectives.
- Never "our factory", "we build" or "we make". We design and engineer. Partner factories build.
- No prices, margins or discounts. No years, awards, certifications, volumes or named customers.
- No hype words: revolutionary, world-class, passionate, premium, luxury, stunning, beautiful.
- Never show or describe a full collection. The full range is in the catalog.
- No people in images, so no copy about faces or portraits.

---

## 0. Global

**Tagline:** Designed where it's made. The forward look, at a value price.

**Footer line:** Furniture designed, engineered and costed in one place. Jepara, Indonesia.

**Closing band (all pages unless a page has its own):**
- H2: See the full range.
- Text: Tell us who you are and we will send the catalog.
- Button: Request catalog

---

## 1. Home `/`

**Meta title:** TalaStudio | The forward look, at a value price
**Meta description:** TalaStudio designs bedroom, living and dining furniture in Jepara, Indonesia, and sells it by the container to retailers, buying groups and distributors.

### 1.1 Hero (the promise)
- Eyebrow: Jepara, Indonesia
- H1: The forward look, at a value price.
- Text: We draw it in Jepara, engineer it with the maker and check every piece before it ships. You get the look your customers are asking for, at a price they will pay.
- Buttons: Request catalog · View collections

### 1.2 Proof strip (the four facts)
1. **One place** · Drawn, engineered and costed together
2. **Every piece checked** · All of them, not a sample
3. **Fully visible** · Orders and QC photos online
4. **Container direct** · Jepara to your warehouse

### 1.3 By space (where it lives)
- H2: Start with the room.
- **Bedroom** · Rest, in calm shapes
- **Living** · Seating made to be sat in
- **Dining** · Tables made to gather round. Coming soon.
- Tile link: Explore

### 1.4 The studio (the gap, and how we close it)
- Eyebrow: The studio
- H2: Designed where it's made.
- Text: Most furniture is drawn in one place and solved in another. We do both in the same room. The joint, the finish and the hardware are chosen with the maker while the sketch is still wet.
- Links: See the studio · Our story

### 1.5 Collections (the proof you can see)
- Eyebrow: Collections
- H2: A first look at the range.
- Text: Living and bedroom are ready to view, and dining follows. Each collection is drawn, engineered and costed in our Jepara studio. The full range is in the catalog.
- Card: room label · name · two-sentence description · Includes · Explore the collection
- Link: Explore every collection
- Empty state: First collections arrive soon. Request the catalog to be first to see them.

### 1.6 Materials and finishes (what it is made of)
- Eyebrow: Materials and finishes
- H2: Built to be used, made to last.
- **Solid wood** · Worked in Jepara, where the craft is local.
- **Finishes** · Developed and tested in the studio, then fixed for the whole run.
- **Joinery** · Engineered while we design, not after.

### 1.7 Insights
- H2: What we have learned.
- Text: Short notes on buying, shipping and checking furniture from Indonesia.
- Link: All articles

### 1.8 For buyers (how you buy)
- Eyebrow: For buyers
- H2: Mix collections in one container.
- Text: Bedroom, living and dining can share one container, so your floor plan sets the load. Regional exclusivity is available and agreed case by case.
- Buttons: How a container works · Partner with us

### 1.9 Visit (come and see)
- Eyebrow: Visit us
- H2: See, sit and feel the range.
- Text: The showroom is our Jepara studio. Visits are by appointment, and we walk you through at your pace.
- Button: Book a visit

### 1.10 Catalog
- Eyebrow: Catalog
- H2: The full range, in one catalog.
- Text: Sizes, materials, finishes and container data for every piece. Tell us who you are and we will send it.
- Button: Request catalog

---

## 2. Collections `/collections`

**Meta title:** Collections | TalaStudio
**Meta description:** TalaStudio bedroom, living and dining collections, designed and engineered in Jepara, Indonesia. The full range is in the catalog.

### 2.1 Intro (full-screen, over the Silver Lake sofa)
- Eyebrow: Collections
- H1: Designed in-house.
- Text: Each collection starts as one drawing and is worked out with the maker before it is shown. Here is a selection. The full range is in the catalog.

### 2.2 By room (filter)
- Eyebrow: By room
- H2: Start with the room.
- Text: Bedroom and living are open. Dining is on its way. Every collection is built the same way: we choose the joint, the finish and the hardware with the maker while we draw, so the piece you see is the piece we build. Open a collection to see it up close.
- Chips: All · Bedroom · Living · Dining

### 2.3 Room strips
- **Bedroom** · H2: Bedroom · Line under the heading: Calm shapes for the room where the day ends.
- **Living** · H2: Living · Line: Seating made to be sat in.
- **Dining** · H2: Dining · Line: Tables made to gather round.
- Card: room label · name · two-sentence description

### 2.4 Dining, coming soon
- Label: Coming soon
- Title: New collection in progress
- Text: Dining is being drawn now. Request the catalog and we will tell you when it is ready.

### 2.5 Closing band
- H2: See the full range.
- Text: These are a few of our collections. Tell us who you are and we will send all of them.
- Button: Request catalog

---

## 3. Collection page template `/collections/{slug}`

**Meta title:** {Name} | TalaStudio
**Meta description:** {Name}: a TalaStudio {room} collection, designed and engineered in Jepara. {First sentence of the description}

### 3.1 Hero
- Eyebrow: {Room} collection
- H1: {Name}

### 3.2 The collection (the idea)
- Eyebrow: The collection
- Text: the two-sentence description (see section 4)

### 3.3 Gallery (look closer)
- H2: The {Name} collection.
- Line under the heading: Tap a photo to look closer.
- Caption: the item name only (Bed, Night Table, Sofa). No adjectives.

### 3.4 Pieces
- H2: The {Name} pieces
- Card: piece name · "{n} finishes" · View details
- Empty state: Pieces are added as they are finalised.

### 3.5 Materials and finishes
- H3: Materials · H3: Finishes
- Line: What goes into every piece, listed once.

### 3.6 Closing band
- H2: The full {Name} range is in the catalog.
- Text: Sizes, finishes and container data for every piece.
- Button: Request catalog

---

## 4. The collections (story per collection)

Rule: two sentences, under 30 words. Sentence 1 is the shape or idea. Sentence 2 is how it is used or built. No species of wood, no sizes, no claims we cannot back. Descriptions are written from the renders. Please check each against the real product before it goes live.

| Collection | Room | Description (shown on cards and collection page) |
|---|---|---|
| **Doheny** | Bedroom | A low bed with rounded edges and a padded headboard, with a night table, dresser, console and mirror. One calm bedroom, designed as a group. |
| **Temescal** | Bedroom | Straight lines and a slatted headboard on a light wood frame, with a night table to match. A quiet room that is easy to live in. |
| **Calabasas** | Bedroom | A cushioned headboard framed in dark wood, on a soft upholstered base with slim legs, with a night table to match. Warm and quiet. |
| **Beechwood** | Bedroom | A slim dark wood frame around cream upholstery, with a night table to match. Light on the eye, built for daily use. |
| **Brentwood** | Bedroom | A tall headboard in vertical channels and an upholstered footboard, set in a dark wood frame. A bed with presence and a calm line. |
| **Silver Lake** | Bedroom | An upholstered headboard with a notched dark wood frame, on slim tapered legs, with a night table that pairs two wood tones. Balanced and easy to place. |
| **Silver Lake** | Living | A sofa and armchair framed in sculpted dark wood, with deep, soft seats. Made for the room people actually sit in. |

**Card label ("Includes"):** the item names from the gallery captions, for example "Bed, Night Table".
**Alt text:** "{Name} collection, {room} render". Gallery: "{Name} {item}".
**Slug note:** the two Silver Lake collections share a name. Bedroom uses the address `silver-lake-bedroom`.

---

## 5. How we work `/how-we-work` (closing the gap)

**Meta title:** How we work | TalaStudio
**Meta description:** TalaStudio engineers and costs each piece as it designs it, checks every piece, and shows buyers their orders online.

### 5.1 Hero
- Eyebrow: How we work
- H1: Designed where it's made.
- Text: We do not draw a piece and throw it over the wall. We work it out with the makers from the first sketch.

### 5.2 The gap
- H2: Where the price climbs.
- Text: A sketch goes overseas. A factory works out how to build it. In between, the price rises, the details soften and months slip by. We moved the drawing board next to the makers.

### 5.3 How we do it
- H2: How we do it
- **We engineer while we design.** Construction, materials and hardware are worked out alongside the look.
- **We cost as we go.** Every line is priced before the design is final, so the value is built in from the start.

### 5.4 Six steps
- H2: Six steps, one place.
1. **Design** · The studio draws each collection in Jepara.
2. **Engineer** · Construction, materials and hardware are worked out while we draw.
3. **Cost** · Every line is priced before the design is final.
4. **Build** · Partner factories build to our drawings, with us checking at each step.
5. **Check** · We inspect every piece, not a sample.
6. **Show** · You follow orders, QC photos and shipping online.

### 5.5 What you can count on
- H2: What you can count on
- **Every piece checked.** All of them, not a sample from the batch.
- **Fully transparent, fully online.** Order status, inspections and shipping, as they happen.
- **Lean by design.** Low overhead and no layers between you and us.
- **Fast.** Decisions, samples and shipments move without waiting.

### 5.6 Closing band
- H2: Follow one piece from sketch to container.
- Text: See how the buyer dashboard shows each step.
- Buttons: See the dashboard demo · Request catalog

---

## 6. The Studio `/the-studio`

**Meta title:** The Studio, Jepara | TalaStudio
**Meta description:** TalaStudio's design studio and showroom in Jepara, Indonesia. See how we design, engineer and check every piece, and book a visit.

### 6.1 Hero
- Eyebrow: Jepara, Central Java
- H1: Our design studio, in Jepara.
- Text: This is where we draw, engineer and cost every collection. Design, engineering and costing happen in one place, so you get the forward look at a value price.

### 6.2 Workshop floor (photo)
- Line: Where the drawings meet the makers.
- Alt text: TalaStudio workshop floor

### 6.3 One room, four jobs
- H2: One room, four jobs.
- **Design** · Collections are drawn here, by our own studio.
- **Engineering** · Joints, finishes and cartons are worked out while we design, not after.
- **Costing** · We cost each piece as it takes shape, so there are no surprises later.
- **Inspection** · Every piece is checked before it is packed and shipped.

### 6.4 The showroom
- Eyebrow: The showroom
- H2: See, sit and feel the range.
- Text: The showroom is in the studio. Visits are by appointment, so we can walk you through the collections at your pace.
- Button: Book a visit

---

## 7. How a container works `/how-a-container-works` (how you buy)

**Meta title:** How a container works | TalaStudio
**Meta description:** MOQ, mixing collections, lead times, FOB terms, carton data and inspection for a TalaStudio container, direct from Jepara.

### 7.1 Hero
- Eyebrow: For buyers
- H1: How a container works.
- Text: Direct from our studio in Jepara to your warehouse. Here is what to expect, in plain words.

### 7.2 What to expect
- H2: What to expect.
- **MOQ** · Each product page shows its minimum order quantity. You build a container from many pieces, not one.
- **Mix collections** · Combine bedroom, living and dining pieces in one container to fit your floor plan.
- **Lead time** · Each product page shows its lead time. We confirm the schedule when you order.
- **FOB** · Prices are quoted FOB Indonesia. You get them in the catalog and in your quote, not on this site.
- **Cartons and CBM** · Every piece lists carton size, weight, CBM and pieces per 40HQ, so you can plan the load.
- **Inspection** · We check every piece. You see the QC photos online before the container ships.

### 7.3 From order to dock
- H2: From order to dock.
1. Request the catalog and choose your pieces.
2. We send a quote and confirm the lead time.
3. Partner factories build. We check and photograph each piece.
4. You review the QC photos online.
5. The container is loaded and ships.

### 7.4 Closing band
- H2: Plan your first container.
- Text: Tell us who you are and we will send the catalog.
- Button: Request catalog

---

## 8. Sourcing from Indonesia `/sourcing-from-indonesia`

**Meta title:** Sourcing furniture from Indonesia | TalaStudio
**Meta description:** A buyer's guide to sourcing furniture from Indonesia: Jepara, how we work with partner factories, and how a container order works.

- Hero · Eyebrow: Buyer guide · H1: Sourcing furniture from Indonesia. · Text: What to know before you source from Indonesia, and how TalaStudio works with its makers.
- **Why Jepara** · Jepara, on the north coast of Central Java, is Indonesia's best known furniture town. Woodworking is the local trade, so skilled makers work close to where the wood is cut.
- **What you can source** · Indonesian makers work in solid woods such as teak and mahogany, alongside veneers and mixed materials. Ask each supplier for the species, grade and finish, and get them in writing.
- **How to import, in short** · 1. Choose pieces and confirm the minimum order. 2. Agree terms, usually FOB Indonesia. 3. Check production and inspect before loading. 4. Arrange freight and customs for your market. Link: See how a container works with us.
- **How TalaStudio works with makers** · We design and engineer every collection in Jepara. Partner factories build to our drawings. We inspect every piece before it ships, and you see the QC photos online.
- Closing band · H2: Talk to us. · Text: Tell us about your range and your market. · Button: Request catalog

---

## 9. Partner with us `/partner-with-us`

**Meta title:** Partner with us | TalaStudio
**Meta description:** TalaStudio offers regional exclusivity to retailers, buying groups and distributors. Terms are agreed case by case.

- Hero · Eyebrow: Partner with us · H1: Your region. Your range. · Text: We offer regional exclusivity to the right partners. Terms are agreed case by case.
- **Who we work with** · H2: Who we work with · Retailers who want a look their customers have not seen everywhere. Buying groups who need one clear source for a range. Distributors who need steady supply and clear data.
- **What exclusivity means** · H2: What exclusivity means · A named territory where you are our only partner for an agreed range. We agree scope, duration and volumes together. There is no standard deal. · Button: Start the conversation

---

## 10. Buyer dashboard (demo) `/buyer-dashboard` (what you can count on, shown)

**Meta title:** Buyer dashboard demo | TalaStudio
**Meta description:** See how TalaStudio buyers follow orders, QC photos and shipping online. A demo with sample data.

- Hero · Eyebrow: Demo · H1: Follow your order, step by step. · Text: Status, QC photos and shipping in one place. Everything below is sample data.
- Badge: Sample data. Not a real order.
- Stages: Confirmed · In production · Inspection · Loaded · Shipped
- Closing band · H2: Want this for your orders? · Text: Every buyer gets a dashboard like this. · Button: Request catalog

---

## 11. About `/about` (the gap, told in full)

**Meta title:** About | TalaStudio
**Meta description:** TalaStudio designs furniture where it is made, in Jepara, Indonesia: the forward look at a value price, every piece checked, fully online.

- Hero · Eyebrow: About · H1: Designed where it's made. · Text: TalaStudio designs furniture with the look the most forward retailers are selling. We price it where your customers actually buy.
- **Our story** (kept from v2, it is the strongest page of the site):
  Most furniture starts as a drawing in one country and becomes a problem in another. A designer sends a sketch overseas. A factory works out how to build it. Somewhere between the two, the price climbs, the details soften, and months slip by.
  We decided to close that gap.
  TalaStudio is a design and engineering studio in Jepara, Indonesia, working side by side with the factories that build our collections. We pick the joint, the veneer and the hardware with the maker while the sketch is still wet. We price it before we fall in love with it. If a curve adds cost without adding beauty, it goes. If a detail makes the piece, we find a way to keep it and keep the price.
  Then we watch over it. Every piece is checked, not a sample from the batch. Every step is online, so you see what we see, from the first cut to the container door.
  Fresh design, honest pricing, nothing hidden. Let's build your first container.
- What you can count on · same four points as How we work
- **The team** · H2: The team · Evin, Owner and designer · David, Sales and buyer relations (name and role only)
- Closing band · H2: Let's build your first container. · Button: Request catalog

---

## 12. Contact `/contact` (come and see)

**Meta title:** Contact | TalaStudio
**Meta description:** Container orders, regional exclusivity, or a visit to the Jepara studio. Write to David at TalaStudio.

- Eyebrow: Contact · H1: Talk to us. · Text: Container orders, exclusivity or a visit to the studio. Send a note and David will reply.
- **Email** · hello@talastudio.net. David, buyer relations. (Name and email only. Needs Evin's approval.)
- **Showroom visit** · Jepara, Central Java, Indonesia. By appointment. Email us your dates and we will confirm.
- **Want the catalog?** · Request it here.

---

## 13. Request catalog `/request-catalog`

**Meta title:** Request the catalog | TalaStudio
**Meta description:** The full range with sizes, materials, finishes and container data, for retailers, buying groups and distributors.

- Eyebrow: Catalog · H1: Request the catalog. · Text: The full range with sizes, materials, finishes and container data. For retailers, buying groups and distributors.
- Form labels: Full name · Company · Country · Email · Phone · Buyer type · Message
- Success: Thank you. David will send the catalog shortly.
- Error: Something went wrong. Please try again or write to hello@talastudio.net.
- Privacy line: By sending this you agree to our privacy policy.

---

## 14. 404

- H1: This page isn't here.
- Text: It may have moved. Try the collections, or request the catalog.
- Buttons: View collections · Request catalog

---

## For Evin to decide

1. Whether David is named on Contact and in the form's success message.
2. "Partner factories build to our drawings" is used consistently. "Our factory" and "we build" are left out.
3. The collection descriptions in section 4 are written from the renders. Confirm each against the real piece, especially Calabasas, Beechwood and Brentwood.
4. Whether the "What we have learned" heading for Insights is acceptable, or the plain "Insights" stays.
5. Years of experience and "protected designs" remain out until approved.
