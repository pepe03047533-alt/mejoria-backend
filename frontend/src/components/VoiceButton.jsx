import { useState } from 'react'

export default function VoiceButton({ onResult }) {
  const [listening, setListening] = useState(false)

  const handleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz. Usá Chrome o Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-AR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    setListening(true)
    recognition.start()

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
      setListening(false)
    }

    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
  }

  return (
    <button
      onClick={handleVoice}
      title="Buscar por voz"
      className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 ${
        listening
          ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50'
          : 'bg-orange-500 hover:bg-orange-400 shadow-lg shadow-orange-500/30'
      }`}
    >
      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm7.91 9.26A8 8 0 0 1 4.09 12.26L4 12a1 1 0 0 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 2 0l-.09.26zM11 20h2v2h-2v-2z"/>
      </svg>
    </button>
  )
}
