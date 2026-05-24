import { SAVE_KEY } from './constants.js'

const SAVE_VERSION = 1

function createDefaultSave() {
  const levels = {}
  for (let i = 1; i <= 6; i++) {
    levels[i] = {
      unlocked: i === 1,
      bestStars: 0,
      bestTime: null,
      crystals: 0,
    }
  }
  return {
    version: SAVE_VERSION,
    levels,
    settings: { locale: 'zh' },
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return createDefaultSave()
    const data = JSON.parse(raw)
    if (!data || data.version !== SAVE_VERSION) {
      // Migrate or reset on version mismatch
      return createDefaultSave()
    }
    // Ensure all 6 levels exist
    for (let i = 1; i <= 6; i++) {
      if (!data.levels[i]) {
        data.levels[i] = { unlocked: false, bestStars: 0, bestTime: null, crystals: 0 }
      }
    }
    return data
  } catch {
    return createDefaultSave()
  }
}

export function saveSave(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('[save] failed to write save:', e)
  }
}

export function resetSave() {
  const fresh = createDefaultSave()
  saveSave(fresh)
  return fresh
}

export function unlockLevel(state, id) {
  if (state.levels[id]) {
    state.levels[id].unlocked = true
    saveSave(state)
  }
}

export function recordLevelResult(state, id, stars, time, crystals = 0) {
  const lv = state.levels[id]
  if (!lv) return
  let changed = false
  if (stars > lv.bestStars) {
    lv.bestStars = stars
    changed = true
  }
  if (time != null && (lv.bestTime == null || time < lv.bestTime)) {
    lv.bestTime = time
    changed = true
  }
  if (crystals > lv.crystals) {
    lv.crystals = crystals
    changed = true
  }
  if (changed) saveSave(state)
}

export function isUnlocked(state, id) {
  return !!state.levels[id]?.unlocked
}
