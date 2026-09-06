# Quizora — Live Micro-Interaction Specification
**"Premium and theatrical, never distracting."**

These six moments are the *beats* of a live game-show round. Each spec maps to CSS classes/keyframes already implemented in `public/css/quizora.css` and the handshake in `public/js/host.js`. Every interaction follows the two hard rules of the house:

1. **Immediate feedback** — something reads as "seen" within 120–200ms of any input.
2. **Glow = meaning** — only the live question, timer, verdict, current answer, and winner glow. Layers of glow read as noise.

A **"flash"** is a burst of motion+color that lasts ≤600ms and returns to rest. A **"hold"** is a subtle ambient loop that signals "still alive" without demanding attention. We use flashes for feedback, holds for presence.

---

## 1. Selecting an Answer (player)

**Intent:** make the tap feel like physically *pressing a button on the buzzer*, not a web form click.

### Sequence (0 → 220ms)
| Time | Action |
|---|---|
| 0ms | **Press-ready:** on `touchstart`, the tapped option scales to `scale(0.955)` with a hint of accent border (`border-color` 0.12s). The letter chip tints slightly. (Feedback even before release.) |
| ~40ms | **Release:** card snaps back and the chosen option locks into the `selected` state: accent border, soft inner glow ring `box-shadow: 0 0 0 1px rgba(56,189,248,0.3)`, letter chip fills accent. |
| ~60ms | **Lock-in pop:** the whole card does a spring overshoot — `scale(0.96 → 1.02 → 1)` over 300ms via `cubic-bezier(0.34, 1.56, 0.64, 1)` (reuse `@keyframes lockIn`). Non-chosen options dim to 40% to reinforce commitment. |
| ~90ms | **Haptic tick** (vibrate 15ms) + a short `lockIn` click; row/board sends `submit_answer`. The controller swaps to the **"LOCKED IN"** state: green check `✓` pops (`@keyframes scorePopIn`), and a green pulse ring settles. |

### Keyframes in use
- `@keyframes lockIn`, `@keyframes popIn`, `@keyframes scorePopIn`.
- Classes: `.controller-option`, `.controller-option.selected`, `.controller-option:active`, `.controller-locked`.

### Theatrical beat
The locked state is **not** grey — it's a confident green "✓ LOCKED IN" with a soft `box-shadow` so the player sees their choice is committed and safe. The rest of the room *feels* them lock in too (see §6), reinforcing that the room is playing together.

---

## 2. Correct / Wrong Feedback (the reveal)

**Intent:** the reveal is the **single loudest moment** of the round. Everything else is calm so this can be loud.

### Correct (winner's beat)
| Time | Action |
|---|---|
| 0ms | Full-screen dark overlay drops in (`fadeIn` 0.25s), dimming the room and focusing all attention. |
| 250ms | Verdict "CORRECT!" pops with `revealPop` — `scale(0.5 → 1.08 → 1)` over 0.6s, green + green glow `text-shadow`. Plays `sound.win()`. |
| 450ms | Confetti bursts from both edges (`fireConfetti()`, ~4s, brand palette `#38bdf8 #a78bfa #f472b6 #22c55e #fbbf24`). |
| 600–900ms | The correct answer itself fades up; the host's correct **option tile** on the board beneath flashes green (`@keyframes pulse-glow` once). |
| 1100ms | If this player scored, a **score delta** chip pops on the mini-scoreboard / verdict: `+N` scales in (`scorePopIn`) in green. |

### Wrong / Timeout
- Verdict "WRONG" / "NOBODY GOT IT" in red/amber with matching glow; a subtle `shake` on the verdict text only (never the whole screen).
- The correct option on the host board still highlights green (so everyone learns), wrong choices go 25% opacity — no lingering red on the winner.

### Keyframes
- `@keyframes revealPop`, `@keyframes fadeIn`, `@keyframes shake`, `@keyframes pulse-glow`, `@keyframes scorePopIn`.
- Verdict classes: `.reveal-verdict.correct/.wrong/.timeout`.

### Theatrical rule
The **verdict is the only flash**; the rest of the round is measured. Wrong answers get one clean shake on the text — no carpet-bombing into the red.

---

## 3. Timer Running Low

**Intent:** raise tension **monotonically** — never random pulses, always escalating.

### Thresholds (mapped to the host ring + player bar)
| Time left | Bar/Ring color | Number | Extra |
|---|---|---|---|
| `>10s` | accent `#38bdf8` | steady | soft glow `drop-shadow` |
| `≤10s` | warning `#f59e0b` | steady | amber glow |
| `≤5s` | danger `#ef4444` | **pulses** `scale 1 → 1.1` (0.5s loop, `@keyframes timerPulse`) | red glow + ticking sound (once per second) |

### Motion details
- Ring `/` bar fill animates **1s linear** (continuous drain, never stepped).
- Color swaps are an eased `transition: stroke 0.3s` / `background 0.3s`, so the shift is a deliberate *gear change*, not a flicker.
- The numeric readout pulses only at ≤5s — the pulse *is* the "hurry" signal. Before that the count stays still so it stays readable from 6m away on a projector.
- Pausing swaps the number to `Ⅱ` and desaturates the ring (`filter: grayscale(0.8)`) — a clear, calm "time stopped" read.

### Keyframes
- `@keyframes timerPulse`, `.timer-ring-progress.warning/.danger`, `.controller-timer-fill.warning/.danger`, `.timer-container.paused`.

---

## 4. Score Increase

**Intent:** the player must *feel* the points land. Numbers jump and settle with a satisfying pop, then the board re-ranks.

### Sequence (player sees it)
- A floating `+N` (green) eases **up and off** the score pill — `translateY(0 → -40px)` fading out over 0.5s (`@keyframes scoreFloat`).
- The score number itself **counts**: the pill does a `scorePopIn` scale while the value updates, so the eye reads "before → after."
- Score bar/chip on host: the affected player's `mini-score` chip briefly pulses and shows its own `+N` (`score-change.positive`).

### Ranking motion
- After points land, `mini-scores` (top 3) and the leaderboard **re-sort live**: rows glide to their new position using a `translate` transition (`slideInRank` + flex reorder), ~0.5s with spring easing. Final place announces with a small shadow.

### Keyframes
- `@keyframes scoreFloat`, `@keyframes scorePopIn`, class `.score-change.positive/.negative`.

### Theatrical beat
`+N` is the reward's "coverage." It appears exactly where the player is looking (on the thing that changed), pops, floats, and leaves — never lingers to feel like an ad.

---

## 5. Player Joining the Room

**Intent:** the room should *grow* visibly — every new player is a small celebration on the big screen.

### Sequence
| Time | Action |
|---|---|
| 0ms | New player chip materializes on the lobby grid: spring pop `scale(0.8 → 1)` + `fadeUp`, 0.4s (`@keyframes popIn`), staggered with `animation-delay: idx * 0.06s` so a rush of joiners cascades like an audience filling in. |
| ~80ms | Short, pleasant **join blip** sound (distinct from answer/lock sounds). |
| ~120ms | A soft accent glow rings the new chip once (`popIn` + accent border). The player-count badge ticks up. |
| Host board | The person also appears in the **answer-status** row as a `waiting` dot — instantly showing the room's live roster. |

### Anti-pattern (avoid)
- No full-screen flash or disruptive sound on every join. Room-filling happens as a **cascade of small pops**, not one big event — otherwise 8 late joiners read as chaos.

### Keyframes
- `@keyframes popIn`, `@keyframes fadeUp`, `.player-chip`, `.answer-chip.waiting`.

---

## 6. Transition Between Questions

**Intent:** a clean, confident "reset to neutral" that reads as a **round boundary**, not a blank reload.

### Sequence
1. **Reveal lifts:** the reveal overlay disappears; the host board gently returns to full opacity.
2. **Out:** the old question card does a quick, low fade+shrink (`opacity 0.25s`, `translateY(-8px)`) — reserved, no wipes or spins.
3. **Hold:** a ~200ms neutral gap (blank moment is the *drama* — it's the live-TV breath).
4. **In:** the new question card enters with `@keyframes questionReveal` — `translateY(16px) scale(0.98) → settle`, 0.6s `cubic-bezier(0.16,1,0.3,1)`. The category badge and round badge update first (context before content).
5. **Locked-out (player):** options are inert/hidden until the host's countdown begins, so no input races the reveal.

### Keyframes
- `@keyframes questionReveal`, `.question-card`, `.category-badge`, `.round-badge`.

### Theatrical beat
The 200ms hold gives the reveal real weight — the pause before a live cue card flip. Rushing it would read as a glitchy refresh; dragging it would kill energy. This is the "3-2-1" of game shows: **settle → breathe → drop the question.**

---

## 7. Final Ranking Reveal

**Intent:** a **crowning moment**, not a stats table. The winner is celebrated; everyone is listed with earned rank.

### Sequence
| Time | Action |
|---|---|
| 0ms | "Game Over!" title fades in. |
| 250ms | Confetti already erupting (started on game-over entry). |
| 450ms | **Winner spotlight** card slides/scale in (`@keyframes spotlightIn`, 0.7s spring) — gold-tinted glass, top light-line, crown `trophyBounce`. Name is gradient-gold with a warm glow. |
| 650ms | The winner's **score counts up** (`countUp()`, ~900ms, ease-out) from `0` to final — the "podium meter." |
| 900ms+ | Remaining ranks enter **staggered** top-down (leaderboard rows `slideInRank` every ~0.1s). Rank 1 row keeps the gold treatment; 2/3 fade softly. |

### Hierarchy rule
The winner is the only *animated focal point*. The supporting rows enter *quietly and afterward* — they fill context for the room but never compete with the champion.

### Keyframes
- `@keyframes spotlightIn`, `@keyframes slideInRank`, `@keyframes trophyBounce`, `countUp()` (JS), `fireConfetti()` (JS).

---

## Cross-cutting Rules (the "noise budget")

1. **One flash per beat.** Correct = verdict flash + confetti; that's it. Don't stack score pop + board flash + label flash on the same frame.
2. **Ambient = slow.** Room code, trophy, stage glow pulse at 2–3s loops (never faster). Fast/looped animation is reserved for the ≤5s timer.
3. **Every state change is seen, then settles.** Nothing animates indefinitely except the timer at ≤5s and ambient glows.
4. **Motion explains, never hides.** Question is always readable; options that are dimmed stay legible; text is never mid-motion when it matters.
5. **Sound is discrete and scoped:** join ≠ answer ≠ correct ≠ reveal. Distinct timbres so the room can "hear" the state without looking.

---

## Implementation Map (all already in code)
| Interaction | Host.js | CSS classes / keyframes |
|---|---|---|
| Select answer | `submit_answer`, `.controller-option` onclick | `lockIn`, `scorePopIn`, `popIn` |
| Reveal | `showRevealOverlay`, `fireConfetti`, `sound.win` | `revealPop`, `fadeIn`, `shake`, `pulse-glow` |
| Timer low | timer tick state | `timerPulse`, `.warning/.danger`, `paused` |
| Score up | `scoreChanges`, `countUp` | `scoreFloat`, `scorePopIn`, `.score-change` |
| Player joins | lobby player loop | `popIn`, `fadeUp`, `.player-chip` |
| Question transition | `next_question`, `renderGame` | `questionReveal`, `.category-badge` |
| Final ranking | `renderGameOver`, `countUp`, `fireConfetti` | `spotlightIn`, `slideInRank`, `trophyBounce` |
