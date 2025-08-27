'use client'

import React from 'react'
import { motion } from 'framer-motion'

export const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary',
  variant = 'spinner',
  className = '',
  text,
  fullScreen = false
}) => {
  const sizes = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6', 
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const colors = {
    primary: 'text-primary',
    secondary: 'text-text-secondary',
    accent: 'text-accent',
    white: 'text-white'
  }

  const spinnerVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  }

  const pulseVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [1, 0.5, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  }

  const dotsVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2,
        repeat: Infinity
      }
    }
  }

  const dotVariants = {
    animate: {
      y: [-4, 4, -4],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  }

  const waveVariants = {
    animate: {
      transition: {
        staggerChildren: 0.1,
        repeat: Infinity
      }
    }
  }

  const waveBarVariants = {
    animate: {
      scaleY: [1, 0.3, 1],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  }

  const renderSpinner = () => {
    switch (variant) {
      case 'spinner':
        return (
          <motion.div
            variants={spinnerVariants}
            animate="animate"
            className={`${sizes[size]} ${colors[color]} border-2 border-current border-t-transparent rounded-full ${className}`}
          />
        )

      case 'pulse':
        return (
          <motion.div
            variants={pulseVariants}
            animate="animate"
            className={`${sizes[size]} ${colors[color]} rounded-full border-2 border-current ${className}`}
          />
        )

      case 'dots':
        return (
          <motion.div
            variants={dotsVariants}
            animate="animate"
            className={`flex space-x-1 ${className}`}
          >
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                variants={dotVariants}
                className={`w-2 h-2 ${colors[color]} bg-current rounded-full`}
              />
            ))}
          </motion.div>
        )

      case 'wave':
        return (
          <motion.div
            variants={waveVariants}
            animate="animate"
            className={`flex space-x-1 ${className}`}
          >
            {[1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                variants={waveBarVariants}
                className={`w-1 h-4 ${colors[color]} bg-current rounded-full`}
              />
            ))}
          </motion.div>
        )

      case 'orbit':
        return (
          <div className={`relative ${sizes[size]} ${className}`}>
            <motion.div
              variants={spinnerVariants}
              animate="animate"
              className={`absolute inset-0 border-2 border-transparent border-t-current rounded-full ${colors[color]}`}
            />
            <motion.div
              variants={spinnerVariants}
              animate="animate"
              style={{ animationDirection: 'reverse' }}
              className={`absolute inset-1 border-2 border-transparent border-b-current rounded-full ${colors[color]} opacity-60`}
            />
          </div>
        )

      default:
        return (
          <motion.div
            variants={spinnerVariants}
            animate="animate"
            className={`${sizes[size]} ${colors[color]} border-2 border-current border-t-transparent rounded-full ${className}`}
          />
        )
    }
  }

  const content = (
    <div className="flex flex-col items-center space-y-3">
      {renderSpinner()}
      {text && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`text-sm font-medium ${colors[color]}`}
        >
          {text}
        </motion.p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-50 flex items-center justify-center"
      >
        {content}
      </motion.div>
    )
  }

  return content
}

// Specialized loading components
export const PageLoader = ({ text = "Loading..." }) => (
  <LoadingSpinner 
    size="lg" 
    variant="orbit" 
    text={text} 
    fullScreen 
    className="drop-shadow-lg"
  />
)

export const ButtonLoader = ({ size = "sm", color = "white" }) => (
  <LoadingSpinner 
    size={size} 
    color={color} 
    variant="spinner"
    className="inline-block"
  />
)

export const CardLoader = ({ text }) => (
  <div className="flex items-center justify-center py-12">
    <LoadingSpinner 
      size="md" 
      variant="pulse" 
      text={text}
    />
  </div>
)

export const InlineLoader = ({ size = "xs", variant = "dots" }) => (
  <LoadingSpinner 
    size={size} 
    variant={variant}
    className="inline-flex items-center"
  />
)

export default LoadingSpinner