import { createContext, useContext } from 'react'

export const SpeechContext = createContext(null)

/** Kept out of SpeechProvider.jsx so that file only exports a component and Fast Refresh stays intact. */
export function useSpeechContext() {
  const ctx = useContext(SpeechContext)
  if (!ctx) throw new Error('useSpeechContext must be used inside <SpeechProvider>')
  return ctx
}
