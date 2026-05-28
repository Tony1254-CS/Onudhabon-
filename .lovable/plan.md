## Goal

1. The "জনপ্রিয় বিষয়" chips at the bottom of the Learn tab should change based on the selected subject (গণিত / পদার্থবিজ্ঞান / রসায়ন / জীববিজ্ঞান / বাংলা / ইংরেজি / আইসিটি / অন্যান্য).
2. Confirm the subject field flows correctly into the teacher dashboard, student progress page, classroom interventions, and Galaxy — and fix any place that still doesn't use it.

## Part 1 — Subject-aware suggestions (TopicInput.tsx)

Replace the single flat `SUGGESTED` array with a per-subject map:

```ts
const SUGGESTED_BY_SUBJECT: Record<Subject, string[]> = {
  "গণিত":           ["দ্বিঘাত সমীকরণ", "ত্রিকোণমিতি", "সম্ভাব্যতা", "ক্যালকুলাস", "ভেক্টর"],
  "পদার্থবিজ্ঞান":   ["তড়িৎ প্রবাহ", "নিউটনের সূত্র", "আলোর প্রতিফলন", "তরঙ্গ", "তাপগতিবিদ্যা"],
  "রসায়ন":          ["রাসায়নিক বিক্রিয়া", "পর্যায় সারণি", "অম্ল ও ক্ষারক", "জৈব যৌগ", "মোলারিটি"],
  "জীববিজ্ঞান":     ["কোষ বিভাজন", "সালোকসংশ্লেষণ", "জেনেটিক্স", "মানবদেহের সিস্টেম", "বিবর্তন"],
  "বাংলা":          ["ক্রিয়াপদ", "সমাস", "সন্ধি", "ছন্দ", "অলংকার"],
  "ইংরেজি":         ["Tenses", "Voice Change", "Narration", "Prepositions", "Essay Writing"],
  "আইসিটি":         ["HTML বেসিক", "নেটওয়ার্কিং", "ডেটাবেস", "অ্যালগরিদম", "সাইবার নিরাপত্তা"],
  "অন্যান্য":       ["সাধারণ জ্ঞান", "ইতিহাস", "ভূগোল", "অর্থনীতি", "নাগরিকতা"],
};
```

UI changes inside `TopicInput.tsx`:
- Render `SUGGESTED_BY_SUBJECT[subject]` instead of the static `SUGGESTED`.
- Update the section label dynamically: `"জনপ্রিয় টপিক · {subject}"`.
- Clicking a chip calls `onPick(topic, subject)` with the currently selected subject (no longer pulls from a per-item `subject` like before).
- Re-animate the chip list when `subject` changes (motion `key={subject}`) so the switch feels intentional.

No other files change for Part 1.

## Part 2 — Verify subject propagation everywhere

The migration in the previous turn already backfills `subject` on `concept_nodes` and `sessions`, and `learn.tsx` now writes the canonical subject on every upsert. The read sites below already select `subject` and display it — they will populate automatically as new sessions are saved:

- `src/routes/dashboard.tsx` — teacher dashboard: reads `sessions.subject` and `concept_nodes.subject`, used in `StudentList` and intervention panel labels. ✅ no code change.
- `src/routes/student.tsx` — student progress: stats card "তুমি Nটি বিষয় অন্বেষণ করেছ", per-concept subject badge, sessions list "• {subject}". ✅ no code change.
- `src/components/classroom/StudentInterventionsTab.tsx` — shows `iv.subject` on each intervention row. ✅ no code change.
- `src/components/dashboard/InterventionPanel.tsx` — already carries `subject` through analysis → intervention insert. ✅ no code change.
- `src/routes/galaxy.tsx` + `src/components/galaxy/GalaxySidebar.tsx` — group/filter by `concept_nodes.subject`. ✅ no code change.

One small fix to keep things consistent:
- `supabase/functions/extract-concepts/index.ts` and any other server function that inserts/upserts into `concept_nodes` should write the same `subject` value passed from the client (not the topic). Quick audit + patch only if they currently mirror topic into subject.

## Out of scope

- Auto-detecting subject from free-text topic via AI.
- Changing Galaxy / Dashboard visual layout.
- Editing past rows beyond what the existing backfill migration already does.

## Files touched

- `src/components/learn/TopicInput.tsx` — per-subject suggestion map + dynamic label/animation.
- `supabase/functions/extract-concepts/index.ts` — audit only; patch if it overwrites `subject` with topic.
