import { useCallback, useEffect, useState } from 'react'

const TABS = ['aircraft', 'avionics']

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [tab, id] = raw.split('/')
  return {
    tab: TABS.includes(tab) ? tab : TABS[0],
    id: id ? decodeURIComponent(id) : null,
  }
}

/**
 * Two-way sync between the URL hash and the active tab/selection, so
 * `#/avionics/FLC` is a shareable deep link and Back navigates between views.
 *
 * @param {Record<string, string[]>} validIds - allowed selection ids per tab
 */
export function useHashRoute(validIds) {
  const [route, setRoute] = useState(() => parseHash())

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((tab, id) => {
    const next = id ? `#/${tab}/${encodeURIComponent(id)}` : `#/${tab}`
    if (window.location.hash === next) return
    window.location.hash = next
  }, [])

  // Normalise unknown ids rather than rendering an empty panel.
  const allowed = validIds[route.tab] ?? []
  const id = route.id && allowed.includes(route.id) ? route.id : null

  return { tab: route.tab, id, navigate }
}
