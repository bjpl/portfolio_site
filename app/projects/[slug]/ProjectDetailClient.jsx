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

export default function ProjectDetailClient({ project, projects }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState(project);
  const [relatedProjects, setRelatedProjects] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  
  useEffect(() => {
    if (project) {
      setCurrentProject(project);
      
      // Find related projects by tags or category
      const related = projects
        .filter(p => p.slug !== project.slug)
        .filter(p => 
          p.tags?.some(tag => project.tags?.includes(tag)) ||
          p.category === project.category
        )
        .slice(0, 3);
      
      setRelatedProjects(related);
      setLoading(false);
    } else {
      // Project not found - redirect after a brief delay
      setTimeout(() => {
        router.push('/projects');
      }, 3000);
    }
  }, [project, projects, router]);

  const handleImageError = (imageKey) => {
    setImageErrors(prev => ({ ...prev, [imageKey]: true }));
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'in-progress':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      case 'planning':
        return <AlertCircleIcon className="w-5 h-5 text-blue-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'planning':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Container>
    );
  }

  if (!currentProject) {
    return (
      <Container>
        <div className="min-h-screen flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <p className="text-xl text-gray-600 mb-8">
            The project you're looking for doesn't exist or has been moved.
          </p>
          <p className="text-gray-500 mb-8">Redirecting to projects page...</p>
          <Link href="/projects">
            <Button>
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto py-12"
      >
        {/* Back Navigation */}
        <Link 
          href="/projects" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Projects
        </Link>

        {/* Project Header */}
        <div className="mb-12">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {currentProject.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(currentProject.status)}`}>
                  {getStatusIcon(currentProject.status)}
                  <span className="font-medium capitalize">{currentProject.status}</span>
                </div>
                {currentProject.category && (
                  <Badge variant="secondary">
                    {currentProject.category}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              {currentProject.demoUrl && (
                <Button asChild>
                  <a 
                    href={currentProject.demoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    <PlayIcon className="w-4 h-4 mr-2" />
                    Live Demo
                  </a>
                </Button>
              )}
              {currentProject.githubUrl && (
                <Button variant="outline" asChild>
                  <a 
                    href={currentProject.githubUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    <GithubIcon className="w-4 h-4 mr-2" />
                    View Code
                  </a>
                </Button>
              )}
              {currentProject.url && !currentProject.demoUrl && (
                <Button asChild>
                  <a 
                    href={currentProject.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    <ExternalLinkIcon className="w-4 h-4 mr-2" />
                    Visit Project
                  </a>
                </Button>
              )}
            </div>
          </div>

          <p className="text-xl text-gray-600 leading-relaxed">
            {currentProject.description}
          </p>
        </div>

        {/* Project Image */}
        {currentProject.image && !imageErrors.main && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12 rounded-2xl overflow-hidden shadow-2xl"
          >
            <Image
              src={currentProject.image}
              alt={currentProject.title}
              width={1200}
              height={675}
              className="w-full h-auto object-cover"
              onError={() => handleImageError('main')}
              priority
            />
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Long Description */}
            {currentProject.longDescription && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mb-12"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">About This Project</h2>
                <div className="prose prose-lg max-w-none text-gray-700">
                  {currentProject.longDescription.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="mb-6">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Features */}
            {currentProject.features && currentProject.features.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mb-12"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Key Features</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {currentProject.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Technologies */}
            {currentProject.tags && currentProject.tags.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mb-12"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Technologies Used</h2>
                <div className="flex flex-wrap gap-3">
                  {currentProject.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </motion.section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Project Details */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
              <div className="space-y-3 text-sm">
                {currentProject.year && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Year:</span>
                    <span className="font-medium">{currentProject.year}</span>
                  </div>
                )}
                {currentProject.duration && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{currentProject.duration}</span>
                  </div>
                )}
                {currentProject.role && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium">{currentProject.role}</span>
                  </div>
                )}
                {currentProject.client && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium">{currentProject.client}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Links */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Links</h3>
              <div className="space-y-3">
                {currentProject.demoUrl && (
                  <a 
                    href={currentProject.demoUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Live Demo
                  </a>
                )}
                {currentProject.githubUrl && (
                  <a 
                    href={currentProject.githubUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <GithubIcon className="w-4 h-4" />
                    Source Code
                  </a>
                )}
                {currentProject.url && !currentProject.demoUrl && (
                  <a 
                    href={currentProject.url}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <ExternalLinkIcon className="w-4 h-4" />
                    Visit Project
                  </a>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Related Projects */}
        {relatedProjects.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-16"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Related Projects</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProjects.map((project) => (
                <Card key={project.slug} className="group hover:shadow-lg transition-all duration-300">
                  <Link href={`/projects/${project.slug}`}>
                    <div className="p-6">
                      {project.image && !imageErrors[project.slug] && (
                        <div className="aspect-video mb-4 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={project.image}
                            alt={project.title}
                            width={400}
                            height={225}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={() => handleImageError(project.slug)}
                          />
                        </div>
                      )}
                      <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {project.description}
                      </p>
                      {project.tags && (
                        <div className="flex flex-wrap gap-1">
                          {project.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          </motion.section>
        )}
      </motion.div>
    </Container>
  );
}