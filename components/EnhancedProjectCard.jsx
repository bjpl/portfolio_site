'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Github, Eye, Calendar, Tag, ArrowRight } from 'lucide-react'

export const EnhancedProjectCard = ({ 
  project, 
  index = 0,
  showDetails = true,
  variant = 'default' // 'default', 'minimal', 'featured'
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const {
    title = 'Project Title',
    description = 'Project description goes here...',
    image = '/api/placeholder/400/250',
    demoUrl,
    githubUrl,
    technologies = [],
    category = 'Web Development',
    date,
    featured = false,
    status = 'completed' // 'completed', 'in-progress', 'planning'
  } = project || {}

  const cardVariants = {
    default: 'bg-surface border border-border/20 hover:border-primary/30',
    minimal: 'bg-transparent border-b border-border/10 hover:border-primary/30',
    featured: 'bg-gradient-to-br from-primary/5 via-surface to-accent/5 border-2 border-primary/20 hover:border-primary/40'
  }

  const imageVariants = {
    hidden: { opacity: 0, scale: 1.1 },
    visible: { opacity: 1, scale: 1 },
    hover: { scale: 1.05 }
  }

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  }

  const statusColors = {
    completed: 'bg-semantic-success/20 text-semantic-success border-semantic-success/30',
    'in-progress': 'bg-semantic-warning/20 text-semantic-warning border-semantic-warning/30',
    planning: 'bg-semantic-info/20 text-semantic-info border-semantic-info/30'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ y: -5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`group relative rounded-xl overflow-hidden transition-all duration-300 ${cardVariants[variant]} ${
        featured ? 'ring-1 ring-primary/20' : ''
      }`}
    >
      {/* Featured Badge */}
      {featured && (
        <div className="absolute top-4 left-4 z-10">\n          <span className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full shadow-lg">
            Featured
          </span>
        </div>
      )}

      {/* Status Badge */}
      {status && status !== 'completed' && (
        <div className="absolute top-4 right-4 z-10">
          <span className={`px-2 py-1 border text-xs font-medium rounded-full ${statusColors[status]}`}>
            {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </div>
      )}

      {/* Image Container */}
      <div className="relative aspect-video overflow-hidden bg-surface-alt">
        <motion.div
          variants={imageVariants}
          initial="hidden"
          animate={imageLoaded ? "visible" : "hidden"}
          whileHover="hover"
          transition={{ duration: 0.3 }}
        >
          <Image
            src={image}
            alt={`${title} preview`}
            fill
            className="object-cover"
            onLoad={() => setImageLoaded(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={index < 3}
          />
        </motion.div>

        {/* Loading Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-surface-alt animate-pulse">
            <div className="w-full h-full bg-border/20"></div>
          </div>
        )}

        {/* Hover Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-center justify-center"
            >
              <div className="flex space-x-3">
                {demoUrl && (
                  <motion.a
                    href={demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-white/90 text-gray-900 rounded-full hover:bg-white transition-colors duration-200 focus-ring"
                    aria-label="View live demo"
                  >
                    <Eye className="w-5 h-5" />
                  </motion.a>
                )}
                {githubUrl && (
                  <motion.a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-white/90 text-gray-900 rounded-full hover:bg-white transition-colors duration-200 focus-ring"
                    aria-label="View source code"
                  >
                    <Github className="w-5 h-5" />
                  </motion.a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {showDetails && category && (
              <div className="flex items-center space-x-2 mb-2">
                <Tag className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-text-muted font-medium">{category}</span>
              </div>
            )}
            <h3 className="text-xl font-bold text-text-primary group-hover:text-primary transition-colors duration-200 line-clamp-2">
              {title}
            </h3>
          </div>
        </div>

        {/* Date */}
        {showDetails && date && (
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-muted">{date}</span>
          </div>
        )}

        {/* Description */}
        <p className="text-text-secondary leading-relaxed mb-4 line-clamp-3">
          {description}
        </p>

        {/* Technologies */}
        {technologies.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {technologies.slice(0, 4).map((tech, techIndex) => (
                <span
                  key={techIndex}
                  className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                >
                  {tech}
                </span>
              ))}
              {technologies.length > 4 && (
                <span className="px-3 py-1 bg-border/20 text-text-muted text-xs font-medium rounded-full">
                  +{technologies.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/10">
          <div className="flex space-x-4">
            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary hover:text-primary transition-colors duration-200 flex items-center space-x-1 focus-ring rounded px-2 py-1"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Live Demo</span>
              </a>
            )}
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary hover:text-primary transition-colors duration-200 flex items-center space-x-1 focus-ring rounded px-2 py-1"
              >
                <Github className="w-4 h-4" />
                <span>Code</span>
              </a>
            )}
          </div>

          {/* Learn More Link */}
          <Link
            href={`/projects/${project.slug || title.toLowerCase().replace(/\s+/g, '-')}`}
            className="text-sm font-medium text-primary hover:text-primary-hover transition-colors duration-200 flex items-center space-x-1 focus-ring rounded px-2 py-1"
          >
            <span>Learn More</span>
            <motion.div
              animate={{ x: isHovered ? 4 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

export default EnhancedProjectCard