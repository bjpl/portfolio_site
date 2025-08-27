'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Monitor } from 'lucide-react'

export const ThemeToggle = () => {
  const [theme, setTheme] = useState('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') || 'system'
    setTheme(savedTheme)
    applyTheme(savedTheme)
  }, [])

  const applyTheme = (newTheme) => {
    const root = window.document.documentElement
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.remove('light', 'dark')
      root.classList.add(systemTheme)
      root.setAttribute('data-theme', systemTheme)
    } else {
      root.classList.remove('light', 'dark')
      root.classList.add(newTheme)
      root.setAttribute('data-theme', newTheme)
    }
  }

  const toggleTheme = () => {
    const themes = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    applyTheme(nextTheme)
  }

  const getIcon = () => {
    switch (theme) {
      case 'light': return Sun
      case 'dark': return Moon
      case 'system': return Monitor
      default: return Sun
    }
  }

  const getLabel = () => {
    switch (theme) {
      case 'light': return 'Light mode'
      case 'dark': return 'Dark mode'
      case 'system': return 'System preference'
      default: return 'Light mode'
    }
  }

  const getThemeColor = () => {
    switch (theme) {
      case 'light': return '#fbbf24'
      case 'dark': return '#6366f1'
      case 'system': return '#10b981'
      default: return '#fbbf24'
    }
  }

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-lg bg-surface/50 animate-pulse" />
    )
  }

  const Icon = getIcon()

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative p-2 rounded-lg bg-surface/50 text-text-secondary hover:text-text-primary hover:bg-surface/70 transition-all duration-200 focus-ring"
      aria-label={getLabel()}
      title={getLabel()}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          <Icon className="w-5 h-5" />
        </motion.div>
      </AnimatePresence>
      
      {/* Theme indicator dot */}
      <motion.div
        className="absolute -top-1 -right-1 w-3 h-3 rounded-full shadow-lg"
        style={{ backgroundColor: getThemeColor() }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  )
}