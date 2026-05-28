# Plan — Three Upgrades

## 1) Dashboard: Subject + Topic pivot (both, not either/or)

The teacher dashboard today is **student-first** only. We'll keep that, and add a **pivot switch** at the top so the teacher can view the same data three ways:

**Pivot toggle (top of `/dashboard`):** `শিক্ষার্থী | বিষয় | টপিক`

- **শিক্ষার্থী (current):** unchanged — student list, per-student timeline, weekly report.
- **বিষয় (Subject view, NEW):**
  - Cards per subject (পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান, গণিত, +Other) showing: # students engaged, avg mastery, # weak concepts, top struggling topic.
  - Click a subject → drills into a **Subject Detail panel**: list of all topics under that subject, per-topic avg mastery across class, # students struggling, heatmap row.
- **টপিক (Topic view, NEW):**
  - Flat sortable table of every concept/topic in the class with columns: Topic · Subject · Class avg mastery · # students · # struggling · Last touched.
  - Click a topic → side drawer: which students mastered, which are weak, quick "Assign review" button (reuses existing `QuickReviewModal`).

**Stat cards** above the pivot stay global (total students, avg mastery, etc.).

**Filters added beside pivot:** Subject dropdown (filters all three views), search box.

No DB changes — `concept_nodes.subject` and `concept_nodes.concept` already exist; we just aggregate differently in `useMemo`.

**Files:** `src/routes/dashboard.tsx`, new `src/components/dashboard/SubjectView.tsx`, `src/components/dashboard/TopicView.tsx`, `src/components/dashboard/TopicDrawer.tsx`.

---

## 2) Parent profile in `/track` — richer features

Today the parent's tracked-student card shows only: name, concept count, avg mastery, weakest concept, last session, cognitive state. We'll expand the per-student card into an **expandable detail panel** (click card to expand inline):

- **Subject breakdown bars** — mastery % per subject (mini stacked bar).
- **7-day activity sparkline** — sessions/day + mastery trend.
- **Top 3 strengths and Top 3 weaknesses** (concepts).
- **Recent topics studied** (last 5 sessions: topic + cognitive state badge + date).
- **Cognitive state distribution** over last 7 days (small donut: focused / confused / overloaded / disengaged %).
- **Parent actions row:**
  - **"একটি বার্তা পাঠাও"** → inserts a `notifications` row (`type: 'teacher_message'`) for the student. Parents are already authorized via the existing `notif_insert_teacher_for_student` policy intent — we'll add a parallel parent-observer policy in a tiny migration so parents linked via `student_links` can also notify.
  - **"সাপ্তাহিক রিপোর্ট প্রিন্ট"** — opens print-friendly view (reuse existing print styles).
  - **"লক্ষ্য দেখো"** — read-only list of student's `learning_goals`.

**Top-of-page additions:** when parent has 2+ kids, a small comparison strip (avg mastery side-by-side).

**DB:** one tiny migration to extend the parent-message RLS policy. Reads use existing observer policies on `concept_nodes`, `sessions`, `learning_goals` (already in place for `is_linked_observer`).

**Files:** `src/routes/track.tsx`, new `src/components/track/StudentDetail.tsx`, `src/components/track/ParentMessageModal.tsx`, one migration.

---

## 3) Cognitive Engine — multi-signal "experienced teacher"

Today there are **two engines that don't talk to each other**:
- `useCognitiveState` (chat-signal based: msg length, cadence, idle) → drives the panel state.
- `AttentionWidget` (camera face/gaze) → only reports `faceMissingFor` + `awayCount30s`, not fused in.

Result: the panel mostly only reflects "looking / not looking". We'll **fuse signals** and surface a richer, more human coach.

### A) Fuse attention signals into the cognitive state

Extend `useCognitiveMetrics(signals, mode, attention?)` to accept an optional attention snapshot:
```ts
attention?: { status: AttentionStatus; faceMissingFor: number; awayCount30s: number }
```

New combined classification rules (added to `classify()`):
- `faceMissingFor > 25s` → force **disengaged** (overrides chat focus).
- `awayCount30s >= 4` while chat looks focused → **confused** (eyes wandering = not following).
- `attention.status === "focused"` AND chat in `focused` → promote to **flow** earlier.
- `awayCount30s >= 6` + short replies → **overloaded** (mental fatigue, not just confusion).
- `attention.status === "stable"` + long idle → still **disengaged** (present but checked out).

### B) Add behavioral signals from the chat stream we already have

We already capture send/receive signals. Add lightweight derived signals (no new infra):
- **Backspace/edit ratio** — pass from `ChatInput` (count keystrokes per submitted char). High ratio + slow cadence → **confused**.
- **Question marks in user msgs / minute** — bursts of "?" → **confused**.
- **Time-on-page** vs. **time-actually-typing** — long page time, little typing → **disengaged**.
- **Mastery delta from last session** (already in `sessions.mastery_score`) — sharp drop → **overloaded** (trying too hard topic).

### C) Smarter coaching — feels like a real teacher

Replace the 2-tip-per-state static `COACH` table with a **rule-prioritised tip engine**. Tips are picked by matching the *actual reason vector*, not just the state name. Examples:

| Trigger | Coach says |
|---|---|
| `confused` + many "?" in last 60s | "তুমি একই জিনিস বারবার জিজ্ঞেস করছ — চলো ভিত্তি থেকে শুরু করি। আগের ধাপটা আবার দেখো।" + button "**আগের ধাপে ফেরো**" |
| `overloaded` + 3+ short replies + camera away 5x | "টানা ১৫ মিনিট হলো — চোখ ক্লান্ত। ২০-২০-২০ নিয়ম: ২০ ফুট দূরে ২০ সেকেন্ড তাকাও।" + **৫ মিনিট টাইমার** button |
| `disengaged` + face missing | "তুমি কি এখনো আছ? ফিরে এসে এক লাইনে বলো — কোথায় আটকেছ?" |
| `flow` + long focus minutes | "তুমি ২৩ মিনিট গভীর মনোযোগে — দারুণ! এখন একটা কঠিন প্রশ্ন নাও যেটা সাধারণত এড়িয়ে যাও।" |
| `confused` + low mastery on prerequisite concept | "এই বিভ্রান্তির শিকড় [Prerequisite Topic]-এ। ২ মিনিটের রিভিউ দিই?" + **রিভিউ শুরু করো** |
| `mastery-ready` + camera focused | "তুমি প্রস্তুত। এবার নিজে শেখাও — যেন আমি ৫ বছরের বাচ্চা।" + **Socratic চালু করো** |

Tips become objects with `triggers`, `priority`, `actions[]`. The engine picks highest-priority match. Tips include **actionable buttons** (start break timer, jump to prerequisite, switch to Socratic, replay last AI msg, etc.) wired to existing handlers in `learn.tsx`.

### D) Panel UX upgrades (`CognitivePanel.tsx`)

- New **"Signals" row** showing what the AI is actually seeing: 👁 Eyes · ⌨ Typing · 🕒 Pace · 📉 Trend (mini chips with values). Makes the engine *legible* — user sees why a tip appeared.
- **Action buttons** under each tip, not just text.
- Keep flow ring, waveform, timeline — already great.

### E) Wire-up

- `learn.tsx` passes `attention` snapshot from `AttentionWidget.onSignal` into `useCognitiveMetrics`.
- `ChatInput.tsx` exposes an `onKeystroke` callback (keystroke count + backspaces) → fed into a new `useTypingMetrics` hook.
- Persist the resolved cognitive state per session (already does — `sessions.cognitive_state`), but now write it more frequently (every state transition, debounced 10s) so dashboard/track see live state.

**No DB changes for this section** beyond what already exists.

**Files:**
- `src/hooks/useCognitiveState.ts` — extend signature, fuse attention, new coach engine.
- New `src/hooks/useTypingMetrics.ts`.
- `src/components/learn/CognitivePanel.tsx` — Signals row + action buttons.
- `src/components/learn/ChatInput.tsx` — onKeystroke callback.
- `src/routes/learn.tsx` — pass attention into hook, handle coach actions.

---

## Out of scope (won't touch)
- Galaxy view, Learn topic input, Session history — not mentioned.
- Auth flow, schema for `concept_nodes` / `sessions`.
- No new external APIs or model calls — all engine logic runs client-side from existing signals.

Approve and I'll implement in this order: **(3) Cognitive Engine → (1) Dashboard pivot → (2) Parent track detail.**
