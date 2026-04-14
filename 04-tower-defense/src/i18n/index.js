/**
 * Internationalization (i18n) module
 * Supports English (en) and Chinese (zh)
 * Default language: English
 */

import en from './locales/en.js'
import zh from './locales/zh.js'

const locales = { en, zh }

// Default locale is English
const DEFAULT_LOCALE = 'en'
const STORAGE_KEY = 'td_locale'

let currentLocale = DEFAULT_LOCALE
let listeners = []

/**
 * Initialize locale from localStorage or use default
 */
function initLocale() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && locales[saved]) {
    currentLocale = saved
  } else {
    // 强制默认英文，不检测浏览器语言
    currentLocale = DEFAULT_LOCALE
  }
}

/**
 * Get current locale
 * @returns {string} Current locale code ('en' or 'zh')
 */
export function getLocale() {
  return currentLocale
}

/**
 * Set locale and persist to localStorage
 * @param {string} locale - Locale code ('en' or 'zh')
 */
export function setLocale(locale) {
  if (!locales[locale]) {
    console.warn(`Locale "${locale}" not found`)
    return
  }
  currentLocale = locale
  localStorage.setItem(STORAGE_KEY, locale)
  notifyListeners()
}

/**
 * Translate a key to the current locale
 * @param {string} key - Dot-separated key (e.g., 'towers.arrow.name')
 * @param {object} params - Optional parameters for interpolation
 * @returns {string} Translated text
 */
export function t(key, params = {}) {
  const keys = key.split('.')
  let value = locales[currentLocale]
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // Fallback to English if key not found in current locale
      value = locales[DEFAULT_LOCALE]
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey]
        } else {
          console.warn(`Translation key not found: ${key}`)
          return key
        }
      }
      break
    }
  }
  
  if (typeof value !== 'string') {
    return key
  }
  
  // Interpolate parameters (e.g., {n} -> params.n)
  return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
    return params[paramKey] !== undefined ? params[paramKey] : `{${paramKey}}`
  })
}

/**
 * Register a callback for locale changes
 * @param {function} callback - Function to call when locale changes
 * @returns {function} Unsubscribe function
 */
export function onLocaleChange(callback) {
  listeners.push(callback)
  return () => {
    listeners = listeners.filter(cb => cb !== callback)
  }
}

/**
 * Notify all registered listeners of locale change
 */
function notifyListeners() {
  listeners.forEach(callback => callback(currentLocale))
}

/**
 * Get all available locales
 * @returns {string[]} Array of locale codes
 */
export function getAvailableLocales() {
  return Object.keys(locales)
}

// Initialize on load
initLocale()
