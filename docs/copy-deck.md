# Website copy

Reference copy for the TalaStudio website, page by page and section by section, as it appears on the site.
Audience: trade buyers (retailers, buying groups and distributors), mainly in the US.

**Writing guidelines**

- Direct and confident. Short sentences. Concrete details over adjectives.
- No prices, discounts or hype words.
- Renders and studio shots only. Every product image is watermarked.
- Show part of each collection. The full range is in the catalog.

---

## 0. Global elements

**Site name:** TalaStudio
**Tagline:** Designed where it's made. The forward look, at a value price.

**Header:** Collections · How we work · The Studio · How a container works · Partner with us · Contact · Request catalog
**Mobile menu:** same links, with a Request catalog button at the bottom.

**Footer**
- Column 1, TalaStudio: *Furniture designed, engineered and costed in one place. Jepara, Indonesia.*
- Column 2, Explore: Collections · The Studio, Jepara · How we work · Insights
- Column 3, Buyers: How a container works · Sourcing from Indonesia · Partner with us · Buyer dashboard demo
- Column 4, Contact: hello@talastudio.net · Request catalog · Book a showroom visit · Privacy and terms
- Small print: © 2026 TalaStudio. All designs are protected.

**Buttons:** Request catalog (primary) · View collections (secondary) · Book a visit · Explore · View details
**Closing band used on most pages:** headline "See the full range." · text "Tell us who you are and we will send the catalog." · button Request catalog

**Image alt text patterns**
- Collection hero: "{Collection name} collection, {room} render"
- Product: "{Product name}, {finish}, front view"
- Studio shot: "TalaStudio design studio, Jepara"
- Never describe people. There are none.

**404 page**
- Headline: This page isn't here.
- Text: It may have moved. Try the collections or request the catalog.
- Buttons: View collections · Request catalog

---

## 1. Home `/`

**Meta title:** TalaStudio | The forward look, at a value price
**Meta description:** TalaStudio designs bedroom, living and dining furniture in Jepara, Indonesia and sells it by the container to retailers, buying groups and distributors.

### 1.1 Hero
- Eyebrow: Jepara, Indonesia
- H1: The forward look, at a value price.
- Text: TalaStudio designs furniture with the look the most forward retailers are selling. We price it where your customers actually buy.
- Buttons: Request catalog · View collections

### 1.2 Proof strip
1. **One place** · Design, engineering, costing
2. **Every piece checked** · Inspected before it ships
3. **Fully visible** · Orders and QC photos online
4. **Container direct** · Jepara to your warehouse

### 1.3 By space
- H2: By space · Link: All collections
- **Bedroom** · Rest, in calm shapes
- **Living** · Seating made to be sat in
- **Dining** · Tables made to gather round
- Tile link: Explore

### 1.4 Studio story
- Eyebrow: The studio
- H2: Designed where it's made.
- Text: We draw it, engineer it and price it in one place. We pick the joint, the finish and the hardware with the maker while the sketch is still wet. Then we check every piece before it ships.
- Links: See the studio · Our story

### 1.5 Collections
- Eyebrow: Collections
- H2: Designed in-house.
- Text: A selection from the range. The full range is in the catalog.
- Link: Explore every collection
- Empty state: First collections arrive soon. Request the catalog to be first to see them.
- Card: room label · collection name · two-line description

### 1.6 Materials and finishes
- Eyebrow: Materials and finishes
- H2: Built to be used, made to last.
- **Solid wood** · Worked in Jepara, where the craft is local.
- **Finishes** · Developed and tested in the studio.
- **Joinery** · Engineered while we design, not after.
-

### 1.7 Insights teaser
- H2: Insights · Link: All articles
- Shows the latest three articles: date, title, one-line summary

### 1.8 For buyers
- Eyebrow: For buyers
- H2: Mix collections in one container.
- Text: For retailers, buying groups and distributors. Regional exclusivity is available and agreed case by case.
- Buttons: How a container works · Partner with us

### 1.9 Visit
- Eyebrow: Visit us
- H2: See, sit and feel the range.
- Text: Our showroom is the Jepara studio. Visits are by appointment.
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

### 2.1 Intro
- Eyebrow: Collections
- H1: Designed in-house.
- Text: Each collection is drawn, engineered and costed in our Jepara studio. A selection is shown here. The full range is in the catalog.

### 2.2 Room filter
- Chips: All · Bedroom · Living · Dining

### 2.3 Room sections
- H2: Bedroom · Living · Dining
- Card: room label · collection name · two-line description (all cards link to the collection page)
- Empty state: Collections are being rendered now. They appear here as each one is ready.

### 2.4 Closing band
- H2: See the full range. · Text: Tell us who you are and we will send the catalog. · Button: Request catalog

---

## 3. Collection page `/collections/{slug}` (template)

**Meta title pattern:** {Collection name} | TalaStudio
**Meta description pattern:** {Collection name}: a TalaStudio {room} collection, designed and engineered in Jepara. {First sentence of the description}

### 3.1 Hero
- Eyebrow: {Room} collection
- H1: {Collection name}
- Image: collection hero render, watermarked

### 3.2 Intro
- Eyebrow: The collection
- Text: two sentences from the database field `description`

### 3.3 Pieces
- H2: The {Collection name} pieces
- Card: piece name · "{n} finishes" · View details
- Empty state: Pieces are added as they are finalised.

### 3.4 Materials and finishes
- H3: Materials · H3: Finishes (lists from the database)

### 3.5 Closing band
- H2: The full {Collection name} range is in the catalog. · Button: Request catalog

**Writing rule for collection descriptions (stored in Supabase):** two sentences, under 30 words. Sentence 1: the shape or idea. Sentence 2: how it is used or built. Concrete, no "beautiful" or "stunning".

---

## 4. Product page `/products/{slug}` (template)

**Meta title pattern:** {Product name} | TalaStudio
**Meta description pattern:** {Product name}, {collection} collection. Sizes, materials, finishes and container data from TalaStudio, Jepara.

### 4.1 Header block
- Eyebrow: collection name (links back)
- H1: product name
- Text: one or two plain sentences from the database
- Button: Request catalog

### 4.2 Details accordions
- **Specifications:** SKU · Width · Depth · Height (cm and inches) · Materials · Finishes
- **Carton and container:** Carton size · Carton weight · Volume (CBM) · Pieces per 40HQ · MOQ · Lead time

### 4.3 Complete the look
- H2: Complete the look · other pieces in the same collection

### 4.4 Closing band
- H2: See the full range. · Button: Request catalog

**Writing rule for product descriptions:** one or two plain sentences on what it is and how it is built. No prices. No "perfect for".

---

## 5. How we work `/how-we-work`

**Meta title:** How we work | TalaStudio
**Meta description:** TalaStudio engineers and costs each piece as it designs it, checks every piece, and shows buyers their orders online. The forward look at a value price.

### 5.1 Hero
- Eyebrow: How we work
- H1: Designed where it's made.
- Text: We do not draw a piece and then throw it over the wall. We work it out with the makers from the first sketch.

### 5.2 How we do it
- H2: How we do it
- **We engineer while we design.** Construction, materials and hardware are worked out alongside the look.
- **We cost as we go.** Every line is priced before the design is final, so the value is built in from the start.

### 5.3 Six steps
- H2: Six steps, one place.
1. **Design** · The studio draws each collection in Jepara.
2. **Engineer** · Construction, materials and hardware are worked out while we draw.
3. **Cost** · Every line is priced before the design is final.
4. **Build** · Our partner factories build to our drawings, with us checking at each step.
5. **Check** · We inspect every piece, not a sample.
6. **Show** · You follow orders, QC photos and shipping online.

### 5.4 What you can count on
- H2: What you can count on
- **Every piece checked.** We inspect every piece, not a sample.
- **Fully transparent, fully online.** See your order status, inspections and shipping as they happen.
- **Lean by design.** Low overhead, and no layers between you and us.
- **Fast.** Decisions, samples and shipments move without waiting.

### 5.5 Closing band

---

## 6. The Studio, Jepara `/the-studio`

**Meta title:** The Studio, Jepara | TalaStudio
**Meta description:** TalaStudio's design studio and showroom in Jepara, Indonesia. See how we design, engineer and check every piece, and book a visit.

### 6.1 Hero
- Eyebrow: Jepara, Central Java
- H1: Our design studio, in Jepara.
- Text: This is where we draw, engineer and cost every collection. Design, engineering and costing happen in one place, so you get the forward look at a value price.

### 6.2 Studio image
- Wide studio shot. No people.

### 6.3 One room, four jobs
- H2: One room, four jobs.
- **Design** · Collections are drawn here, by our own studio.
- **Engineering** · Joints, finishes and cartons are worked out while we design, not after.
- **Costing** · We cost each piece as it takes shape, so there are no surprises later.
- **Inspection** · Every piece is checked before it is packed and shipped.

### 6.4 The showroom
- Eyebrow: The showroom
- H2: See, sit and feel the range.
- Text: Our showroom is in the studio. Visits are by appointment, so we can walk you through the collections at your pace.
- Button: Book a visit

---

## 7. Buyer dashboard (demo) `/buyer-dashboard`

**Meta title:** Buyer dashboard demo | TalaStudio
**Meta description:** See how TalaStudio buyers follow orders, QC inspection photos and shipping online. A demo with sample data.

### 7.1 Hero
- Eyebrow: Demo
- H1: Follow your order, step by step.
- Text: Buyers see status, QC photos and shipping in one place. Everything below is sample data.

### 7.2 Demo panel
- Badge: Sample data. Not a real order.
- Order header: company name · "Order DEMO-0001" · status
- Stages: Confirmed · In production · Inspection · Loaded · Shipped
- H3: Items · H3: QC inspections · H3: Shipping (container, ETD, ETA)

### 7.3 Closing band
- H2: Want this for your orders? · Text: Every buyer gets a dashboard like this. · Button: Request catalog

---

## 8. Partner with us `/partner-with-us`

**Meta title:** Partner with us | TalaStudio
**Meta description:** TalaStudio offers regional exclusivity to retailers, buying groups and distributors. Terms are negotiated case by case.

### 8.1 Hero
- Eyebrow: Partner with us
- H1: Your region. Your range.
- Text: We offer regional exclusivity to the right partners. Terms are negotiated case by case.

### 8.2 Who we work with
- H2: Who we work with
- Retailers · Buying groups · Distributors

### 8.3 What exclusivity means
- H2: What exclusivity means
- Text: A named territory where you are our only partner for an agreed range. We agree scope, duration and volumes together. There is no standard deal.
- Button: Start the conversation

---

## 9. How a container works `/how-a-container-works`

**Meta title:** How a container works | TalaStudio
**Meta description:** How buying a TalaStudio container works: MOQ, mixing collections, lead times, FOB terms, carton data and inspection, direct from Jepara.

### 9.1 Hero
- Eyebrow: For buyers
- H1: How a container works.
- Text: Direct from our studio in Jepara to your warehouse. Here is what to expect.

### 9.2 Six topics
- H2: What to expect.
- **MOQ** · Each product page shows its minimum order quantity. You build a container from many pieces, not one.
- **Mix collections** · Combine bedroom, living and dining pieces in a single container to fit your floor plan.
- **Lead time** · Each product page shows its lead time. We confirm the schedule when you place the order.
- **FOB** · Prices are quoted FOB Indonesia. You get them in the catalog and in your quote, not on this site.
- **Cartons and CBM** · Every piece lists carton size, weight, CBM and pieces per 40HQ, so you can plan the load.
- **Inspection** · We check every piece. You see the QC photos online before the container ships.

### 9.3 From order to dock
- H2: From order to dock.
1. Request the catalog and choose your pieces.
2. We send a quote and confirm lead time.
3. We build, check and photograph each piece.
4. You review the QC photos online.
5. The container is loaded and ships.

### 9.4 Closing band
- H2: Plan your first container. · Text: Tell us who you are and we will send the catalog. · Button: Request catalog

---

## 10. Sourcing from Indonesia `/sourcing-from-indonesia`

**Meta title:** Sourcing furniture from Indonesia | TalaStudio
**Meta description:** A buyer's guide to sourcing furniture from Indonesia: Jepara's furniture heritage, how we work with partner factories, and how a container order works.

### 10.1 Hero
- Eyebrow: Buyer guide
- H1: Sourcing furniture from Indonesia.
- Text: What to know before you source from Indonesia, and how TalaStudio works with its makers.

### 10.2 Why Jepara
Jepara, on the north coast of Central Java, is Indonesia's best known furniture town. Woodworking is the local trade, and skilled makers are close to where the wood is worked.

### 10.3 What you can source
Indonesian makers work in solid woods such as teak and mahogany, alongside veneers and mixed materials. Ask each supplier what species, grade and finish they use, and get it in writing.

### 10.4 How to import, in short
1. Choose pieces and confirm the minimum order.
2. Agree terms, usually FOB Indonesia.
3. Check production and inspect before loading.
4. Arrange freight and customs for your market.
Link: See how a container works with us.

### 10.5 How TalaStudio works with makers
We design and engineer every collection in our Jepara studio. Partner factories in the region build to our drawings. We inspect every piece before it ships, and you can see the QC photos online.

### 10.6 Closing band
- H2: Talk to us. · Text: Ask us about your range and your market. · Button: Request catalog

---

## 11. About `/about`

**Meta title:** About | TalaStudio
**Meta description:** TalaStudio designs furniture where it is made, in Jepara, Indonesia: the forward look at a value price, every piece checked, fully online.

### 11.1 Hero
- Eyebrow: About
- H1: Designed where it's made.
- Text: TalaStudio designs furniture with the look the most forward retailers are selling. We price it where your customers actually buy.

### 11.2 Our story
- H2: Our story.

Most furniture starts as a drawing in one country and becomes a problem in another. A designer sends a sketch overseas. A factory works out how to build it. Somewhere between the two, the price climbs, the details soften, and months slip by.

We decided to close that gap.

TalaStudio is a design and engineering studio in Jepara, Indonesia, working side by side with the factories that build our collections. We pick the joint, the veneer and the hardware with the maker while the sketch is still wet. We price it before we fall in love with it. If a curve adds cost without adding beauty, it goes. If a detail makes the piece, we find a way to keep it and keep the price.

That's how we can give you the look the most forward retailers are selling, at a price your customers will actually pay.

Then we watch over it. Every piece is checked, not a sample from the batch. Every step is online, so you see what we see, from the first cut to the container door. No layers, no waiting for answers. We keep overhead low and move fast.

We love this work: the first prototype off the line, the finish that comes out exactly right, the container that lands on time.

**Closing line:** Fresh design, honest pricing, nothing hidden. Let's build your first container.
Button: Request catalog


### 11.3 What you can count on
Same four points as How we work (every piece checked, fully transparent and online, lean by design, fast).

### 11.4 The team
- H2: The team
- **Evin** · Owner and designer
- **David** · Sales and buyer relations

### 11.5 Closing band

---

## 12. Insights `/insights`

**Meta title:** Insights | TalaStudio
**Meta description:** Articles from the TalaStudio studio on design, engineering, and buying furniture by the container from Indonesia.

### 12.1 Hero
- Eyebrow: Insights
- H1: Notes from the studio.

### 12.2 Article list
- Each entry: date · title · one-line summary
- Empty state: First articles coming soon.

### 12.3 Article page
- Eyebrow: Insights · {date}
- H1: article title
- Closing band: See the full range. · Request catalog

---

## 13. Request catalog `/request-catalog`

**Meta title:** Request the catalog | TalaStudio
**Meta description:** Request the TalaStudio catalog: the full bedroom, living and dining range, with sizes, materials and container data.

### 13.1 Intro
- Eyebrow: Catalog
- H1: Request the catalog.
- Text: The full range, with sizes, materials, finishes and container data. For retailers, buying groups and distributors.

### 13.2 Form
- Labels: Full name · Company · Country · Email · Phone · Buyer type (Retailer, Buying group, Distributor, Other) · Message
- Privacy line: By sending this you agree to our privacy policy. *(links to Privacy and terms)*
- Button: Send request

### 13.3 Messages
- While sending: Sending...
- Success: Thank you. We will send the catalog shortly.
- Error: Something went wrong. Please email hello@talastudio.net.

---

## 14. Contact `/contact`

**Meta title:** Contact | TalaStudio
**Meta description:** Talk to TalaStudio about container orders, regional exclusivity or a showroom visit in Jepara, Indonesia.

### 14.1 Intro
- Eyebrow: Contact
- H1: Talk to us.
- Text: Container orders, exclusivity, or a visit to the studio. Send us a note and we will get back to you.

### 14.2 Cards
- **Email** · hello@talastudio.net
- **Showroom visit** · Jepara, Central Java, Indonesia. By appointment. Email us with your dates and we will confirm.
- **Want the catalog?** · Request it here.

---

## 15. Privacy and terms `/privacy-and-terms`

**Meta title:** Privacy and terms | TalaStudio
**Meta description:** TalaStudio's privacy policy and terms of use: what the catalog form collects, how we protect it, your rights, and the terms for using this site.

Legal text. It is set out on the page itself and is not repeated here.

- **Hero:** Eyebrow Legal · H1 Privacy and terms. · "Last updated {date}."
- **Privacy policy, 13 sections:** Who we are · What we collect · Where it comes from · Why we use it · Marketing emails · Who we share it with · International transfers · How long we keep it · Security · Your rights and choices · Cookies and analytics · Not for children · Changes to this policy
- **Terms of use, 13 sections:** Trade website · No offer to sell, no prices · Orders and sales terms · Regional exclusivity · Buyer accounts and dashboard · Product information · Intellectual property · Confidential materials · Acceptable use · Disclaimer and limits of liability · Third-party links · Governing law · Changes and contact

---

## Link preview text (LinkedIn, WhatsApp, email)

| Page | Preview title | Preview line |
| --- | --- | --- |
| Home | TalaStudio: the forward look, at a value price | Furniture designed in Jepara, sold by the container. |
| Collections | TalaStudio collections | Bedroom, living and dining, designed in-house. |
| How we work | Designed where it's made | We engineer and cost as we design, and check every piece. |
| The Studio | The TalaStudio design studio, Jepara | Where we draw, engineer and check every collection. |
| Request catalog | Request the TalaStudio catalog | The full range, with container data. |
