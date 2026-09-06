# Quizora Design System
**"The Room Is Your Game Show"** — a premium dark-space, game-show UI language.
Optimized for: mobile-first player phones, host big-screens, high emotional energy, zero SaaS-generic feel.

---

## 1. Color Tokens

All values designed for **dark backgrounds** (`#030712`). Text is always light-on-dark with high contrast for the big screen; muted accents for secondary info.

### Neutrals / surface levels
| Token | Value | Usage |
|---|---|---|
| `--surface-0` | `#030712` | App background (deep space) |
| `--surface-1` | `rgba(15,23,42,0.60)` | Panels / cards backdrop |
| `--surface-2` | `rgba(30,41,59,0.50)` | Elevated cards, controls |
| `--surface-3` | `rgba(51,65,85,0.40)` | Hover wells, chips |
| `--glass-bg` | `rgba(255,255,255,0.04)` | Glass card fill |
| `--glass-bg-hover` | `rgba(255,255,255,0.08)` | Glass hover/active fill |
| `--glass-border` | `rgba(255,255,255,0.08)` | Quiet card border |
| `--glass-border-strong` | `rgba(255,255,255,0.12)` | Emphasized border |

### Text
| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#f1f5f9` | Headings, question text |
| `--text-secondary` | `#94a3b8` | Body, labels, chips |
| `--text-muted` | `#475569` | Captions, hints, disabled |
| `--text-dim` | `#334155` | Very quiet / placeholders |

### Accent (primary action)
| Token | Value | Usage |
|---|---|---|
| `--accent` | `#38bdf8` | Brand, highlights, live elements |
| `--accent-deep` | `#0284c7` | Gradient end, pressed states |
| `--accent-glow` | `rgba(56,189,248,0.30)` | Ambient glow behind accent items |
| `--accent-on-accent` | `#0c4a6e` | Text placed on accent fills |

### Semantic (secondary actions / feedback)
| Token | Value | Usage |
|---|---|---|
| `--green` / success | `#22c55e` · glow `rgba(34,197,94,0.25)` | Correct answers, "ready", success |
| `--red` / error | `#ef4444` · glow `rgba(239,68,68,0.25)` | Wrong, errors, danger timer |
| `--amber` / warning | `#f59e0b` · glow `rgba(245,158,11,0.30)` | Warning timer, pause |
| `--gold` / reward | `#fbbf24` · glow `rgba(251,191,36,0.25)` | Winner, points, powerups, rank 1 |

### Utility glow classes
```css
.glow-accent { box-shadow: 0 0 30px var(--accent-glow), 0 0 60px rgba(56,189,248,0.08); }
.glow-green { box-shadow: 0 0 24px rgba(34,197,94,0.25); }
.glow-red   { box-shadow: 0 0 24px rgba(239,68,68,0.25); }
.glow-gold  { box-shadow: 0 0 30px rgba(251,191,36,0.25); }
```

### Category / mode gradient palette
Distinct hue per category so players can orient at a glance on the big screen.
- General `violet→purple`, Movies `rose→pink`, Sports `emerald→teal`, Science `cyan→blue`, History `amber→orange`, Family `fuchsia→pink`, Music `indigo→violet`, Geography `green→emerald`, Tech `sky→cyan`, Islamic `emerald→teal`.
- Educational: YKS `sky→blue`, ALES `indigo→blue`, KPSS `amber→orange`, LGS `orange→red`, etc.

---

## 2. Typography Scale

Fonts: **Space Grotesk** (display/numbers), **Inter** (UI/body), **Cairo** (Arabic fallback — full RTL support). Sized for the host big-screen; scales down fluidly with `clamp()` for mobile.

| Token | Family | Size | Weight | Usage |
|---|---|---|---|---|
| `--text-display` | Space Grotesk | `clamp(3.5rem,10vw,7.5rem)` | 900 | Hero "QUIZORA", verdict |
| `--text-display-md` | Space Grotesk | `clamp(1.2rem,3vw,1.8rem)` | 700 | Question text (hero content) |
| `--text-heading` | Space Grotesk | `clamp(2rem,6vw,3rem)` | 900 | Game-over title, section headers |
| `--text-title` | Space Grotesk | `1.5rem` | 800 | Screen titles, states |
| `--text-body` | Inter | `0.95–1rem` | 400–600 | Options, descriptions, body |
| `--text-caption` | Inter | `0.72–0.85rem` | 600–700 | Labels, timers, chips, hints |
| `--text-micro` | Inter | `0.6rem` | 700–800 | Uppercase kickers, badge labels |

**Dark-bg typography rules:** light text on dark, generous letter-spacing on uppercase labels (`0.08em`–`0.25em`), display faces keep tight negative tracking (`-0.02em`–`-0.04em`). Numeric scores/timers always use Space Grotesk for a technical, game-console feel.

---

## 3. Spacing & Radius

### Spacing scale (8pt base)
| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |

Mobile-first margins use `10–12px` for dense option grids and `20–24px` for screen padding. Touch targets never below **44px** height.

### Border radius (friendly, game-show)
| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 10px | Chips, small controls |
| `--radius-md` | 14px | Buttons, option tiles, setting boxes |
| `--radius-lg` | 20px | Big cards, controller answer cards |
| `--radius-xl` | 24px | Feature cards, modals, question hero |
| `--radius-full` | 999px | Pills, badges, language toggles |

---

## 4. Button Variants

All buttons: `border-radius: 14–16px`, `font-weight: 700`, `48px` min height on mobile, `active` scale to `0.98`, hover lift `-2px`.

| Variant | Build | Text | Usage |
|---|---|---|---|
| **Primary** | `linear-gradient(135deg, #38bdf8, #0ea5e9)` + white sheen layer + soft cyan shadow | `#0c4a6e` | "Create a Game", "Next Question", "Join/Continue", "Play Again" |
| **Success** | `linear-gradient(135deg, #22c55e, #14b8a6)` | white | "Start Game", "Save", "Start Test" |
| **Ghost** | glass fill + `1px` glass border | `#94a3b8`→`#e2e8f0` on hover | Secondary/tertiary: "Join a Game", "Leave", "Cancel", back |
| **Option (answer)** | glass fill `rgba(255,255,255,0.03)` + `1px` quiet border; letter chip `34px` | primary text | A/B/C/D answers; hover = accent border + faint gradient wash |
| **Option states** | `.correct` green fill/border/letter · `.wrong` red, 60% opacity · `.selected` accent border + glow ring · `.dimmed` 25% opacity post-reveal | — | Answer feedback |
| **Host controls** (`host-qb-btn`) | flex-fill `rgba(15,23,42,0.5)` segments, `1px` border | primary text | Pause/Resume (amber hover), Skip, End Game (red hover) |
| **Mode / category tab** (`mode-btn`, `cat-btn`) | segmented pill / grid tile; active = accent gradient + shadow | active `#0c4a6e` | Fun ⇄ Educational mode, category picker |

---

## 5. Card / Panel Styles

Built on **glass + layered depth + a signature top light-line** for the hero.

```css
.feature-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-xl);
  box-shadow: 0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
  position: relative; overflow: hidden;
}
.feature-card::before {           /* hero light-line */
  content:''; position:absolute; top:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, transparent, rgba(56,189,248,0.2), transparent);
}
```

- **Static glass**: `.glass` / `.glass-strong` — blur `16–24px`, subtle border; for settings panels, chips, lobbies.
- **Question hero card**: the top gradient light-line + inner top highlight = the "stage light" that makes the question feel like the star.
- **Interactive cards** hover to `--glass-bg-hover` with a slightly stronger border.
- Depth comes from **soft black shadow underneath + 1px inner white highlight**; glow is reserved for live/meaningful elements (timer, code, verdict, current answer), never applied everywhere.

---

## 6. Timer Component

Circular SVG ring for the **host/big screen**; linear bar for **player phones**. Both follow a **color-state language** driven by time remaining.

**Ring** (`100px`): background stroke `rgba(255,255,255,0.06)`, progress stroke `#38bdf8` with a soft glow filter; `stroke-linecap: round`; `stroke-dashoffset` transitions `1s linear`.
**Bar** (`3px` high): gradient fill, glow shadow.

| State | Threshold | Color | Extra |
|---|---|---|---|
| Normal | `>10s` | `#38bdf8` | steady glow |
| Warning | `≤10s` | `#f59e0b` | amber glow |
| Danger | `≤5s` | `#ef4444` | red glow + number pulses 1.1× + tick sound |

**Rules:** fill color transitions with the stroke; number is Space Grotesk 900 centered; timer never flashes randomly — pulse only at ≤5s for drama.

---

## 7. Score / Ranking Visual Language

- **Top 3 mini-scores** (in-game, host): compact glass chips `🥇🥈🥉 Name: score` that slide in; a **score-change indicator** (`+15` in green / `-10` in red) pops and scales in beside chips when a score moves.
- **Leaderboard rows**: rank medal/emoji (26px) → name+streak → right-aligned Space Grotesk score. Rank 1 = **gold** tinted gradient + border; rank 2 = neutral; rank 3 = muted orange tint.
- **Reveal standings**: staggered rows slide in with 0.1s cascade delay, streak shown as `🔥 n`.
- **Final stats cards**: each player = a mini rank card with big gradient score + correctness/accuracy/streak/bonus rows; rank 1 gets gold border + gradient.

**Hierarchy rule:** rank + score are the loudest numbers; player name is secondary; incidental stats (streak, accuracy) are smallest muted text.

---

## 8. Player Presence Indicators

Realtime multiplayer presence, expressed two ways:

- **Lobby chips** (`player-chip`): round-cornered glass chips with emoji avatar + name; pop in with an overshoot bounce (`cubic-bezier(0.34,1.56,0.64,1)`) as each player joins. Hover brightens.
- **In-game answer status** (`answer-chip`): per-player pill that flips from `waiting` (muted, `rgba(255,255,255,0.03)`) to `answered` (green + a `✓`) the moment they lock in — giving the host instant room-wide feedback without revealing *what* they picked.

**Presence principles:** joining = positive pop+bounce + a short join sound; a person answering = quiet green flip (never their actual answer); leaving = chip removed with collapse. Keeps everyone "visible" on the big screen so the room feels alive.

---

## 9. Motion Principles

### Duration
| Type | Duration | Notes |
|---|---|---|
| Micro-feedback (tap, hover, chip flip) | 120–200ms | instant emotional feedback |
| Standard state change (pop-in, lock-in, score change) | 300–400ms | use overshoot `cubic-bezier(0.34,1.56,0.64,1)` |
| Screen entry (hero, title reveal) | 700–1000ms | dramatic entrance |
| Staggered reveals (leaderboard, standings) | 0.4s each, `+0.1s` delay | cascading list |

### Easing
- **Entrance/celebration:** `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring overshoot) — pop, reveal, lock-in, join.
- **Standard UI:** `cubic-bezier(0.4, 0, 0.2, 1)` or `0.16, 1, 0.3, 1` — buttons, cards, timer.
- **Subtle ambient:** linear/`ease-in-out` for particles, glow pulses.

### What should animate
| Element | Behavior |
|---|---|
| Hero title / kicker | fade-up cascade (kicker → title → subtitle → tagline → actions → badges) |
| Question card | `translateY(16px) scale(0.98)` → settle, 0.6s |
| Timer | continuous 1s linear ring drain; color swap at thresholds; number pulse at ≤5s |
| Answer lock-in | spring overshoot scale |
| Verdict (reveal) | 0.5 → 1.08 → 1.0 pop with glow |
| Score deltas | scale in `+n` / `-n`, 0.5s |
| Player join | pop + bounce + join sound |
| Leaderboard | staggered slide-in from left |
| Room code / trophy | ambient glow pulse (`2s`/`3s`), never fast |
| Confetti (win) | burst from both edges, ~4s |

### Rules
1. **Every interaction gets immediate feedback** — a tap, tick, flip, or glow within 200ms. Nothing feels dead.
2. **Glow = meaning.** Only live/valuable things glow (timer, code, verdict, current answer). Too much glow = noise.
3. **Drama reserved for the reveal.** Questions enter calmly; the answer verdict gets the loudest pop. This is the "game-show beat."
4. **Never animate at the cost of clarity** — the question is always readable and centered; motion must never obscure it (particles run at 4–8% opacity).

---

## Implementation Notes
These tokens/language map 1:1 onto `public/css/quizora.css` and `public/js/particles.js` already in the project. To consume in code: use the `:root` CSS variables for color/radius/spacing, the `.glass`/`.glow-*`/`.btn-*`/`.option-*` classes for components, and the `@keyframes` blocks (`.fadeUp`, `.revealPop`, `.lockIn`, `.pulseGlow`, etc.) for motion.
