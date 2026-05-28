
## Goal

Make the Galaxy view actually feel like a solar system: a glowing central sun with clearly visible **orbital rings**, planets traveling along those orbits, and a tilted 3D perspective so the rings read as depth — not the current flat top-down disk where everything collapses onto a single circle.

Scope: visual/3D-only changes inside `src/components/galaxy/createGalaxy.ts` (plus tiny tweaks in `src/routes/galaxy.tsx` for camera framing & legend copy). No data/schema changes.

## Why the current view fails

- All planets end up on **one visible ring** because most existing `concept_nodes` rows still have `subject = null` / unknown → they all fall into the `_other` bucket and share one orbit at radius 24.
- Camera sits almost top-down (`y=35, z=90`), so even the per-subject rings that do exist look like concentric flat circles, not orbits.
- Orbit rings render at `opacity 0.18` with no glow → invisible against the red prerequisite lines, which dominate the frame.
- No visual distinction between "the sun" and "a big mastered planet" — both are orange spheres of similar on-screen size.

## Changes

### 1. Orbits — make them the hero
- Replace flat `RingGeometry` with a **glowing tube ring** (`TorusGeometry`, thin radius ~0.08, 256 segments) using `MeshBasicMaterial` + additive blending and `opacity ~0.55`. Add a second wider torus at lower opacity as a soft halo.
- Give each subject orbit a **distinct tilt + slight elliptical offset** (shift pivot center on X by `radius * 0.06`) so rings visibly cross in 3D instead of stacking concentrically.
- Add a faint **floating subject label** (CSS2D) anchored at the outer edge of each ring, in the subject's accent color.
- Bucket unknown-subject stars: instead of dumping them all on one `_other` ring, **distribute them across the 4 known subject orbits** by hash of concept name. Keeps every orbit populated and visually balanced until backfill catches up.

### 2. The Sun — make it unmistakable
- Bump core sphere radius `4.5 → 6`, add a slow rotating noise texture (procedural via shader material or simply two counter-rotating offset spheres with additive orange/yellow MeshBasic).
- Add a **lens-flare sprite** (THREE.Sprite with radial-gradient canvas texture) facing the camera for the classic "sun glare".
- Pulse the corona opacity ±15% on a 4s sine in the animate loop.

### 3. Camera & framing
- Default position `(0, 18, 95)` looking at origin with a ~12° downward pitch → orbits read as ellipses, not circles.
- Initial `controls.autoRotateSpeed` lowered to `0.15` for a slow cinematic drift.
- On first mount, run a 1.2s ease-in camera dolly from `(0, 60, 160)` → default position so the system "assembles" into view.

### 4. Planets — subtle polish (no data change)
- Mastered (`gold`) planets get a thin **Saturn-style ring** (small TorusGeometry, tilted, low opacity gold).
- Reduce per-planet glow halo from `size * 2.2` → `size * 1.6` so they stop bleeding into each other on dense orbits.
- Prerequisite link lines: lower default opacity (`0.35 → 0.15`) and only draw fragile (red) links at full strength — eliminates the current red-spaghetti look.

### 5. Legend / route
- In `galaxy.tsx`, update the bottom legend to mention "কক্ষপথ" (orbit) per subject with the 4 subject color dots, replacing the generic "নির্ভরতা / ভঙ্গুর ভিত্তি" entries (move those to a smaller secondary line).

## Out of scope
- No DB changes, no backfilling subjects, no new tables.
- Sidebar, top bar, detail panel, celebration burst — untouched.
- No new dependencies.

## Files
- `src/components/galaxy/createGalaxy.ts` — orbits, sun, planets, camera, link styling (main work).
- `src/routes/galaxy.tsx` — legend copy + initial camera framing only.
