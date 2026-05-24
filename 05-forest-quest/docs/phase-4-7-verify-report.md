# Phase 4-7 Verify Report
Date: 2026-05-04T20:26:16.385Z

## Observations
- **L1**: maxVy=5.83, crystals=8, finalState=LEVEL_COMPLETE
- **L2**: mushroom x1=3.635 x2=4.705 delta=1.071
- **L3**: sprite dist1=0.93 dist2=2.76
- **L4**: bouncy vy=17.22 y=6.01
- **L5**: golem state=ACTIVE hp=2 pos=(10.0,1.0,5.0)
- **L6**: boss hp sequence=[7,6,5,4,3,2,1,0], phaseSwitched=true, maxRocks=1, finalState=DEAD

## Bugs Found

### Blocking (fixed in this step)

1. **startLevel race condition**
   - **Location**: `src/game.js` `startLevel`
   - **Symptom**: Calling `setLevel(n)` rapidly caused multiple `startLevel` calls to interleave. `levelEnemies`, `platformMeshes`, `scene.userData.portal` could be set by the wrong level load, resulting in missing enemies, wrong portal state, and broken physics.
   - **Fix**: Serialized `startLevel` with `isLoadingLevel`/`pendingLevelId` flags. Added `window.__gameInternals._levelReady` so E2E can wait for the current level to fully load before querying.

2. **completeLevel triggered during level loading**
   - **Location**: `src/game.js` `animate` portal proximity check
   - **Symptom**: While `startLevel` was loading, `scene.userData.portal` still pointed to the previous level's portal. If the player was near the old portal, `completeLevel()` fired, setting `state=LEVEL_COMPLETE`. This stopped physics and enemy updates, causing L2 mushroom to appear frozen and L4 bouncy platform to fail.
   - **Fix**: Set `scene.userData.portal = null` at the start of `startLevel`. Also added `if (state !== STATES.PLAYING) return` guard in `completeLevel`.

3. **Stomp already-stomped check broken by gravity**
   - **Location**: `src/game.js` enemy collision check
   - **Symptom**: `alreadyStomped` used `player.velocity.y === PLAYER_CFG.stompImpulse` (8). Gravity changes `velocity.y` immediately in the same frame, so the check almost always failed. If the player remained intersecting the enemy after stomp, they took unintended damage.
   - **Fix**: Replaced with `playerStompTimer > 0`. Timer is set to 0.15s on stomp and decremented each frame.

### Experience (post-dev todo)

4. **Headless browser requestAnimationFrame throttling**
   - **Symptom**: In Playwright headless Chromium, long `page.waitForTimeout` without user interaction causes `requestAnimationFrame` to throttle, making `dt` near-zero. Enemies don't patrol and physics don't advance.
   - **Mitigation**: E2E script uses `waitWithAnimate` which manually calls `window.__gameInternals._forceAnimate(performance.now())` every 50ms to keep the game loop advancing.
   - **Post-dev todo**: Consider switching E2E to a non-headless browser or using Playwright's `page.evaluate` in a tight loop for time-sensitive tests.

## Summary
- Blocking bugs: 3 (all fixed in this step)
- Experience bugs: 1 (mitigated in E2E, listed as post-dev todo)
- Acceptable bugs: 0
- Fixed in this step: 3

## Files Changed
- `src/game.js` (+35/-8): Serialized `startLevel`, added `_levelReady`, cleared portal on load, fixed `alreadyStomped` with `playerStompTimer`, added `completeLevel` guard.
- `tests/e2e-full-run.mjs` (+120/-80): Rewrote to use `waitWithAnimate`, added `_levelReady` waits, fixed L3 chase check, fixed L4 bouncy test timing, added L6 re-teleport safety.
