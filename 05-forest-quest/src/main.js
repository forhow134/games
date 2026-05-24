import { initGame, setState, STATES, getSaveState, resetCamera } from './game.js'
import { initOverlays } from './ui/overlays.js'

initGame()
initOverlays()
setState(STATES.MENU)

// Reset-camera button — keep wiring out of game.js since it's pure UI glue.
// CSS hides the button outside of PLAYING via body[data-state], so a stray
// click on it during menus can't reach here anyway.
const resetBtn = document.getElementById('hud-reset-camera')
if (resetBtn) {
  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    resetCamera()
    resetBtn.blur()  // avoid Space key re-triggering it through focus
  })
}

// Expose for console debugging / locale switching
window.setLocale = (locale) => {
  import('./i18n/index.js').then((mod) => {
    mod.setLocale(locale)
  })
}
window.getSaveState = getSaveState
window.resetSave = () => {
  import('./save.js').then((mod) => {
    const fresh = mod.resetSave()
    location.reload()
  })
}
