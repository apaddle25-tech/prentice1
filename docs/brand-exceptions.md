# Brand book exceptions — prentice1.com

Departures from **Prentice1 Brand Book Rev 2.0 (Oct 2026)** that are live on
the marketing site, each with who decided it and what would close it.

The brand book's own closing rule sets the order of authority: *"Values from
the website redesign and the platform prototype. Where they disagree, this
document wins."* So brand book → `.dc.html` reference file → handoff README.
Anything below is a decision to override that order, not an oversight.

---

## BX-01 · Stock injection footage in the heroes and CTA bands

**Rule:** §10 Imagery, AVOID — *"Stock or AI-generated injection scenes,
ungloved hands, unrealistic injection sites."* Reinforced by §02 rule 10,
*"Real, never staged."*

**What ships:** five stock clips — `hero-injector`, `assessment`,
`handshake`, `syringe-profile`, `clinic-hallway`. They carry the homepage
hero, the Prentice Day band, the final CTA, and both secondary-page heroes:
the most prominent moving images on the site.

**Compliant today and unaffected:** `screenshare` (a real platform
recording), `rivkin`, `faculty/group.jpg` and the four faculty portraits.

**Decision:** Aneesh Patel, 2026-10-17 — ship under a documented exception
and replace after the LA shoot. Usage rights to the stock clips are cleared;
rights were never what §10 restricts, so clearing them does not resolve this.

**Closes when:** footage shot at the LA training site replaces all five. The
encode pipeline is `scratchpad/encode.sh`; drop the new masters in and rerun.

---

## BX-02 · Ambient drift on the dark heroes exceeds the 600ms cap

**Rule:** §07 Motion gives two instructions that cannot both be read
literally. *"Everything uses `cubic-bezier(0.22, 0.7, 0.2, 1)`, stays under
600ms"* and, in the same section, *"Ambient light — two drifting radials on
dark heroes. Transform only."* Drift is slow by nature; under 600ms it is not
drift.

**What ships:** two radials on each dark hero, drifting on 26s and 34s loops,
`alternate`, transform only, on the §07 curve. They never resolve to a state,
which is the distinction being drawn: the 600ms cap governs transitions and
entrances, where a visitor is waiting for something to finish. Ambient light
is not something anyone waits for.

**Decision:** Aneesh Patel, 2026-10-17 — granted as a named exception, so the
cap stands everywhere else.

**Closes when:** nothing. This is permanent unless §07 is rewritten to carve
out ambient motion, at which point it stops being an exception.

## Decisions that are NOT exceptions

Recorded here because each looks like a departure from the handoff and is
not — in every case the brand book was followed over the reference file or
the README, which is the stated order.

| Decision | Reference / README said | Brand book says | Shipped |
|---|---|---|---|
| Wordmark "1" weight | 400 (reference file) | §03: DM Sans 300 | 300 |
| Phase-card hover | lift 2px (reference file) | §07: cards turn their border gold; the 1px lift belongs to buttons | border only |
| Prentice Day interview length | remove, "not confirmed" (README §10) | §01 definition, §08 stat row, and the previous site's own table product all state 30 minutes | kept |
| Sponsor tiers | "[Tier names, inclusions and pricing to come]" (reference file) | §12: tiers as stacked cards | previous site's Silver/Gold/Diamond, as cards |
| Sponsor payment | — | §13: no B2B buyer sent to a card checkout | invoice / PO |
| Scroll-interpolated theme | — | §14 migration: replaced by grounds fixed per section | dropped |

## Additions the handoff did not specify

- **Hamburger menu below 820px.** The reference wraps the nav instead. With
  the auth links added it wrapped to an unusable height on a phone.
- **Auth links on the secondary pages.** The reference only has them on the
  homepage; signing in is a site-wide affordance.
- **Carousel scrolled by a rAF tween** rather than
  `scrollTo({behavior:'smooth'})`, which was measured not to move the track at
  all. The tween also honours §07's curve and cap, which native smooth scroll
  cannot be told to do.

## Closed

- **FAQ on `/practices` and `/sponsors`.** §12 ends both secondary templates
  with one, and both were missing. Written and shipped 2026-10-18: five
  questions each, using the homepage's `[data-faq]` markup, so `initFaq` picks
  them up with no JavaScript change. The sponsor set leads with disclosure and
  with what sponsorship cannot touch, which is what a medical-affairs reviewer
  reads first.

- **Sponsor tier capacity.** The tiers carried over from the previous site
  offered "one full training day exclusively using your product" at both Gold
  and Diamond, five slots each — up to ten exclusive days inside a five-day
  intensive — and five Prentice Day tickets per Diamond slot, which at five
  slots is 25 sponsor attendees at an event for 20 learners. Neither is
  deliverable. Shipped 2026-10-18: the exclusive day is Diamond only, three
  slots, one each for toxin, filler and biostimulator (the intensive's other
  two days, cadaver anatomy and consultation, use no product); Gold drops to
  three slots and carries a disclosed product-specific session instead;
  tickets are capped at two. Prices are unchanged. Decided by the owner,
  2026-10-18.

## Known gaps, not yet decided
- **The Intake proper is not on this site, and cannot be.** The owner asked
  for everything to be captured at once rather than split across an emailed
  follow-up, and `/apply` now does that for the fields it can hold: name,
  email, licence type, state, experience and goals, all C1 in the admissions
  contract, plus an optional mobile (C2). But `02_Intake_Questionnaire.md`
  defines the Intake as **47 rendered fields over about seven minutes with one
  upload**, autosaving and resumable, and Section A alone requires a
  government photo ID (A-23, C4), a date of birth (A-16, C4, employer never),
  SMS and email verification, and an audio clip. None of that belongs on a
  static page with no backend to secure it, and its resumability — which the
  questionnaire calls the highest-value remarketing audience in the funnel —
  cannot exist without one. `/apply` is the front door; the Intake stays a
  platform instrument.
- **The site said "5-minute application"; the questionnaire says about seven.**
  §1.2 principle 1 is explicitly about honest time estimates and withdraws an
  earlier inflated claim. As of 2026-10-28, by the owner's decision, the site
  states no duration at all: the hero says "Apply in minutes" and the
  admission steps carry no times. Revisit if the Intake's scope changes.

- **Three policy pages are still stubs.** `/terms`, `/refund` and
  `/accessibility` each say they are being written and point at
  `hello@prentice1.com`. They are `noindex,follow` and deliberately absent from
  `sitemap.xml` for that reason; add them there in the same change that removes
  the noindex. The refund terms are the one that costs conversions — the
  2026-10-16 audit called a missing refund policy enough on its own to stop a
  qualified applicant at a $15,000 decision — and they are owner and counsel
  work, not copy. The homepage FAQ no longer shows a bracketed placeholder in
  their place; it states that the $1,000 deposit is non-refundable (owner,
  2026-10-28), that the full terms land before applications close, and how
  to get them sooner.

- **The intensive's location.** The curriculum says California; this site says
  Los Angeles in its title, canonical URL, OG images and schema. As of
  2026-10-18 the intensive is published as California and Prentice Day as Los
  Angeles, which matches both sources but reads oddly on one page. Confirm the
  venue and make the two agree.
