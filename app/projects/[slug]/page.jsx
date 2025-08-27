'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import Container from '../../../components/ui/Container';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { 
  ArrowLeftIcon, 
  ExternalLinkIcon, 
  GithubIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon
} from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch('/data/projects.json');
        const data = await response.json();
        const foundProject = data.projects.find(p => p.slug === params.slug);
        
        if (!foundProject) {
          router.push('/projects');
          return;
        }
        
        setProject(foundProject);
      } catch (error) {
        console.error('Error loading project:', error);
        router.push('/projects');
      } finally {
        setLoading(false);
      }
    };

    if (params.slug) {
      fetchProject();
    }
  }, [params.slug, router]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'In Progress':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircleIcon className="w-4 h-4 text-gray-500" />;
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

  if (loading) {
    return (
      <div className="min-h-screen pt-20">
        <Container>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </Container>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <Container>
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link href="/projects">
            <Button variant="ghost" className="group">
              <ArrowLeftIcon className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Projects
            </Button>
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge className={`px-3 py-1 ${getStatusColor(project.status)}`}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(project.status)}
                    {project.status}
                  </span>
                </Badge>
                {project.featured && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Featured
                  </Badge>
                )}
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {project.title}
              </h1>
              
              <p className="text-xl text-muted-foreground mb-6">
                {project.description}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                {project.demo && (
                  <Button asChild className="group">
                    <a href={project.demo} target="_blank" rel="noopener noreferrer">
                      <PlayIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Live Demo
                      <ExternalLinkIcon className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                )}
                
                {project.github && (
                  <Button variant="outline" asChild className="group">
                    <a href={project.github} target="_blank" rel="noopener noreferrer">
                      <GithubIcon className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                      View Code
                      <ExternalLinkIcon className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                )}
                
                {project.link && project.link !== project.demo && (
                  <Button variant="outline" asChild>
                    <a href={project.link} target="_blank" rel="noopener noreferrer">
                      Visit Site
                      <ExternalLinkIcon className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Project Gallery */}
            {project.gallery && project.gallery.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Project Gallery</h2>
                  
                  {/* Main Image */}
                  <div className="aspect-video relative mb-4 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <Image
                      src={project.gallery[selectedImage] || '/images/placeholder-project.jpg'}
                      alt={`${project.title} - Image ${selectedImage + 1}`}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.target.src = '/images/placeholder-project.jpg';
                      }}
                    />
                  </div>

                  {/* Thumbnail Navigation */}
                  {project.gallery.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {project.gallery.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`flex-shrink-0 w-20 h-20 relative rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImage === index
                              ? 'border-primary'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <Image
                            src={image}
                            alt={`${project.title} - Thumbnail ${index + 1}`}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              e.target.src = '/images/placeholder-project.jpg';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Long Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">About This Project</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {project.longDescription || project.description}
                </p>
              </Card>
            </motion.div>

            {/* Features */}
            {project.features && project.features.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Key Features</h2>
                  <ul className="space-y-3">
                    {project.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircleIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            )}

            {/* Challenges */}
            {project.challenges && project.challenges.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Challenges & Solutions</h2>
                  <ul className="space-y-3">
                    {project.challenges.map((challenge, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <AlertCircleIcon className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{challenge}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Project Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Type</span>
                    <p className="text-foreground">{project.type}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(project.status)}
                      <span className="text-foreground">{project.status}</span>
                    </div>
                  </div>

                  {project.technologies && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Technologies</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {project.technologies.map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Quick Links */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                <div className="space-y-3">
                  {project.demo && (
                    <a
                      href={project.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <PlayIcon className="w-4 h-4" />
                      Live Demo
                      <ExternalLinkIcon className="w-3 h-3 ml-auto" />
                    </a>
                  )}
                  
                  {project.github && (
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <GithubIcon className="w-4 h-4" />
                      Source Code
                      <ExternalLinkIcon className="w-3 h-3 ml-auto" />
                    </a>
                  )}
                  
                  {project.link && project.link !== project.demo && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLinkIcon className="w-4 h-4" />
                      Project Site
                      <ExternalLinkIcon className="w-3 h-3 ml-auto" />
                    </a>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Navigation to Other Projects */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Explore More</h3>
                <div className="space-y-3">
                  <Link href="/projects" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                    All Projects
                    <ArrowLeftIcon className="w-4 h-4 ml-auto rotate-180" />
                  </Link>
                  <Link href="/" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                    Back to Home
                    <ArrowLeftIcon className="w-4 h-4 ml-auto rotate-180" />
                  </Link>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </Container>
    </div>
  );
}