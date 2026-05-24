/**
 * Internationalization (i18n) module
 * Supports English (en) and Chinese (zh)
 * Default language: English
 */

import en from './en.js'
import zh from './zh.js'

const locales = { en, zh }

const DEFAULT_LOCALE = 'en'
const STORAGE_KEY = 'forest-quest-locale'

let currentLocale = DEFAULT_LOCALE
let listeners = []

function initLocale() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && locales[saved]) {
    currentLocale = saved
  } else {
    currentLocale = DEFAULT_LOCALE
  }
}

export function getLocale() {
  return currentLocale
}

export function setLocale(locale) {
  if (!locales[locale]) {
    console.warn(`Locale "${locale}" not found`)
    return
  }
  currentLocale = locale
  localStorage.setItem(STORAGE_KEY, locale)
  notifyListeners()
}

export function t(key, params = {}) {
  const keys = key.split('.')
  let value = locales[currentLocale]

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
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

  return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
    return params[paramKey] !== undefined ? params[paramKey] : `{${paramKey}}`
  })
}

export function onLocaleChange(callback) {
  listeners.push(callback)
  return () => {
    listeners = listeners.filter(cb => cb !== callback)
  }
}

function notifyListeners() {
  listeners.forEach(callback => callback(currentLocale))
}

export function getAvailableLocales() {
  return Object.keys(locales)
}

initLocale()
