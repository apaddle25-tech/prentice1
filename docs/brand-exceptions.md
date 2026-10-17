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

## BX-02 · Ambient motion on the dark heroes — UNRESOLVED

**Rule:** §07 Motion gives two instructions that cannot both be read
literally. *"Everything uses `cubic-bezier(0.22, 0.7, 0.2, 1)`, stays under
600ms"* and, in the same section, *"Ambient light — two drifting radials on
dark heroes. Transform only."* Drift is slow by nature; under 600ms it is not
drift.

**What ships:** the reference file's single static radial glow, no drift. The
most conservative reading of the two.

**Decision:** open. Raised 2026-10-17, awaiting the owner. Either the radials
become a named exception to the 600ms cap, or the ambient-light line is
dropped from §07.

---

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

## Known gaps, not yet decided

- **No FAQ on `/practices` or `/sponsors`.** §12 ends both secondary
  templates with one. Deferred by the owner, 2026-10-17; copy not written.
- **`/apply` collects name and email only**, while the homepage's admission
  step 01 describes "licence, state, experience and goals" as the five-minute
  application. Those fields are classified under the platform's admissions
  contract and belong behind the endpoint that honours it. Either `/apply`
  grows when that route lands, or step 01 is reworded.
