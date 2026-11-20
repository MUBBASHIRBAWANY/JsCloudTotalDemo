// Global double-click prevention for the whole application.
// When the same interactive element (button / link / submit) is clicked
// twice within a short window, the second click is suppressed so that
// duplicate API calls, duplicate form submissions and duplicate
// navigations cannot happen anywhere in the app.
//
// Registered once from main.jsx.

const DOUBLE_CLICK_DELAY_MS = 600

const lastClickAt = new WeakMap()

const handleClick = (event) => {
  // Only guard real interactive elements; leave react-select options,
  // table cells, text selection etc. untouched.
  if (!(event.target instanceof Element)) return
  const el = event.target.closest(
    'button, a[href], input[type="submit"], input[type="button"], [role="button"]'
  )
  if (!el) return

  const now = Date.now()
  const previous = lastClickAt.get(el)

  if (previous && now - previous < DOUBLE_CLICK_DELAY_MS) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  lastClickAt.set(el, now)
}

const initPreventDoubleClick = () => {
  document.addEventListener('click', handleClick, true)
}

export default initPreventDoubleClick
