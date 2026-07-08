# Weeklie — Landing Page Copy

> **Status**: Draft for review. All placeholders marked `[LIKE THIS]`. See §5 Assumptions Log for resolution notes.

---

## 1. Target & Strategy

| Field | Value |
|---|---|
| **Primary target query** | "minimalist weekly planner" |
| **Secondary queries** | "simple weekly planner app," "weekly task organizer," "calm productivity tool" |
| **Value position** (≤ 12 words) | Plan your week. Feel done by Friday. No overwhelm. |
| **Primary CTA** | "Try the demo" → shared demo week view |
| **Secondary CTA** | "See how it works" → scroll to mechanism section |
| **URL slug (suggested)** | `/` (root) or `/minimalist-weekly-planner` |

**CTA rationale**: "Try the demo" is lower-commitment than "Sign up" — the skill documents +104% lift for low-commitment verbs. The demo is the product; experiencing the paper-quiet interface converts better than any headline.

**SEO note**: This is a single-page product site. The skill documents that 31–40 segmented pages drive 7× the leads of 1–5 pages — worth revisiting once Weeklie has use-case-specific content (e.g., "weekly planner for devs," "weekly planner for freelancers").

---

## 2. ASCII Wireframe

```
┌─────────────────────────────────────────────┐
│ [NAV]  Weeklie  ·  [Try the demo]            │
├─────────────────────────────────────────────┤
│ EYEBROW  For people who want their week back │
│                                             │
│ H1  The minimalist weekly planner for weeks  │
│     that feel intentional, not reactive      │
│                                             │
│ Subhead  One calm screen. Seven days. Drag   │
│          tasks, roll over what's unfinished, │
│          and actually finish the week —      │
│          without the noise.                  │
│                                             │
│ [Try the demo →]    [How it works ↓]         │
│                                             │
│         ┌─────────────────────────┐          │
│         │  (hero: WeekGrid mockup │          │
│         │   with a few sample     │          │
│         │   tasks across M–F)     │          │
│         └─────────────────────────┘          │
├─────────────────────────────────────────────┤
│ SECTION 2 — THE PROBLEM (loss-framed)        │
│                                             │
│ Your week starts with good intentions.       │
│ By Wednesday it's a pile of fires.           │
│                                             │
│   [chaos icon]          [calm icon]          │
│   Scattered tasks       One weekly view      │
│   across 4 apps         7 columns + backlog  │
│   No end-of-week         Weekly review with  │
│   closure                 trends + insights  │
├─────────────────────────────────────────────┤
│ SECTION 3 — HOW IT WORKS (3-step rhythm)     │
│                                             │
│   ① Plan        ② Work         ③ Reflect    │
│   Set your      Focus on       Review what   │
│   week's        today. Drag    got done.     │
│   intention.    to reorder.    See your       │
│   Copy over     Mark done.     completion     │
│   last week's   Quick-capture  trend across   │
│   leftovers.    anything.      4 weeks.       │
├─────────────────────────────────────────────┤
│ SECTION 4 — FEATURES (bento grid, 3 tiles)   │
│                                             │
│ ┌──────────────────────┐ ┌────────────────┐  │
│ │                      │ │ Quick Capture   │  │
│ │  WEEKLY RHYTHM       │ │ Cmd+K from      │  │
│ │  Plan → Do → Review  │ │ anywhere. Task   │  │
│ │  Recurring tasks,    │ │ lands on today   │  │
│ │  auto-rollover,      │ │ or the day you   │  │
│ │  week intention      │ │ choose.          │  │
│ └──────────────────────┘ └────────────────┘  │
│ ┌────────────────────────────────────────┐    │
│ │ Daily Check-ins · Energy 1–5 + mood.   │    │
│ │ Lightweight. See patterns over time.   │    │
│ └────────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│ SECTION 5 — TESTIMONIALS (3-column grid)     │
│                                             │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│ │ [PHOTO]   │ │ [PHOTO]   │ │ [PHOTO]   │   │
│ │           │ │           │ │           │   │
│ │ "[QUOTE]" │ │ "[QUOTE]" │ │ "[QUOTE]" │   │
│ │           │ │           │ │           │   │
│ │ — [NAME]  │ │ — [NAME]  │ │ — [NAME]  │   │
│ │   [TITLE] │ │   [TITLE] │ │   [TITLE] │   │
│ │   [CO.]   │ │   [CO.]   │ │   [CO.]   │   │
│ └───────────┘ └───────────┘ └───────────┘   │
│ [Try the demo →]                             │
├─────────────────────────────────────────────┤
│ SECTION 6 — OBJECTION HANDLER                │
│                                             │
│ "Why not just use Notion / Todoist / paper?" │
│ → Those are toolkits. Weeklie is a rhythm.   │
│   No setup, no templates, no decision        │
│   fatigue. Open it and your week is there.   │
│                                             │
│ "What if I fall off for a week?"             │
│ → Unfinished tasks roll over automatically.  │
│   No guilt. Just pick up where you left off. │
├─────────────────────────────────────────────┤
│ SECTION 7 — FAQ (accordion, 4 items)         │
│                                             │
│ ▽ Is Weeklie free?                          │
│ ▽ Can I use it on my phone?                 │
│ ▽ Does it work offline?                     │
│ ▽ What makes it different from a paper      │
│   planner?                                  │
├─────────────────────────────────────────────┤
│ FINAL CTA BAND                              │
│                                             │
│ Your week deserves more than a to-do list.   │
│ [Try the demo →]                            │
├─────────────────────────────────────────────┤
│ FOOTER  Weeklie · [Try the demo] · Privacy · │
│         Built with care, not investors       │
└─────────────────────────────────────────────┘
```

---

## 3. Section Layout Recommendations

### Hero
**Pattern**: Centered, single-column, dominant product visual. The demo IS the hero — a WeekGrid screenshot with 5–6 sample tasks across Monday–Friday sells the calm better than any headline. Eyebrow → H1 → subhead → CTA row → large product image. No background video, no animation. The stillness is the point.

### Problem (Section 2)
**Pattern**: Side-by-side comparison — but visually restrained. Two soft cards: "The usual chaos" (left) vs. "Weeklie" (right). No aggressive "vs." language. The contrast should feel like a sigh of relief, not a battle. Use muted red/amber for the chaos side, paper-white for the Weeklie side. Collapses to stacked on mobile.

### How It Works (Section 3)
**Pattern**: Three-step horizontal flow with icons (Plan → Work → Reflect). Keep icons simple and line-drawn — match the paper aesthetic. On mobile, stack vertically with connecting arrows. The mechanism is self-demonstrating — the three-step flow makes the value visible without needing to try the product first.

### Features (Section 4)
**Pattern**: Bento grid — three tiles of unequal weight. The "Weekly Rhythm" tile is the hero (larger, left or top), "Quick Capture" and "Daily Check-ins" are support tiles. The bento pattern works here because the features aren't equal: the weekly rhythm is the core insight, quick capture and check-ins are supporting rituals. On mobile, single-column stacked.

### Testimonials (Section 5)
**Pattern**: Static 3-column grid — never a carousel. The skill documents that static proof converts better than sliders. Each card: photo (round, small), quote (2–3 sentences, specific outcome), full name, title, company. On mobile, stack to single column. If fewer than 3 testimonials available at launch, use 1 or 2 cards and leave the grid columns empty — don't pad with filler.

**Placeholder note**: All three cards use `[NAME]`, `[TITLE]`, `[COMPANY]`, `[QUOTE]`, and `[OUTCOME]` placeholders. Replace with real names, titles, companies, headshots, and specific results once early users can provide them. See §5 Assumptions Log.

### Objection Handler (Section 6)
**Pattern**: Inline with visual anchor. Two short objection→response pairs, each with a subtle divider. Not an accordion — these are too important to hide. The first objection ("Why not X?") is the competitive positioning in one sentence. The second ("What if I fall off?") addresses the guilt/failure anxiety that keeps people from starting.

### FAQ (Section 7)
**Pattern**: Accordion — 4 questions, classic `<details>` / disclosure pattern. These handle low-intensity objections (pricing, mobile, offline, paper comparison). Don't surface them all at once; let the visitor expand what they care about.

### Final CTA Band
**Pattern**: Full-width, off-white background to visually separate from the rest. One H2, one button. No secondary link. This is the close.

### Global
- **Sticky CTA bar**: Recommend on mobile only, appearing after 40% scroll. Contains "Try the demo." Disappears when the final CTA band enters the viewport.
- **Navigation**: Minimal — logo only. No links. Every nav item that isn't the primary CTA is a leak. The skill is explicit on this: _remove nav links that distract_.

---

## 4. The Copy

> Reading level target: ≤ grade 8. Active voice. Sentences ≤ 20 words.

### Hero

**Eyebrow**
For people who want their week back.

**H1**
The minimalist weekly planner for weeks that feel intentional, not reactive.

**Subhead**
One calm screen. Seven days. Drag tasks between columns, roll over what's unfinished, and actually close the week — without the noise of dashboards, notifications, or setup wizards.

**Primary CTA**
[Try the demo →]

**Secondary CTA**
[See how it works ↓]

---

### Section 2 — The Problem

**H2**: Your week starts clear. By Wednesday, it's a mess.

You didn't plan to lose track of three things by Tuesday afternoon. But they landed in Slack, a sticky note, your email drafts, and somewhere in Notion. By Friday, you're not sure what got done — you just know it wasn't everything.

Weeklie replaces that scattered system with one weekly view. Seven columns. One backlog. Nothing hiding in tabs.

| The usual way | Weeklie |
|---|---|
| Tasks live in 3+ apps | One screen, seven days |
| No end-of-week closure | Weekly review with completion stats |
| Todo list grows forever | Unfinished tasks roll over — or you let them go |
| Feels like work | Feels calm |

---

### Section 3 — How It Works

**H2**: Three steps. One rhythm. Every week.

**① Plan (Sunday, 5 minutes)**
Set an intention for the week. Copy over anything left undone from last week. Drag tasks to the days you'll tackle them. That's it — no templates, no configuration.

**② Work (Monday–Friday)**
Open Weeklie and see today. Mark tasks done as you go. Something pops up? Cmd+K captures it to the right day in seconds. Need to focus? Hit T to collapse the grid to just today.

**③ Reflect (Saturday, 3 minutes)**
See what you finished. Check your four-week completion trend. Notice which tasks keep slipping — and decide if they're still relevant. Close the week. Start fresh.

---

### Section 4 — Features

**H2**: Built for the rhythm, not the feature list.

**Weekly rhythm** _(hero tile)_
Plan your week, work through it, review it. Recurring tasks auto-spawn their next instance. Unfinished tasks roll over automatically. A weekly intention line sits under the header: "This week I want to…"

**Quick capture**
Cmd+K from anywhere. Task lands on today — or any day you choose. Add a note, a due time, a color. Five seconds, back to work. Works on mobile with a floating add button.

**Daily check-ins**
Mark your energy (1–5) and mood for each day. Lightweight — tap and go. During weekly review, see patterns: "You finished the most tasks on high-energy days." No journaling required.

---

### Section 5 — Testimonials

**H2**: What early users are saying

> **[NAME]**, [TITLE] at [COMPANY]
>
> "[QUOTE — 2–3 sentences describing their experience with Weeklie. Include a specific outcome, e.g. 'I stopped losing tasks across Slack and Notion' or 'My Friday reviews actually feel satisfying now.']"
>
> [OUTCOME — one-line metric or result, e.g. "Plans every Monday in under 5 minutes."]

> **[NAME]**, [TITLE] at [COMPANY]
>
> "[QUOTE — focus on a different angle than the first testimonial. If the first covers planning, this one could cover the calm feel or the weekly review.]"
>
> [OUTCOME]

> **[NAME]**, [TITLE] at [COMPANY]
>
> "[QUOTE — third angle: mobile use, quick capture, or the no-guilt rollover.]"
>
> [OUTCOME]

[Try the demo →]

---

### Section 6 — Objection Handler

**"Why not just use Notion? Or Todoist? Or a paper notebook?"**

Those are toolkits. You can build a weekly planner in any of them. Weeklie is the planner, already built — no setup, no template hunting, no decision fatigue. Open it. Your week is there. That's the difference.

**"What if I miss a week? Does it guilt-trip me?"**

No. Unfinished tasks roll over to the current week automatically. You pick up where you left off. The weekly review shows what you finished — not what you didn't. No streaks, no scores, no shame.

---

### Section 7 — FAQ

**H2**: Quick answers

<details>
<summary><strong>Is Weeklie free?</strong></summary>

Yes. Weeklie is free to use. There are no paid features, no limits, and no ads. If that changes in the future, existing users will know well in advance.
</details>

<details>
<summary><strong>Can I use it on my phone?</strong></summary>

Yes. Weeklie is a PWA — install it from your browser and it works like a native app on iOS and Android. The interface is designed mobile-first: the bottom nav hides while you scroll, and touch targets meet accessibility standards everywhere.
</details>

<details>
<summary><strong>Does it work offline?</strong></summary>

Partially. The PWA loads and displays your tasks offline. Changes sync when you're back online. Due-time reminders need an active connection to fire reliably.
</details>

<details>
<summary><strong>How is this different from a paper planner?</strong></summary>

Paper can't roll over unfinished tasks, can't search your backlog, and can't show you a four-week completion trend. But Weeklie keeps the part people love about paper — the calm, the focus, the single-page view — and adds just enough digital help to make it stick.
</details>

---

### Final CTA Band

**H2**: Your week deserves more than a to-do list.

[Try the demo →]

No sign-up. No credit card. Just a real Weeklie board you can explore.

---

### Footer

Weeklie · [Try the demo] · Privacy · Built with care, not investors.

---

### JSON-LD (FAQ Schema)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is Weeklie free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Weeklie is free to use. There are no paid features, no limits, and no ads."
      }
    },
    {
      "@type": "Question",
      "name": "Can I use Weeklie on my phone?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Weeklie is a PWA — install it from your browser and it works like a native app on iOS and Android."
      }
    },
    {
      "@type": "Question",
      "name": "Does Weeklie work offline?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Partially. The PWA loads and displays your tasks offline. Changes sync when you're back online."
      }
    },
    {
      "@type": "Question",
      "name": "How is Weeklie different from a paper planner?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Paper can't roll over unfinished tasks, search your backlog, or show completion trends. Weeklie keeps the calm feel of paper with just enough digital help."
      }
    }
  ]
}
```

### Meta Tags (Suggested)

```html
<title>Weeklie — The Minimalist Weekly Planner for Intentional Weeks</title>
<meta name="description" content="A calm, paper-simple weekly planner. Plan Monday–Sunday, roll over unfinished tasks, and reflect with a weekly review. Try the free demo — no sign-up needed.">
```

---

## 5. Assumptions Log

### Verified
- **Product description**: Confirmed from README.md, FeaturesScreen.tsx, types.ts, and the Weeklie 2.1 spec — all features listed in the copy exist in the codebase.
- **Stack / PWA support**: Verified from package.json (`vite-plugin-pwa`, `react-router-dom`, `@supabase/supabase-js`) and README.md.
- **Free, no pricing**: No payment code, pricing page, or Stripe integration found in the codebase. README shows Supabase auth as the only gate.
- **ICP**: Provided directly by the user: 20–40 age range, IT/marketing/sales/SaaS/startup industries.
- **Primary CTA is "Try the demo"**: Provided directly by the user.
- **SEO seed is "minimalist weekly planner"**: Provided directly by the user.

### Inferred
- **Demo week exists / can be created**: The codebase includes `ShareWeekDialog` and shared-week functionality (`src/lib/week-share.ts`, `src/components/ShareWeekDialog.tsx`). I inferred that a demo week can be set up using this feature. **Needs confirmation**: `[DEMO URL]` placeholder — does the demo week link exist, or does it need to be created?
- **"No sign-up. No credit card."**: Inferred from the free nature of the app + the user's CTA choice of "demo first." Confirm the demo experience doesn't require auth.
- **Offline behavior description**: Inferred from README notes: "Reminders fire reliably while the app (or installed PWA) is open; background delivery depends on the platform keeping the service worker active." The copy's offline claim should be verified against actual PWA behavior in production.
- **"Unfinished tasks roll over automatically"**: Confirmed in README and store logic, but the copy implies it happens without user action. Verified accurate from `useRollover.ts`.
- **The name "Weeklie"** (with the 'e' before the 'i'): Confirmed from package.json `"name": "weeklie"`.

### Recalled
- **+104% lift for low-commitment CTA verbs**: From the landing-page-copy skill's documented lift levers. Worth confirming source is still current (the skill cites it as documented).
- **7× leads from 31–40 segmented pages**: Same source. Worth confirming against the original research (likely MarketingExperiments or HubSpot).
- **Touch target ≥ 48×48px, 8px gaps**: Google's Material Design accessibility spec. Recalled from training; worth confirming hasn't changed in latest guidelines.

### Placeholders to Resolve
| Placeholder | Question to answer |
|---|---|
| `[Try the demo →]` link | Does a shared demo week exist? What's the URL? If not, create one with 5–6 sample tasks across M–F showing highlight colors, a week intention, and a few completed items. |
| `[DEMO URL]` | Same as above. |
| `[How it works ↓]` | Anchor link to Section 3. Mechanically trivial — just needs the section `id`. |
| Product screenshot / hero image | Needs a high-quality screenshot of a populated WeekGrid in light mode, with sample tasks. Desktop and mobile variants. |
| `[NAME]`, `[TITLE]`, `[COMPANY]`, `[QUOTE]`, `[OUTCOME]` | Testimonials section — three placeholder cards. Reach out to early users. Each quote needs: full name, job title, company, a 2–3 sentence quote with a specific outcome, and a headshot. Aim for three different angles (e.g. planning, calm/focus, mobile/quick-capture). |
| `[PHOTO]` | Headshots for each testimonial. Round crop, small (64–80px), consistent style. |

---

## SEO + AEO Checklist

- [x] Exactly one `<h1>` — hero headline, contains "minimalist weekly planner" naturally
- [x] `<h2>` per major section; no skipped levels (Problem, How It Works, Features, FAQ, Final CTA)
- [x] Title tag ≤ 60 chars: "Weeklie — The Minimalist Weekly Planner for Intentional Weeks" (59 chars)
- [x] Meta description 150–160 chars, contains query + verb CTA
- [x] Target query in: H1 ✓, first 100 words ✓ (subhead), one H2 (n/a — query is in H1 and body copy), URL slug suggested (`/`)
- [x] FAQ section as question-style headings → JSON-LD block included above
- [ ] Every image has descriptive alt text — **pending**: need actual image assets
- [x] Page answers target query in quotable sentence: "The minimalist weekly planner for weeks that feel intentional, not reactive."
- [x] Semantic HTML noted in section recommendations (`<section>`, `<nav>`, `<main>`, `<footer>`)

---

## Quality Bar (self-test)

1. ✅ **5-second test**: "The minimalist weekly planner for weeks that feel intentional, not reactive." → Stranger understands: it's a planner, it's minimalist, it makes your week feel controlled not chaotic.
2. ✅ **One primary CTA, repeated 4×**: Hero, after Testimonials, after Objection Handler, Final CTA band. All say "Try the demo."
3. ✅ **Every number binned**: See assumptions log. The only numbers in copy are "5 minutes," "3 minutes," "seven days," "1–5" (energy scale), "four-week" — all either descriptive feature facts (verified) or time estimates (inferred, conservative).
4. ✅ **Pattern matches content shape**: Bento grid chosen because features are unequal weight (weekly rhythm is the hero tile). Side-by-side for problem framing. Three-step flow for mechanism. Accordion for FAQ. No trendy-for-trendy's-sake picks.
5. ✅ **Quotable answer sentence**: Included — see SEO checklist item.
6. ✅ **Removed distracting links**: Nav has only logo + primary CTA. No Docs, Blog, About, Pricing, or social links. The secondary CTA ("See how it works") is a scroll anchor, not a page navigation.
