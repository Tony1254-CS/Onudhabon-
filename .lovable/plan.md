## Problem

In Galaxy, planets are grouped by `concept_nodes.subject` into orbital rings. Today that column is empty / wrong because in `src/routes/learn.tsx` we pass the granular **topic** string (e.g. "তড়িৎ প্রবাহ") into the `subject` field of every upsert. Sessions also write `subject: null`. So Galaxy has nothing to group on and the "Mastered / Fragile / Review" sidebar can't filter by subject either.

Right fix: ask for the **subject** in the Learn tab and store `subject` and `topic` as two distinct things.

## What changes (UX)

In the Learn tab's TopicInput (the "আজ কী শিখতে চাও?" screen), above the text input add a compact subject chooser:

- গণিত (Math)
- পদার্থবিজ্ঞান (Physics)
- রসায়ন (Chemistry)
- জীববিজ্ঞান (Biology)
- বাংলা, ইংরেজি, আইসিটি, অন্যান্য (secondary row)

User must pick a subject before "শেখা শুরু করো" / Mind-Map / Direct chat is enabled (default to last-used subject, persisted in `localStorage`). The chosen subject is shown as a small pill at the top of the chat header during the session, and is editable from there.

## What changes (data)

- `learn.tsx` keeps a new `subject` state alongside `topic`.
- All `concept_nodes` upserts (decay path, post-message extraction, mind-map path, finish path) use `subject: subject` instead of `subject: topic`. `onConflict: "user_id,subject,concept"` stays the same — that's exactly why we need a stable subject.
- `sessions` insert/update writes `subject: subject` instead of `null`, so SessionHistory and teacher views show the subject too.
- Galaxy and GalaxySidebar already read `subject` — no change needed there; orbits will populate automatically once data has real subjects.

## Backfill

One migration to backfill existing rows where `subject` looks like a topic (any non-null value not in our canonical subject list) — set them to `'অন্যান্য'` so existing data still groups cleanly instead of producing one orbit per topic. Same for `sessions.subject` where null and a `concept_nodes` row exists for the same topic.

## Files touched

- `src/components/learn/TopicInput.tsx` — add subject selector, change `onPick` signature to `(topic, subject)`; same for `onDirectChat` / `onGenerateMap`.
- `src/routes/learn.tsx` — add `subject` state, persist to localStorage, thread into every `concept_nodes` and `sessions` write, show subject pill in header.
- `supabase/migrations/...` — one backfill migration mapping legacy topic-as-subject rows to `'অন্যান্য'`.

No changes to galaxy code, Supabase functions, or RLS.

## Out of scope

- Auto-detecting subject from the topic via AI (could be a follow-up).
- Changing the Galaxy UI itself.
