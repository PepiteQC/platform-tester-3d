'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoadingScreenProps {
  onComplete?: () => void
  minDuration?: number
}

const HACKER_LINES = [
  '> INITIALIZING ETHERWORLD CORE...',
  '> LOADING BIOMASS PROTOCOLS...',
  '> SYNCING NEURAL INTERFACE...',
  '> ESTABLISHING QUANTUM LINK...',
  '> DECRYPTING AVATAR DATA...',
  '> CALIBRATING ISOMETRIC ENGINE...',
  '> LOADING FURNITURE SPRITES...',
  '> CONNECTING TO ETHER NETWORK...',
  '> INITIALIZING ROOM BUILDER...',
  '> SYSTEM READY. WELCOME TO ETHERWORLD.',
]

export function LoadingScreen({ onComplete, minDuration = 4000 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [currentLines, setCurrentLines] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)

  const handleComplete = useCallback(() => {
    setIsComplete(true)
    setTimeout(() => {
      onComplete?.()
    }, 500)
  }, [onComplete])

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / minDuration) * 100, 100)
      setProgress(newProgress)

      if (newProgress >= 100) {
        clearInterval(interval)
        handleComplete()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [minDuration, handleComplete])

  useEffect(() => {
    const lineInterval = setInterval(() => {
      setCurrentLines(prev => {
        if (prev.length >= HACKER_LINES.length) return prev
        return [...prev, HACKER_LINES[prev.length]]
      })
    }, 400)

    return () => clearInterval(lineInterval)
  }, [])

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#08080E]"
        >
          {/* Animated Grid Background */}
          <div className="absolute inset-0 grid-bg opacity-50" />
          
          {/* Scanlines Effect */}
          <div className="scanlines absolute inset-0" />
          
          {/* Floating Particles */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 w-1"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: i % 3 === 0 ? '#00e0ff' : i % 3 === 1 ? '#00FF9D' : '#FF9A3A',
                  boxShadow: i % 3 === 0 
                    ? '0 0 10px #00e0ff, 0 0 20px #00e0ff' 
                    : i % 3 === 1
                    ? '0 0 10px #00FF9D, 0 0 20px #00FF9D'
                    : '0 0 10px #FF9A3A, 0 0 20px #FF9A3A',
                }}
                animate={{
                  y: [0, -100, 0],
                  x: [0, Math.random() * 50 - 25, 0],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.5, 0.5],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center gap-8 px-4">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="glitch"
            >
              <h1 className="neon-glow font-mono text-4xl font-bold tracking-wider text-cyan-400 md:text-6xl">
                ETHERWORLD
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="neon-glow-green font-mono text-sm text-zinc-400"
            >
              ENTERING THE VIRTUAL REALM
            </motion.p>

            {/* Terminal Window */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="pixel-window w-full max-w-lg p-4 bg-zinc-900 border border-zinc-700 rounded-lg"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="h-3 w-3 bg-red-500 rounded-full" />
                <div className="h-3 w-3 bg-yellow-500 rounded-full" />
                <div className="h-3 w-3 bg-green-500 rounded-full" />
                <span className="ml-2 font-mono text-xs text-zinc-500">terminal.exe</span>
              </div>
              <div className="h-48 overflow-hidden font-mono text-xs text-emerald-400">
                {currentLines.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="py-0.5"
                  >
                    {line}
                  </motion.div>
                ))}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="inline-block h-4 w-2 bg-emerald-400"
                />
              </div>
            </motion.div>

            {/* Progress Bar */}
            <div className="w-full max-w-md">
              <div className="pixel-border mb-2 h-6 w-full overflow-hidden bg-zinc-800 rounded-lg">
                <motion.div
                  className="h-full bg-cyan-500"
                  style={{ 
                    width: `${progress}%`,
                    boxShadow: '0 0 10px #00e0ff, 0 0 20px #00e0ff'
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <div className="flex justify-between font-mono text-xs text-zinc-500">
                <span>LOADING...</span>
                <span className="neon-glow text-cyan-400">{Math.floor(progress)}%</span>
              </div>
            </div>

            {/* Biomass Animation */}
            <div className="mt-4 flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="h-4 w-4 bg-blue-400"
                  style={{
                    boxShadow: '0 0 10px #00FF9D'
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Corner Decorations */}
          <div className="absolute left-4 top-4 h-16 w-16 border-l-4 border-t-4 border-cyan-500 opacity-50" />
          <div className="absolute right-4 top-4 h-16 w-16 border-r-4 border-t-4 border-blue-500 opacity-50" />
          <div className="absolute bottom-4 left-4 h-16 w-16 border-b-4 border-l-4 border-blue-500 opacity-50" />
          <div className="absolute bottom-4 right-4 h-16 w-16 border-b-4 border-r-4 border-cyan-500 opacity-50" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
