# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Forest Quest（森林大冒险）** is a Three.js 3D third-person platformer — one game in the parent `mershyai-3d-game` collection. The player controls a fox across 6 levels (L1-L3 forest, L4-L6 cave), collecting crystals and fighting enemies up to a final 2-phase boss. No physics engine: collision is hand-written AABB plus downward Raycaster ground detection.

`DESIGN.md` is the authoritative spec — all physics values, level layouts, enemy behaviors, and the "设计决议(2026-05-03)" decisions live there. Consult it before changing gameplay constants or mechanics.

## Commands

```bash
npm install        # install deps
npm run dev        # Vite dev server at localhost:5173
npm run build      # production build to dist/
npm run preview    # serve the built bundle
```

There is no `npm test`. Tests are standalone Playwright scripts in `tests/*.mjs` requiring a **running dev server**. Run one with:

```bash
npm run dev &                          # dev server must be up first
node tests/e2e-full-run.mjs            # full 6-level playthrough, writes output/playwright/
node tests/capture-screenshots.mjs     # screenshot capture
node scripts/i18n-verify.js            # i18n / locale-switch smoke test (CommonJS)
```

i18n parity (en.js vs zh.js keys) is checked by `scripts/i18n-verify.js`.

## Architecture

`src/main.js` is a thin entry point: `initGame()` → `initOverlays()` → `setState(MENU)`, plus `window` debug hooks.

**`src/game.js`** is the hub — scene/renderer/camera setup, the single `renderer.setAnimationLoop(animate)` loop, and the state machine. States: `MENU → LEVEL_SELECT → PLAYING → (PAUSED | LEVEL_COMPLETE | GAME_OVER)`. `setState()` drives `onStateChange()`, which both notifies the UI and triggers `startLevel()` on entering `PLAYING`. The `animate()` loop only runs gameplay logic while in `PLAYING`: moving platforms, enemy stomp detection (done *before* `player.update()` snaps to ground), crystal collection by distance, hazard/enemy AABB collisions, boss-portal reveal, invulnerability blink, and portal-proximity win check.

**Level loading flow:** `game.startLevel()` → `levels/level-loader.js loadLevel()` → reads a level def from `levels/level-data.js`, disposes the previous level group, then builds platforms / hazards / crystals / decor / enemies / portal by calling `loaders/asset-loader.js loadAsset()` for each. `loadLevel()` returns colliders, meshes, moving platforms, crystals, hazards, enemies, and portal — `game.js` holds these as module-level arrays. `startLevel()` guards against overlapping loads with `isLoadingLevel` / `pendingLevelId`.

**Asset / fallback system:** `assets-manifest.json` (project root) maps each asset `name` to a `.glb` file in `public/models/` plus a `fallback` descriptor. `loadAsset()` fetches `/models/<file>`; on any load error it silently builds a Three.js primitive placeholder via `loaders/fallback-builder.js` from the manifest's `fallback` block (`box`/`sphere`/`cylinder`/`cone`/`composite`). **The game runs fully without any GLB files** — fallbacks are always valid. When adding an asset, add a manifest entry with a `fallback`.

**Enemies:** `enemies/enemy-base.js Enemy` is the base class; `enemy-mushroom.js`, `enemy-sprite.js`, `enemy-golem.js`, `enemy-boss.js` subclass it. `level-loader.js` instantiates by `def.type` string. Each has `update()`, `getCollider()`, `takeHit(stomped)`, `state` (`ACTIVE`/`DEAD`/`DYING`...). The boss carries `phase`, `hp`/`maxHp`, falling-rock logic.

**Player / camera:** `player.js Player` handles WASD movement, gravity, double jump (`MAX_JUMPS`), coyote time, jump buffering, bouncy-platform impulse, and Raycaster ground checks against `platformMeshes`. `camera-controller.js ThirdPersonCamera` is follow-only (per design decision #3 — no mode switching); mouse drag sets `yaw`/`pitch` and auto-follow resumes after `_noInputTimer`.

**Other modules:**
- `constants.js` — all physics/color/audio-hook constants, sourced from DESIGN.md §5. Two overlapping sets exist: top-level exports (`GRAVITY`, `JUMP_V0`...) and grouped `PLAYER`/`CAMERA` objects (Phase 3-2). `player.js` uses the grouped `PLAYER` config.
- `save.js` — localStorage persistence under key `forest_quest_save`; `loadSave`/`recordLevelResult`/`unlockLevel`/`isUnlocked`. Stars from crystals: ≥10→3, ≥7→2, ≥4→1.
- `i18n/index.js` — `t(key)`, `setLocale()`, `onLocaleChange()`; locales in `en.js`/`zh.js`, persisted under `forest-quest-locale`. Default locale is `en`.
- `ui/overlays.js` — all HTML overlays (title, level select, pause, complete, game over); registers callbacks into `game.js` via `registerOverlayCallbacks()`.
- `systems/platform-motion.js` — moving-platform position updates.

## Testing-driven design constraints

`game.js` exposes `window.__gameInternals` (and `window.__gameInternals._forceAnimate`) specifically so Playwright tests can step the loop deterministically, jump to levels, set HP, kill the boss, etc. Keep these hooks intact when refactoring `game.js` — the `tests/*.mjs` scripts depend on them. `window.setLocale` / `window.resetSave` are similar console/debug hooks.

## Conventions

- `vite.config.js` sets `base: './'` — all asset paths must be relative for GitHub Pages subdirectory deployment.
- GLB models: kebab-case filenames matching the manifest `name`; Y-up; character origin at feet, props at bottom-center.
- This game targets PC only (keyboard + mouse) — do not add touch input (design decision #4).
- The parent collection deploys via GitHub Actions on push to `main`.
