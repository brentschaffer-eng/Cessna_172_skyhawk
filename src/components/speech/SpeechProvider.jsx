import { useSpeech } from '../../hooks/useSpeech.js'
import { SpeechContext } from './speechContext.js'

/** One synthesis engine for the whole app; two panels must never talk over each other. */
export function SpeechProvider({ children }) {
  const speech = useSpeech()
  return <SpeechContext.Provider value={speech}>{children}</SpeechContext.Provider>
}
