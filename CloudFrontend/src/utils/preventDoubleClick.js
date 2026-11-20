/**
 * Global guard: no button / submit control may fire twice from a double-click
 * or a rapid repeat click. Installed once at app bootstrap (capture phase),
 * so it covers native buttons, MUI ButtonBase, role=button, and form submits
 * even when React remounts the node between the two clicks.
 */

export const BUTTON_LOCK_MS = 800
export const ACTION_LOCK_MS = 1500
export const FORM_LOCK_MS = 2000
export const SAME_SPOT_PX = 16
export const SAME_SPOT_LOCK_MS = 400

export const BUTTON_SELECTOR = [
  'button',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  '[role="button"]',
  '.MuiButtonBase-root',
  '.pd-btn-save',
  '.pd-btn-outline',
  '.pd-btn-success',
  '.pd-btn-danger',
  '.pd-btn-warning',
].join(',')

const ACTION_CLASS_RE = /pd-btn-(save|danger|success|warning)/

export function findButton(target) {
  if (!target || typeof target.closest !== 'function') return null
  const el = target.closest(BUTTON_SELECTOR)
  if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return null
  return el
}

export function isActionButton(btn) {
  if (!btn) return false
  const type = (btn.getAttribute('type') || '').toLowerCase()
  if (type === 'submit') return true
  if (btn.tagName === 'BUTTON' && type === '' && btn.closest('form')) return true
  const className = typeof btn.className === 'string' ? btn.className : String(btn.className || '')
  return ACTION_CLASS_RE.test(className)
}

export function lockMsFor(btn) {
  return isActionButton(btn) ? ACTION_LOCK_MS : BUTTON_LOCK_MS
}

export function hasPointerPoint(x, y, detail) {
  if (detail > 0) return true
  return x !== 0 || y !== 0
}

export function shouldBlockRepeat({
  now,
  lastTime,
  lastX,
  lastY,
  lastBtn,
  x,
  y,
  btn,
  lockMs,
  spotPx = SAME_SPOT_PX,
  spotLockMs = SAME_SPOT_LOCK_MS,
  detail = 1,
}) {
  if (detail > 1) return true
  if (!lastTime) return false
  const dt = now - lastTime
  if (lastBtn && lastBtn === btn && dt < lockMs) return true
  if (
    dt < spotLockMs &&
    hasPointerPoint(x, y, detail) &&
    Math.abs(x - lastX) <= spotPx &&
    Math.abs(y - lastY) <= spotPx
  ) {
    return true
  }
  return false
}

let installed = false
let lastClick = { t: 0, x: 0, y: 0, btn: null }
const lastFormSubmit = new WeakMap()

function block(event) {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

function isLogoutControl(btn) {
  return btn?.getAttribute('data-logout') === 'true'
}

function onClickCapture(event) {
  const btn = findButton(event.target)
  if (!btn || isLogoutControl(btn)) return

  const now = Date.now()
  const x = event.clientX || 0
  const y = event.clientY || 0
  const detail = event.detail || 0
  const lockMs = lockMsFor(btn)

  if (
    shouldBlockRepeat({
      now,
      lastTime: lastClick.t,
      lastX: lastClick.x,
      lastY: lastClick.y,
      lastBtn: lastClick.btn,
      x,
      y,
      btn,
      lockMs,
      detail,
    })
  ) {
    block(event)
    return
  }

  lastClick = { t: now, x, y, btn }
}

function onDblClickCapture(event) {
  const btn = findButton(event.target)
  if (!btn || isLogoutControl(btn)) return
  block(event)
}

function onSubmitCapture(event) {
  const form = event.target
  if (!form || form.tagName !== 'FORM') return

  const now = Date.now()
  const last = lastFormSubmit.get(form) || 0
  if (now - last < FORM_LOCK_MS) {
    block(event)
    return
  }
  lastFormSubmit.set(form, now)
}

export function installPreventDoubleClick() {
  if (typeof document === 'undefined') return
  if (installed || window.__pdPreventDoubleClickInstalled) return
  installed = true
  window.__pdPreventDoubleClickInstalled = true

  document.addEventListener('click', onClickCapture, true)
  document.addEventListener('dblclick', onDblClickCapture, true)
  document.addEventListener('submit', onSubmitCapture, true)
}
