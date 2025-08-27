'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  ExternalLinkIcon, 
  GithubIcon, 
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  StarIcon
} from 'lucide-react';

export default function ProjectCard({ project, featured = false }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircleIcon className="w-3 h-3 text-green-500" />;
      case 'In Progress':
        return <ClockIcon className="w-3 h-3 text-yellow-500" />;
      default:
        return <AlertCircleIcon className="w-3 h-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    },
    hover: {
      y: -8,
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
    hover: { 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      className={`h-full ${featured ? 'lg:col-span-2' : ''}`}
    >
      <Card className="h-full overflow-hidden group cursor-pointer border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
        <div className="relative">
          {/* Project Image */}
          <div className={`relative overflow-hidden ${featured ? 'h-80' : 'h-48'} bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900`}>
            <motion.div variants={imageVariants} className="w-full h-full">
              <Image
                src={imageError ? '/images/placeholder-project.jpg' : (project.image || '/images/placeholder-project.jpg')}
                alt={project.title}
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
              className="absolute inset-0 bg-black/60 flex items-center justify-center"
            >
              <div className="flex gap-2">
                {project.demo && (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    asChild
                  >
                    <a 
                      href={project.demo} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Demo
                    </a>
                  </Button>
                )}
                
                {project.github && (
                  <Button
                    size="sm"
                    variant="secondary"
                    asChild
                  >
                    <a 
                      href={project.github} 
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
              {project.featured && (
                <Badge className="bg-primary text-primary-foreground">
                  <StarIcon className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
              
              <Badge className={`px-2 py-1 ${getStatusColor(project.status)}`}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(project.status)}
                  {project.status}
                </span>
              </Badge>
            </div>

            {/* Type Badge */}
            {project.type && (
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                  {project.type}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                {project.title}
              </h3>
              <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
                {project.description}
              </p>
            </div>

            {/* Technologies */}
            {project.technologies && project.technologies.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {project.technologies.slice(0, featured ? 6 : 4).map((tech) => (
                    <Badge 
                      key={tech} 
                      variant="secondary" 
                      className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {tech}
                    </Badge>
                  ))}
                  {project.technologies.length > (featured ? 6 : 4) && (
                    <Badge variant="outline" className="text-xs">
                      +{project.technologies.length - (featured ? 6 : 4)}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Link href={`/projects/${project.slug}`}>
                <Button variant="ghost" size="sm" className="group/btn">
                  View Details
                  <ExternalLinkIcon className="w-3 h-3 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <div className="flex gap-2">
                {project.demo && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="opacity-0 group-hover:opacity-100 transition-all duration-300"
                  >
                    <a 
                      href={project.demo} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PlayIcon className="w-3 h-3" />
                    </a>
                  </Button>
                )}
                
                {project.github && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="opacity-0 group-hover:opacity-100 transition-all duration-300"
                  >
                    <a 
                      href={project.github} 
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
          href={`/projects/${project.slug}`}
          className="absolute inset-0 z-10"
          aria-label={`View ${project.title} details`}
        />
      </Card>
    </motion.div>
  );
}