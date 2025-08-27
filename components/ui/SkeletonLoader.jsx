'use client'

import React from 'react'
import { motion } from 'framer-motion'

const shimmerVariants = {
  animate: {
    x: ['0%', '100%'],
    transition: {
      duration: 1.5,
      ease: 'easeInOut',
      repeat: Infinity
    }
  }
}

export const SkeletonLoader = ({ 
  className = '',
  variant = 'default',
  animated = true,
  children 
}) => {
  const baseClasses = 'bg-border/20 rounded-lg relative overflow-hidden'
  const variants = {
    default: 'h-4 w-full',
    text: 'h-4 w-3/4',
    title: 'h-6 w-1/2',
    button: 'h-10 w-24',
    avatar: 'h-12 w-12 rounded-full',
    card: 'h-48 w-full',
    image: 'aspect-video w-full'
  }

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`}>
      {animated && (
        <motion.div
          variants={shimmerVariants}
          animate="animate"
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
        />
      )}
      {children}
    </div>
  )
}

export const ProjectCardSkeleton = () => (
  <div className="bg-surface border border-border/20 rounded-xl overflow-hidden">
    <SkeletonLoader variant="image" className="rounded-none" />
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" className="w-16" />
          <SkeletonLoader variant="title" />
        </div>
      </div>
      <SkeletonLoader variant="text" className="w-12" />
      <div className="space-y-2">
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" className="w-4/5" />
        <SkeletonLoader variant="text" className="w-3/5" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map(i => (
          <SkeletonLoader key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
      <div className="flex items-center justify-between pt-4">
        <div className="flex space-x-4">
          <SkeletonLoader variant="button" className="w-20 h-8" />
          <SkeletonLoader variant="button" className="w-16 h-8" />
        </div>
        <SkeletonLoader variant="button" className="w-24 h-8" />
      </div>
    </div>
  </div>
)

export const BlogCardSkeleton = () => (
  <div className="bg-surface border border-border/20 rounded-xl overflow-hidden">
    <SkeletonLoader variant="image" className="rounded-none" />
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <SkeletonLoader variant="text" className="w-20" />
        <SkeletonLoader variant="title" />
      </div>
      <SkeletonLoader variant="text" className="w-16" />
      <div className="space-y-2">
        <SkeletonLoader variant="text" />
        <SkeletonLoader variant="text" className="w-5/6" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SkeletonLoader variant="avatar" />
          <div className="space-y-1">
            <SkeletonLoader className="h-3 w-16" />
            <SkeletonLoader className="h-3 w-20" />
          </div>
        </div>
        <SkeletonLoader className="h-8 w-16 rounded-full" />
      </div>
    </div>
  </div>
)

export const NavigationSkeleton = () => (
  <div className="fixed top-0 left-0 right-0 z-50 bg-bg/90 backdrop-blur-lg border-b border-border/20">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <nav className="flex items-center justify-between h-16 lg:h-20">
        <SkeletonLoader className="h-8 w-32" />
        <div className="hidden md:flex items-center space-x-4">
          {[1, 2, 3, 4, 5].map(i => (
            <SkeletonLoader key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
        <div className="flex items-center space-x-2">
          <SkeletonLoader className="h-10 w-10 rounded-lg" />
          <SkeletonLoader className="h-10 w-10 rounded-lg md:hidden" />
        </div>
      </nav>
    </div>
  </div>
)

export const HeroSkeleton = () => (
  <section className="min-h-screen flex items-center justify-center relative">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <div className="max-w-4xl mx-auto space-y-8">
        <SkeletonLoader variant="text" className="w-32 mx-auto" />
        <SkeletonLoader className="h-12 sm:h-16 lg:h-20 w-3/4 mx-auto" />
        <SkeletonLoader className="h-8 sm:h-12 lg:h-16 w-2/3 mx-auto" />
        <div className="space-y-3">
          <SkeletonLoader variant="text" className="mx-auto" />
          <SkeletonLoader variant="text" className="w-4/5 mx-auto" />
          <SkeletonLoader variant="text" className="w-3/5 mx-auto" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <SkeletonLoader className="h-12 w-40 rounded-lg" />
          <SkeletonLoader className="h-12 w-36 rounded-lg" />
        </div>
        <div className="flex justify-center space-x-6">
          {[1, 2, 3].map(i => (
            <SkeletonLoader key={i} className="h-12 w-12 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  </section>
)

export const FooterSkeleton = () => (
  <footer className="bg-surface border-t border-border/20">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonLoader className="h-8 w-32" />
          <div className="space-y-2">
            <SkeletonLoader variant="text" />
            <SkeletonLoader variant="text" className="w-4/5" />
            <SkeletonLoader variant="text" className="w-3/5" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <SkeletonLoader key={i} variant="text" className="w-48" />
            ))}
          </div>
        </div>
        {[1, 2].map(col => (
          <div key={col} className="space-y-4">
            <SkeletonLoader className="h-6 w-24" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <SkeletonLoader key={i} variant="text" className="w-20" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </footer>
)

export default SkeletonLoader