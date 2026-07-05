# SkinMatch — Product Brief (v1)

*Last updated: July 2026 · Keep this file in the repo root. Re-read it before every major feature decision.*

---

## One-sentence value proposition

> **SkinMatch is the skincare app that shows its work — free ingredient scanning, dupe scores you can actually understand, and a fast verdict instead of more noise.**

If a feature doesn't serve this sentence, it waits.

---

## The user

**Primary persona: "The exhausted researcher"**

- 18–35, active on TikTok/Instagram/Reddit skincare content
- Has already wasted money on products that didn't work or irritated their skin
- Doesn't lack information — they're drowning in it and can't tell what to trust
- Compares every product to a cheaper alternative before buying (dupe culture is their default shopping behavior)
- Wants a fast, trustworthy verdict — not a community feed, not 60 filters, not another rabbit hole

**Markets:** US + India (India requires rupee pricing and local retailer links to feel native, not ported)

---

## The pain, in their words

| Pain point | What they'd say | Evidence |
|---|---|---|
| Decision fatigue | "There are 40 serums and they all claim the same thing" | Industry reporting: consumers overwhelmed by product churn; "skinimalism" now a mindset |
| Conflicting advice | "One derm says use it, one TikToker says it ruined her skin" | Consumers described as "drowning in conflicting advice"; DermTok vs influencer hype |
| Ingredient blindness | "I honestly don't know what's in the stuff I use" | 26% of Gen Z admit they don't know what's in their skincare (Amatus study) |
| Expensive trial-and-error | "I have a drawer of products I'll never finish" | Firsthand r/SkincareAddiction accounts; estheticians cite trial-and-error as top frustration |
| Untrusted claims | "Every brand says 'clean' — it means nothing" | "Clean beauty" widely reported as having lost credibility; demand for proof over buzzwords |

**The core insight:** The pain is not missing information. It's *"I can't tell what to trust, and I'm tired of wasting money finding out."*
SkinMatch is a **confidence tool**, not an information tool.

---

## How each feature maps to a pain

| Feature | Pain it kills | The verdict it delivers |
|---|---|---|
| Ingredient scanner + flags | Ingredient blindness, untrusted claims | "This has 2 pore-cloggers and 1 irritant for your skin type" |
| **Dupe finder with explained scores** ⭐ | Trial-and-error cost, dupe culture | "73% match: shares 8/12 actives incl. niacinamide + ceramides — here's the ₹499 version" |
| Shelf conflict checker | Conflicting advice | "Retinol + your AHA toner = irritation risk. Use on alternate nights" |
| Routine tab | Decision fatigue | "Here are your 5 steps. Done. Stop researching" |

⭐ = the differentiator. The dupe **explanation** is the one thing no incumbent clearly does. It leads every screenshot, every pitch, every post.

---

## Competitive reality (be honest with ourselves)

- **SkinSort** (250k+ users) does routines, ingredients, dupes, conflicts, AND covers 300+ Indian brands with solid Ayurvedic ingredient science. We do **not** win on breadth, India coverage, or ingredient education.
- **We win on:** transparent dupe explanations (untested by anyone), free scanning (SkinSort paywalls it), reliability (their reviews cite crashes/stuck loading), and billing flexibility (they're annual-only — a named complaint).
- **We do not build:** a community/social layer, 60 filters, photo AI skin diagnosis. Focused utility beats noisy ecosystem for our persona.

---

## Positioning pillars (in priority order)

1. **"Shows its work"** — every score, flag, and recommendation comes with a plain-language *why*. This is the brand.
2. **Free where it matters** — scanning and safety checks are never paywalled. Premium = convenience, never safety.
3. **Fast verdicts** — every screen should answer a question in under 10 seconds, not open a research session.
4. **Reliable** — shelf and routine data never disappears. Boring reliability is a feature.

---

## MVP scope guardrails

**In (v1):**
- Ingredients tab: search + barcode scan (OBF), flags with one-line explanations
- Dupes tab: ranked matches **with the score breakdown** ("shares X/Y actives: …")
- Shelf: save products, conflict check with severity + plain-language tips
- Routine tab: cold-start guided setup (quiz → routine → nudge to add products)

**Out (v1) — do not build yet:**
- AI chat tab
- Photo ingredient scanning for end users (blocked on backend proxy; user-supplied API keys are a non-starter for consumers)
- Price automation (manual prices for seed products; "report wrong price" button instead)
- Community features, reviews, social anything

**Tech debt that blocks launch:**
- [x] Move Claude Vision calls behind a Supabase Edge Function (never ship an API key in the bundle) — code done (`supabase/functions/extract-ingredients/`), still needs the function deployed and secrets set on an actual Supabase project
- [x] Routine tab empty-state / cold-start flow
- [x] Dupe score explanation UI

---

## Success criteria for v1 (validation, not scale)

- 20–30 real users from skincare communities / personal network try it
- The one question we ask them: **"Would you use this instead of what you use now — and if not, why not?"**
- Signal to widen scope: users unprompted mention the dupe explanations as the reason they'd switch
- Signal to pivot: users say "SkinSort already does this" with no mention of our transparency angle

---

## Launch copy starters

- App Store subtitle: *"Skincare dupes, explained."*
- One-liner for Reddit/PH: *"The first skincare app that shows its work — see exactly why a $12 product matches your $90 one."*
- Anti-positioning: never say "AI-powered," "clean," or "revolutionary." Our persona is allergic to all three.
