'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { 
  ExternalLinkIcon, 
  GithubIcon, 
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  StarIcon,
  Eye,
  Calendar,
  Tag,
  ArrowRight,
  Github,
  ExternalLink
} from 'lucide-react';

export function ProjectCard({ 
  project, 
  featured = false, 
  variant = "default", // "default", "enhanced", "minimal", "featured"
  index = 0,
  showDetails = true,
  className = ""
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Normalize project data structure
  const {
    title = 'Project Title',
    description = 'Project description goes here...',
    image = '/api/placeholder/400/250',
    demo: demoUrl,
    github: githubUrl,
    technologies = [],
    category = 'Web Development',
    date,
    featured: isFeatured = featured,
    status = 'completed', // 'completed', 'in-progress', 'planning'
    slug,
    type
  } = project || {};

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-3 h-3 text-green-500" />;
      case 'in-progress':
      case 'In Progress':
        return <ClockIcon className="w-3 h-3 text-yellow-500" />;
      default:
        return <AlertCircleIcon className="w-3 h-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in-progress':
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'planning':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const statusColors = {
    completed: 'bg-semantic-success/20 text-semantic-success border-semantic-success/30',
    'in-progress': 'bg-semantic-warning/20 text-semantic-warning border-semantic-warning/30',
    planning: 'bg-semantic-info/20 text-semantic-info border-semantic-info/30'
  };

  const cardVariants = {
    default: 'bg-surface border border-border/20 hover:border-primary/30',
    minimal: 'bg-transparent border-b border-border/10 hover:border-primary/30',
    featured: 'bg-gradient-to-br from-primary/5 via-surface to-accent/5 border-2 border-primary/20 hover:border-primary/40',
    enhanced: 'bg-surface border border-border/20 hover:border-primary/30'
  };

  const cardVariantsAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    },
    hover: {
      y: variant === "enhanced" ? -5 : -8,
      transition: { 
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  const imageVariants = {
    hidden: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: { duration: 0.3 }
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  // Enhanced variant
  if (variant === "enhanced") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.6 }}
        whileHover={{ y: -5 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={`group relative rounded-xl overflow-hidden transition-all duration-300 ${cardVariants[variant]} ${
          isFeatured ? 'ring-1 ring-primary/20' : ''
        } ${className}`}
      >
        {/* Featured Badge */}
        {isFeatured && (
          <div className="absolute top-4 left-4 z-10">
            <span className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full shadow-lg">
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
              src={imageError ? '/images/placeholder-project.jpg' : (image || '/images/placeholder-project.jpg')}
              alt={`${title} preview`}
              fill
              className="object-cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(true);
              }}
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
                      className="p-3 bg-white/90 text-gray-900 rounded-full hover:bg-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="p-3 bg-white/90 text-gray-900 rounded-full hover:bg-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
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
                  className="text-sm text-text-secondary hover:text-primary transition-colors duration-200 flex items-center space-x-1 focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1"
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
                  className="text-sm text-text-secondary hover:text-primary transition-colors duration-200 flex items-center space-x-1 focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1"
                >
                  <Github className="w-4 h-4" />
                  <span>Code</span>
                </a>
              )}
            </div>

            {/* Learn More Link */}
            <Link
              href={`/projects/${slug || title.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-sm font-medium text-primary hover:text-primary-hover transition-colors duration-200 flex items-center space-x-1 focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1"
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
    );
  }

  // Default variant with all features
  return (
    <motion.div
      variants={cardVariantsAnimation}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={`h-full ${isFeatured ? 'lg:col-span-2' : ''} ${className}`}
    >
      <Card className="h-full overflow-hidden group cursor-pointer border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
        <div className="relative">
          {/* Project Image */}
          <div className={`relative overflow-hidden ${isFeatured ? 'h-80' : 'h-48'} bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900`}>
            <motion.div variants={imageVariants} className="w-full h-full">
              <Image
                src={imageError ? '/images/placeholder-project.jpg' : (image || '/images/placeholder-project.jpg')}
                alt={title}
                fill
                className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(true);
                }}
              />
            </motion.div>

            {/* Loading Placeholder */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {/* Overlay */}
            <motion.div 
              variants={overlayVariants}
              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              <div className="flex gap-2">
                {demoUrl && (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    asChild
                  >
                    <a 
                      href={demoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Demo
                    </a>
                  </Button>
                )}
                
                {githubUrl && (
                  <Button
                    size="sm"
                    variant="secondary"
                    asChild
                  >
                    <a 
                      href={githubUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GithubIcon className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Status and Featured Badges */}
            <div className="absolute top-3 left-3 flex gap-2">
              {isFeatured && (
                <Badge className="bg-primary text-primary-foreground">
                  <StarIcon className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
              
              <Badge className={`px-2 py-1 ${getStatusColor(status)}`}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(status)}
                  {status}
                </span>
              </Badge>
            </div>

            {/* Type Badge */}
            {type && (
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                  {type}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                {title}
              </h3>
              <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
                {description}
              </p>
            </div>

            {/* Technologies */}
            {technologies && technologies.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {technologies.slice(0, isFeatured ? 6 : 4).map((tech) => (
                    <Badge 
                      key={tech} 
                      variant="secondary" 
                      className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {tech}
                    </Badge>
                  ))}
                  {technologies.length > (isFeatured ? 6 : 4) && (
                    <Badge variant="outline" className="text-xs">
                      +{technologies.length - (isFeatured ? 6 : 4)}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Link href={`/projects/${slug || title.toLowerCase().replace(/\s+/g, '-')}`}>
                <Button variant="ghost" size="sm" className="group/btn">
                  View Details
                  <ExternalLinkIcon className="w-3 h-3 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <div className="flex gap-2">
                {demoUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="opacity-0 group-hover:opacity-100 transition-all duration-300"
                  >
                    <a 
                      href={demoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PlayIcon className="w-3 h-3" />
                    </a>
                  </Button>
                )}
                
                {githubUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="opacity-0 group-hover:opacity-100 transition-all duration-300"
                  >
                    <a 
                      href={githubUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GithubIcon className="w-3 h-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Click handler for card */}
        <Link 
          href={`/projects/${slug || title.toLowerCase().replace(/\s+/g, '-')}`}
          className="absolute inset-0 z-10"
          aria-label={`View ${title} details`}
        />
      </Card>
    </motion.div>
  );
}

export default ProjectCard;