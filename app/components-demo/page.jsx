'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Navigation,
  HeroSection,
  ProjectCard,
  Footer,
  ThemeToggle,
  LoadingSpinner,
  SkeletonLoader,
  ProjectCardSkeleton,
  PageLoader,
  ButtonLoader
} from '../../components'

// Sample project data
const sampleProjects = [
  {
    title: 'E-Commerce Platform',
    description: 'A full-stack e-commerce solution built with Next.js, Stripe, and PostgreSQL. Features include user authentication, product management, shopping cart, and payment processing.',
    image: '/api/placeholder/400/250',
    demoUrl: 'https://example.com/demo',
    githubUrl: 'https://github.com/username/project',
    technologies: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'PostgreSQL', 'Stripe'],
    category: 'Full Stack',
    date: 'March 2024',
    featured: true,
    status: 'completed'
  },
  {
    title: 'Task Management App',
    description: 'A collaborative task management application with real-time updates, drag-and-drop functionality, and team collaboration features.',
    image: '/api/placeholder/400/250',
    demoUrl: 'https://example.com/demo2',
    githubUrl: 'https://github.com/username/project2',
    technologies: ['React', 'Node.js', 'Socket.io', 'MongoDB'],
    category: 'Web App',
    date: 'February 2024',
    status: 'in-progress'
  },
  {
    title: 'Portfolio Website',
    description: 'A responsive portfolio website showcasing projects and skills with modern animations and dark mode support.',
    image: '/api/placeholder/400/250',
    technologies: ['Next.js', 'Framer Motion', 'Tailwind CSS'],
    category: 'Frontend',
    date: 'January 2024',
    status: 'completed'
  }
]

export default function ComponentsDemo() {
  const [loading, setLoading] = useState(false)
  const [showSkeletons, setShowSkeletons] = useState(false)

  const handleLoadingDemo = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 3000)
  }

  const toggleSkeletons = () => {
    setShowSkeletons(!showSkeletons)
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Page Loader Demo */}
      {loading && <PageLoader text="Loading components demo..." />}
      
      {/* Navigation Demo */}
      <Navigation />
      
      <div className="pt-20">
        {/* Demo Header */}
        <section className="py-16 bg-gradient-to-br from-primary/5 via-bg to-accent/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl lg:text-6xl font-bold text-text-primary mb-6"
            >
              <span className="text-gradient">UI Components</span> Demo
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-text-secondary max-w-2xl mx-auto mb-8"
            >
              Interactive showcase of all core UI components with animations, 
              dark mode support, and responsive design.
            </motion.p>
            
            {/* Demo Controls */}
            <div className="flex flex-wrap gap-4 justify-center">
              <motion.button
                onClick={handleLoadingDemo}
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors duration-200 focus-ring disabled:opacity-50"
              >
                {loading && <ButtonLoader size="xs" color="white" />}
                <span>Test Loading States</span>
              </motion.button>
              
              <motion.button
                onClick={toggleSkeletons}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-white transition-all duration-200 focus-ring"
              >
                {showSkeletons ? 'Hide' : 'Show'} Skeletons
              </motion.button>
            </div>
          </div>
        </section>

        {/* Hero Section Demo */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-12">
            <h2 className="text-3xl font-bold text-text-primary mb-4">Hero Section</h2>
            <p className="text-text-secondary mb-8">
              Interactive hero section with typewriter effect, floating animations, and social links.
            </p>
          </div>
          <HeroSection />
        </section>

        {/* Loading Components Demo */}
        <section className="py-16 bg-surface">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-text-primary mb-8">Loading Components</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {/* Spinner Variants */}
              <div className="bg-bg p-6 rounded-xl border border-border/20">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Spinner Variants</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <LoadingSpinner variant="spinner" size="sm" />
                    <span className="text-text-secondary">Spinner</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <LoadingSpinner variant="pulse" size="sm" />
                    <span className="text-text-secondary">Pulse</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <LoadingSpinner variant="dots" size="sm" />
                    <span className="text-text-secondary">Dots</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <LoadingSpinner variant="wave" size="sm" />
                    <span className="text-text-secondary">Wave</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <LoadingSpinner variant="orbit" size="sm" />
                    <span className="text-text-secondary">Orbit</span>
                  </div>
                </div>
              </div>

              {/* Size Variants */}
              <div className="bg-bg p-6 rounded-xl border border-border/20">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Size Variants</h3>
                <div className="flex items-center space-x-6">
                  <LoadingSpinner size="xs" />
                  <LoadingSpinner size="sm" />
                  <LoadingSpinner size="md" />
                  <LoadingSpinner size="lg" />
                </div>
              </div>

              {/* Color Variants */}
              <div className="bg-bg p-6 rounded-xl border border-border/20">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Color Variants</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <LoadingSpinner color="primary" size="sm" />
                    <span className="text-text-secondary">Primary</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <LoadingSpinner color="secondary" size="sm" />
                    <span className="text-text-secondary">Secondary</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <LoadingSpinner color="accent" size="sm" />
                    <span className="text-text-secondary">Accent</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skeleton Loaders */}
            <h3 className="text-2xl font-bold text-text-primary mb-6">Skeleton Loaders</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-text-primary">Basic Skeletons</h4>
                <SkeletonLoader variant="title" />
                <SkeletonLoader variant="text" />
                <SkeletonLoader variant="text" className="w-4/5" />
                <SkeletonLoader variant="text" className="w-3/5" />
                <div className="flex space-x-4">
                  <SkeletonLoader variant="avatar" />
                  <div className="flex-1 space-y-2">
                    <SkeletonLoader className="h-3 w-1/4" />
                    <SkeletonLoader className="h-3 w-1/3" />
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-text-primary mb-4">Project Card Skeleton</h4>
                <ProjectCardSkeleton />
              </div>
            </div>
          </div>
        </section>

        {/* Project Cards Demo */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-text-primary mb-4">Project Cards</h2>
                <p className="text-text-secondary">
                  Hover over cards to see interactive effects and animations.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {showSkeletons ? (
                // Show skeletons
                Array.from({ length: 3 }, (_, i) => (
                  <ProjectCardSkeleton key={`skeleton-${i}`} />
                ))
              ) : (
                // Show actual cards
                sampleProjects.map((project, index) => (
                  <ProjectCard
                    key={project.title}
                    project={project}
                    index={index}
                    variant={index === 0 ? 'featured' : 'default'}
                  />
                ))
              )}
            </div>

            {/* Card Variants Demo */}
            <div className="mt-16">
              <h3 className="text-2xl font-bold text-text-primary mb-6">Card Variants</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <ProjectCard
                  project={sampleProjects[0]}
                  variant="default"
                  showDetails={true}
                />
                <ProjectCard
                  project={sampleProjects[0]}
                  variant="minimal"
                  showDetails={false}
                />
                <ProjectCard
                  project={sampleProjects[0]}
                  variant="featured"
                  showDetails={true}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Theme Toggle Demo */}
        <section className="py-16 bg-surface">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-text-primary mb-8">Theme Toggle</h2>
            <p className="text-text-secondary mb-8">
              Click to cycle through light, dark, and system themes with smooth transitions.
            </p>
            <div className="flex justify-center">
              <div className="p-4 bg-bg border border-border/20 rounded-xl">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </section>

        {/* Responsive Design Demo */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-text-primary mb-8">Responsive Design</h2>
            <p className="text-text-secondary mb-8">
              All components are fully responsive and optimized for mobile, tablet, and desktop devices.
            </p>
            
            <div className="bg-surface border border-border/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Breakpoints</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-bg rounded-lg border border-border/20">
                  <div className="w-4 h-4 bg-primary rounded-full mb-2"></div>
                  <h4 className="font-medium text-text-primary">Mobile</h4>
                  <p className="text-sm text-text-secondary">< 640px</p>
                </div>
                <div className="p-4 bg-bg rounded-lg border border-border/20">
                  <div className="w-4 h-4 bg-accent rounded-full mb-2"></div>
                  <h4 className="font-medium text-text-primary">Tablet</h4>
                  <p className="text-sm text-text-secondary">640px - 1024px</p>
                </div>
                <div className="p-4 bg-bg rounded-lg border border-border/20">
                  <div className="w-4 h-4 bg-semantic-success rounded-full mb-2"></div>
                  <h4 className="font-medium text-text-primary">Desktop</h4>
                  <p className="text-sm text-text-secondary">1024px - 1536px</p>
                </div>
                <div className="p-4 bg-bg rounded-lg border border-border/20">
                  <div className="w-4 h-4 bg-semantic-warning rounded-full mb-2"></div>
                  <h4 className="font-medium text-text-primary">Large</h4>
                  <p className="text-sm text-text-secondary">1536px+</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Demo */}
      <Footer />
    </div>
  )
}