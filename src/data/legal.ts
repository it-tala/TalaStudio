// Privacy policy and terms of use, shown on /privacy-and-terms (see src/data/pages.ts).
// DRAFT v2 FOR LEGAL REVIEW. Built from the stack's real data flows (see README, "Privacy and terms").
// Still needs: the legal entity and address, retention periods, governing law (README open questions 1, 4, 5).
export const updated = '11 November 2026';

type Part = [id: string, title: string, paras: string[]][];

export const privacy: Part = [
  ['who-we-are', 'Who we are', [
    'TalaStudio ("we", "us") is a furniture design and engineering studio in Jepara, Indonesia. We design bedroom, living and dining collections, have them built by partner factories, and sell them by the container to trade buyers: retailers, buying groups and distributors.',
    'We are responsible for the personal data described here. Contact us at hello@talastudio.net for any privacy question. The company that deals with you is named in your quote or sales agreement.',
  ]],
  ['what-we-collect', 'What we collect', [
    'Catalog request form: your full name, company, country, email address, phone number (optional), buyer type and message.',
    'Buyer accounts and orders: if you become a buyer, your login details, the names and work contact details of your team, orders, production status, inspection photos, shipping details and the emails and notes about your account.',
    'Emails, calls and meetings with us: what you send, and notes we keep about the conversation.',
    'Website usage: the pages you view and for how long, the collections you look at, the site you came from, your IP address, the country it points to, and your device and browser type. We collect this ourselves, without advertising cookies.',
    'Visits from our emails: links in our business emails may carry a personal code. If you open one, the website usage above is linked to your business contact record.',
    'Social media: if you message or interact with our LinkedIn, Instagram or Pinterest accounts, we see what you send us and your public profile name.',
    'We do not run a shop and we do not collect payment card details on this site.',
  ]],
  ['where-it-comes-from', 'Where it comes from', [
    'Mostly from you: the form, your emails, your orders.',
    'For business outreach, we may also receive business contact details (name, job title, company, work email) from public sources and business contact databases. We use them only to contact you about our collections.',
  ]],
  ['why-we-use-it', 'Why we use it', [
    'To send you the catalog and reply to your request.',
    'To manage our relationship with your company and run your orders, including inspection and shipping.',
    'To send business-to-business messages about our collections, with a clear way to opt out (see Marketing emails).',
    'To keep the website secure, prevent spam and understand which pages are useful.',
    'To meet legal obligations.',
    'Where the law requires a legal basis, we rely on our legitimate interest in responding to business enquiries and promoting our products to businesses, on steps taken at your request before or under an agreement, and on legal obligation. We do not rely on consent for the form.',
  ]],
  ['marketing-emails', 'Marketing emails', [
    'We may email business contacts about our collections. Every commercial email identifies us, includes our contact details and has an unsubscribe link or a plain way to ask us to stop. We act on opt-outs promptly and keep a note so we do not contact you again.',
    'You can also write to hello@talastudio.net at any time.',
  ]],
  ['sharing', 'Who we share it with', [
    'Our sales team has access. We do not sell or rent your personal data.',
    'Service providers process data for us only to run the site, our communications and our sales work: database and hosting (Supabase, Cloudflare), email (Google Workspace and our email delivery provider), spam protection (Cloudflare Turnstile), analytics (Cloudflare Web Analytics, Google Search Console), and tools for business outreach and social media scheduling.',
    'Partner factories receive the product and order specifications they need to build and ship your order. We do not give them your personal data beyond what that requires.',
    'We may disclose data if required by law, to protect our rights, or in a sale or restructuring of the business.',
  ]],
  ['transfers', 'International transfers', [
    'We operate from Indonesia and sell mainly to buyers in the United States. Your data may be processed in other countries, including by providers in the United States and the European Union. Where required, we use appropriate safeguards such as standard contractual clauses.',
  ]],
  ['retention', 'How long we keep it', [
    'We keep catalog requests, prospect records and account data for as long as we have a business relationship or a reasonable prospect of one, then delete or anonymise them. We keep order, tax and accounting records for as long as the law requires. If you ask us to stop contacting you, we keep only enough to honour that request.',
  ]],
  ['security', 'Security', [
    'Data is stored in a managed database with row-level access controls. Access is limited to staff with a business need and protected by two-step login. Prices and financial records are restricted to named owners. No system is perfectly secure, but we take reasonable steps to protect your data.',
  ]],
  ['rights', 'Your rights and choices', [
    'Depending on where you live, you may have the right to access, correct, delete or export your personal data, to object to or restrict our use of it, to opt out of direct marketing, and to withdraw consent where we rely on it. This includes rights under data protection laws in Hong Kong, Indonesia, the EU and UK (GDPR and UK GDPR), and US state laws such as California\'s.',
    'Email hello@talastudio.net and we will respond within the time the law requires. You can also complain to your local data protection authority. We do not sell personal data and we do not use it for cross-context advertising.',
  ]],
  ['cookies', 'Cookies and analytics', [
    'We use Cloudflare Web Analytics, which does not use cookies or track you across sites. Cloudflare Turnstile may use limited browser storage to tell people from bots. We do not use advertising or marketing cookies.',
    "We also run our own visit log. It keeps a random ID for your browser in local storage (and, if you came from a link in one of our emails, that link's code), and records the pages you view on this site, how long you spend on them, your IP address, country, device and browser. We use it to understand which pages and collections interest buyers and, for people we have emailed, to follow up. It never tracks you on other sites, and we do not use it for advertising. We do not record anything if your browser sends a Global Privacy Control signal. To stop it, clear this site's data in your browser or ask us at hello@talastudio.net and we will delete what we hold.",
  ]],
  ['not-for-children', 'Not for children', [
    'This site is for business buyers and is not directed at children. We do not knowingly collect data from anyone under 16.',
  ]],
  ['privacy-changes', 'Changes to this policy', [
    'We may update this policy. The date at the top shows when it last changed. Material changes will be flagged on this page.',
  ]],
];

export const terms: Part = [
  ['trade-site', 'Trade website', [
    'This website is for business buyers. By using it you agree to these terms. If you do not agree, please do not use the site.',
  ]],
  ['no-offer', 'No offer to sell, no prices', [
    'Content on this site is for information only and is not an offer to sell. We do not publish prices. Prices, minimum order quantities, lead times and availability are provided in quotes and our catalog, and apply only when confirmed in writing.',
  ]],
  ['orders', 'Orders and sales terms', [
    'Orders are governed by a separate written agreement or accepted quote between you and us. It sets out the price, Incoterms (typically FOB Indonesia), payment terms, production and delivery schedule, inspection, warranty and dispute resolution. Where it conflicts with these terms, the agreement prevails.',
  ]],
  ['exclusivity', 'Regional exclusivity', [
    'We offer regional exclusivity to selected partners, agreed case by case. Nothing on this site grants or promises exclusivity. It exists only in a written agreement signed by us.',
  ]],
  ['accounts', 'Buyer accounts and dashboard', [
    'Approved buyers may receive an account to follow their orders, inspection photos and shipping. Keep your login private, tell us if you think it has been used without permission, and use the information only for your own orders. We may suspend an account that is misused.',
    'The buyer dashboard page on this site is a demo with sample data. It does not show real orders, customers or shipments.',
  ]],
  ['accuracy', 'Product information', [
    'We take care to show our products accurately. Sizes, weights, carton data, colours and finishes shown online are approximate. Colours on screens vary, and natural materials such as wood differ in grain and tone. Confirm specifications and request samples before ordering.',
  ]],
  ['ip', 'Intellectual property', [
    'All designs, drawings, renders, photographs, text, logos and other content on this site, and the TalaStudio name and logo, are owned by us or our licensors and are protected by copyright and other laws. You may view the site and share a link to it, but you may not copy, reproduce, modify, publish or use it to make products without our written permission.',
    'Product images are watermarked. Do not remove or hide a watermark.',
  ]],
  ['confidentiality', 'Confidential materials', [
    'The catalog, drawings and any unreleased designs we share are confidential. Do not share them with third parties, including factories, and do not use them to have copies made, without our written consent. We may require a signed confidentiality agreement before sharing full collections.',
  ]],
  ['acceptable-use', 'Acceptable use', [
    'Do not misuse the site: do not attempt to gain unauthorised access, disrupt it, scrape it at scale, submit false or spam enquiries, or use it for anything unlawful.',
  ]],
  ['liability', 'Disclaimer and limits of liability', [
    'The site is provided "as is". To the fullest extent permitted by law, we do not warrant that it will be error-free or always available, and we are not liable for indirect or consequential loss, or loss of profit, arising from your use of it. Nothing limits liability that cannot be limited by law. Liability under a sales agreement is governed by that agreement.',
  ]],
  ['links', 'Third-party links', [
    'The site may link to other websites. We do not control them and are not responsible for their content or privacy practices.',
  ]],
  ['law', 'Governing law', [
    'These terms are governed by the law stated in your sales agreement with us. Where there is none, they are governed by the law of the jurisdiction in which TalaStudio is established at the time of the dispute, and its courts have jurisdiction.',
  ]],
  ['terms-changes', 'Changes and contact', [
    'We may update these terms at any time by posting the new version here. Continued use means you accept the changes. Questions: hello@talastudio.net.',
  ]],
];

