import Cookies from 'js-cookie'
import UniversalCookies from 'universal-cookie'

export const LOGGED_OUT_KEY = 'authLoggedOut'

export function isLoggedOut() {
  try {
    return localStorage.getItem(LOGGED_OUT_KEY) != null
  } catch {
    return false
  }
}

export function markLoggedOut() {
  try {
    localStorage.setItem(LOGGED_OUT_KEY, String(Date.now()))
  } catch {
    // Storage can be blocked. Cookie clear and the redirect still run.
  }
}

export function clearLoggedOut() {
  try {
    localStorage.removeItem(LOGGED_OUT_KEY)
  } catch {
    // ignore
  }
}

function cookiePaths() {
  const paths = new Set(['/'])
  if (typeof window === 'undefined') return paths
  const parts = window.location.pathname.split('/').filter(Boolean)
  let acc = ''
  parts.forEach((part) => {
    acc += `/${part}`
    paths.add(acc)
    paths.add(`${acc}/`)
  })
  return paths
}

function cookieDomains() {
  const domains = [undefined]
  if (typeof window === 'undefined') return domains
  const host = window.location.hostname
  if (!host) return domains
  domains.push(host)
  if (host.includes('.')) domains.push(`.${host}`)
  return domains
}

// Login saves the token with universal-cookie and no path, so the browser
// binds it to the URL that was open. js-cookie remove only deletes path "/".
// Expire every path and domain we can still name, or that leftover cookie
// signs the user back in.
export function clearTokenCookies() {
  const paths = cookiePaths()
  const domains = cookieDomains()
  const universal = typeof document !== 'undefined' ? new UniversalCookies() : null
  const expires = 'Thu, 01 Jan 1970 00:00:00 GMT'

  paths.forEach((path) => {
    domains.forEach((domain) => {
      const options = domain ? { path, domain } : { path }
      try { Cookies.remove('token', options) } catch { /* ignore */ }
      try { universal?.remove('token', options) } catch { /* ignore */ }
      if (typeof document !== 'undefined') {
        const domainPart = domain ? `; domain=${domain}` : ''
        document.cookie = `token=; expires=${expires}; max-age=0; path=${path}${domainPart}`
      }
    })
  })
}

export function endSession() {
  markLoggedOut()
  clearTokenCookies()
}
