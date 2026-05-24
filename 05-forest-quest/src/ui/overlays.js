import {
  getState,
  setState,
  STATES,
  getSaveState,
  getCurrentLevelId,
  refreshLevelSelect,
  retryLevel,
  goToNextLevel,
  t,
  onLocaleChange,
  isUnlocked,
  resetSave,
  registerOverlayCallbacks,
} from '../game.js'
import { setLocale, getLocale } from '../i18n/index.js'

const overlayRoot = document.getElementById('overlay-root')

// ── Overlay refs ──────────────────────────────────────────
const els = {}

function getOverlay(id) {
  if (!els[id]) els[id] = document.getElementById(id)
  return els[id]
}

function show(id) {
  const el = getOverlay(id)
  if (el) el.classList.add('active')
}

function hide(id) {
  const el = getOverlay(id)
  if (el) el.classList.remove('active')
}

function hideAll() {
  ;[
    'overlay-title',
    'overlay-level-select',
    'overlay-pause',
    'overlay-level-complete',
    'overlay-game-over',
  ].forEach(hide)
}

// ── Render helpers ────────────────────────────────────────
function renderStars(count, max = 3) {
  let html = ''
  for (let i = 0; i < max; i++) {
    html += `<span class="star ${i < count ? 'filled' : ''}">★</span>`
  }
  return html
}

function formatTime(sec) {
  if (sec == null) return '--:--'
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}

const LEVEL_EMOJI = {
  1: '🌲',
  2: '🌲',
  3: '🏞',
  4: '🕳',
  5: '🕳',
  6: '👹',
}

// ── Level select grid ─────────────────────────────────────
function renderLevelSelect() {
  const grid = document.querySelector('#overlay-level-select .level-grid')
  if (!grid) return
  const save = getSaveState()
  grid.innerHTML = ''
  for (let i = 1; i <= 6; i++) {
    const lv = save.levels[i]
    const unlocked = lv?.unlocked
    const cell = document.createElement('div')
    cell.className = `level-cell ${unlocked ? '' : 'locked'}`
    const bestTime = unlocked && lv.bestTime != null ? formatTime(lv.bestTime) : null
    cell.innerHTML = `
      <div class="level-thumb">
        <span class="level-emoji">${unlocked ? LEVEL_EMOJI[i] : '🔒'}</span>
      </div>
      <div class="level-name">${t(`level.${i}.name`)}</div>
      <div class="level-subtitle">${t(`level.${i}.subtitle`)}</div>
      <div class="level-stars">${unlocked ? renderStars(lv.bestStars) : '<span class="lock">🔒</span>'}</div>
      ${bestTime ? `<div class="level-best-time">${t('levelSelect.bestTime')}: ${bestTime}</div>` : ''}
    `
    if (unlocked) {
      cell.addEventListener('click', () => {
        setState(STATES.PLAYING, { levelId: i })
      })
    }
    grid.appendChild(cell)
  }
}

// ── Locale refresh ────────────────────────────────────────
function refreshAllText() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')
    if (key) el.textContent = t(key)
  })
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title')
    if (key) el.title = t(key)
  })

  // Title logo name uses t('title.name')
  const titleName = document.querySelector('#overlay-title .title-name')
  if (titleName) titleName.textContent = t('title.name')

  // Tagline uses t('title.tagline')
  const titleTagline = document.querySelector('#overlay-title .title-tagline')
  if (titleTagline) titleTagline.textContent = t('title.tagline')

  // Refresh pause / result / game-over static labels that may not have data-i18n
  const pauseTitle = document.querySelector('#overlay-pause .pause-title')
  if (pauseTitle && !pauseTitle.hasAttribute('data-i18n')) pauseTitle.textContent = t('pause.title')

  const goTitle = document.querySelector('#overlay-game-over .go-title')
  if (goTitle && !goTitle.hasAttribute('data-i18n')) goTitle.textContent = t('gameOver.title')

  const lcTitle = document.querySelector('#overlay-level-complete .lc-title')
  if (lcTitle && !lcTitle.hasAttribute('data-i18n')) lcTitle.textContent = t('result.complete')

  renderLevelSelect()
}

// ── State-driven overlay updates ──────────────────────────
function updateOverlay(state, payload) {
  hideAll()
  switch (state) {
    case STATES.MENU:
      show('overlay-title')
      break
    case STATES.LEVEL_SELECT:
      renderLevelSelect()
      show('overlay-level-select')
      break
    case STATES.PLAYING:
      // no overlay
      break
    case STATES.PAUSED:
      show('overlay-pause')
      break
    case STATES.LEVEL_COMPLETE:
      renderLevelComplete(payload)
      show('overlay-level-complete')
      break
    case STATES.GAME_OVER:
      renderGameOver(payload)
      show('overlay-game-over')
      break
  }
}

function renderLevelComplete(payload) {
  const title = document.querySelector('#overlay-level-complete .lc-level-name')
  if (title) title.textContent = t(`level.${payload.levelId}.name`)

  const lcTitle = document.querySelector('#overlay-level-complete .lc-title')
  if (lcTitle) lcTitle.textContent = t('result.complete')

  // Stars animation
  const starEls = document.querySelectorAll('#overlay-level-complete .lc-star')
  starEls.forEach((el, i) => {
    el.classList.remove('lit')
    el.style.animationDelay = `${i * 0.3}s`
    if (i < (payload.stars || 0)) {
      // force reflow to restart animation
      void el.offsetWidth
      el.classList.add('lit')
    }
  })

  // All clear message
  const allClearEl = document.querySelector('#overlay-level-complete .lc-all-clear')
  if (allClearEl) {
    allClearEl.classList.toggle('show', payload.levelId === 6)
    allClearEl.textContent = t('result.allClear')
  }

  // Next button visibility
  const nextBtn = document.querySelector('#overlay-level-complete .btn-next')
  if (nextBtn) {
    nextBtn.style.display = payload.levelId >= 6 ? 'none' : ''
    nextBtn.textContent = t('result.next')
  }

  const retryBtn = document.querySelector('#overlay-level-complete .btn-retry')
  if (retryBtn) retryBtn.textContent = t('result.retry')

  const backBtn = document.querySelector('#overlay-level-complete .btn-back')
  if (backBtn) backBtn.textContent = t('result.back')

  const timeLabel = document.querySelector('#overlay-level-complete .lc-time-label')
  if (timeLabel) timeLabel.textContent = t('result.time')

  const bestTimeLabel = document.querySelector('#overlay-level-complete .lc-best-time-label')
  if (bestTimeLabel) bestTimeLabel.textContent = t('result.bestTime')

  const crystalsLabel = document.querySelector('#overlay-level-complete .lc-crystals-label')
  if (crystalsLabel) crystalsLabel.textContent = t('result.crystals')

  const timeEl = document.querySelector('#overlay-level-complete .lc-time')
  if (timeEl) timeEl.textContent = formatTime(payload.time)

  const crystalsEl = document.querySelector('#overlay-level-complete .lc-crystals')
  if (crystalsEl) {
    crystalsEl.textContent = `${payload.crystals ?? 0} / ${payload.totalCrystals ?? 10}`
  }

  const bestTimeEl = document.querySelector('#overlay-level-complete .lc-best-time')
  if (bestTimeEl) {
    bestTimeEl.textContent = formatTime(payload.bestTime)
  }
}

function renderGameOver(payload) {
  const titleEl = document.querySelector('#overlay-game-over .go-title')
  if (titleEl) {
    titleEl.textContent = t('gameOver.title')
  }
  const reasonEl = document.querySelector('#overlay-game-over .go-reason')
  if (reasonEl) {
    reasonEl.textContent = payload?.reason || ''
  }
}

// ── Wire DOM events ───────────────────────────────────────
export function initOverlays() {
  // Title
  const btnStart = document.querySelector('#overlay-title .btn-start')
  if (btnStart) {
    btnStart.addEventListener('click', () => setState(STATES.PLAYING, { levelId: 1 }))
  }
  const btnTitleLevelSelect = document.querySelector('#overlay-title .btn-level-select')
  if (btnTitleLevelSelect) {
    btnTitleLevelSelect.addEventListener('click', () => setState(STATES.LEVEL_SELECT))
  }

  // Language switch
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const locale = btn.getAttribute('data-lang')
      if (locale) setLocale(locale)
    })
  })

  // Level select back
  const btnLsBack = document.querySelector('#overlay-level-select .btn-back')
  if (btnLsBack) {
    btnLsBack.addEventListener('click', () => setState(STATES.MENU))
  }

  // Pause
  const btnResume = document.querySelector('#overlay-pause .btn-resume')
  if (btnResume) {
    btnResume.addEventListener('click', () => setState(STATES.PLAYING))
  }
  const btnPauseLs = document.querySelector('#overlay-pause .btn-level-select')
  if (btnPauseLs) {
    btnPauseLs.addEventListener('click', () => setState(STATES.LEVEL_SELECT))
  }
  const btnPauseMenu = document.querySelector('#overlay-pause .btn-menu')
  if (btnPauseMenu) {
    btnPauseMenu.addEventListener('click', () => setState(STATES.MENU))
  }

  // Level complete
  const btnLcNext = document.querySelector('#overlay-level-complete .btn-next')
  if (btnLcNext) {
    btnLcNext.addEventListener('click', () => {
      goToNextLevel()
      if (getState() === STATES.LEVEL_SELECT) {
        renderLevelSelect()
      }
    })
  }
  const btnLcRetry = document.querySelector('#overlay-level-complete .btn-retry')
  if (btnLcRetry) {
    btnLcRetry.addEventListener('click', () => retryLevel())
  }
  const btnLcBack = document.querySelector('#overlay-level-complete .btn-back')
  if (btnLcBack) {
    btnLcBack.addEventListener('click', () => setState(STATES.LEVEL_SELECT))
  }

  // Game over
  const btnGoRetry = document.querySelector('#overlay-game-over .btn-retry')
  if (btnGoRetry) {
    btnGoRetry.addEventListener('click', () => retryLevel())
  }
  const btnGoBack = document.querySelector('#overlay-game-over .btn-back')
  if (btnGoBack) {
    btnGoBack.addEventListener('click', () => setState(STATES.LEVEL_SELECT))
  }
  const btnGoMenu = document.querySelector('#overlay-game-over .btn-menu')
  if (btnGoMenu) {
    btnGoMenu.addEventListener('click', () => setState(STATES.MENU))
  }

  // Locale change
  onLocaleChange(() => {
    refreshAllText()
    // Update lang buttons active state
    const current = getLocale()
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === current)
    })
  })

  // Register callbacks so game.js can drive overlays
  registerOverlayCallbacks({
    update: updateOverlay,
    refreshLevelSelect: renderLevelSelect,
  })

  // Initial text render + lang button state
  refreshAllText()
  const current = getLocale()
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === current)
  })
}
