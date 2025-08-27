'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Container from '../../../components/ui/Container';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { 
  ArrowLeftIcon, 
  ExternalLinkIcon, 
  GithubIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon
} from 'lucide-react';

export default function ProjectClient() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    async function loadProject() {
      try {
        const { projects } = await import('../../../data/projects.json');
        const foundProject = projects.find((p) => p.slug === params.slug);
        
        if (foundProject) {
          setProject(foundProject);
        } else {
          router.push('/projects');
        }
      } catch (error) {
        console.error('Error loading project:', error);
        router.push('/projects');
      } finally {
        setLoading(false);
      }
    }

    if (params.slug) {
      loadProject();
    }
  }, [params.slug, router]);

  if (loading) {
    return (
      <Container className="py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="h-6 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container className="py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <p className="text-gray-600 mb-6">The project you're looking for doesn't exist.</p>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Projects
          </Link>
        </div>
      </Container>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'planned':
        return <AlertCircleIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusText = (status) => {
    return status?.charAt(0).toUpperCase() + status?.slice(1).replace('-', ' ') || 'Completed';
  };

  return (
    <Container className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Back Button */}
        <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Projects
          </Link>
        </div>

        {/* Project Header */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                {project.title}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                {project.description}
              </p>

              {/* Status and Tags */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  {getStatusIcon(project.status)}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {getStatusText(project.status)}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {project.technologies?.map((tech, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <ExternalLinkIcon className="w-4 h-4" />
                    View Live
                  </a>
                )}
                
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition-colors font-medium"
                  >
                    <GithubIcon className="w-4 h-4" />
                    View Code
                  </a>
                )}
                
                {project.demoUrl && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <PlayIcon className="w-4 h-4" />
                    View Demo
                  </a>
                )}
              </div>
            </div>

            {/* Project Image Gallery */}
            <div className="lg:w-1/2">
              {project.gallery && project.gallery.length > 0 ? (
                <div className="space-y-4">
                  
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
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImage === index
                              ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <Image
                            src={image}
                            alt={`${project.title} - Thumbnail ${index + 1}`}
                            width={80}
                            height={80}
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              e.target.src = '/images/placeholder-project.jpg';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
                  <Image
                    src={project.image || '/images/placeholder-project.jpg'}
                    alt={project.title}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      e.target.src = '/images/placeholder-project.jpg';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview */}
            {project.overview && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Overview</h2>
                <div className="prose dark:prose-dark max-w-none">
                  {project.overview.split('\n').map((paragraph, index) => (
                    paragraph.trim() && (
                      <p key={index} className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                        {paragraph}
                      </p>
                    )
                  ))}
                </div>
              </Card>
            )}

            {/* Features */}
            {project.features && project.features.length > 0 && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Key Features</h2>
                <ul className="space-y-3">
                  {project.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Implementation Details */}
            {project.implementation && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Implementation</h2>
                <div className="prose dark:prose-dark max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {project.implementation}
                  </p>
                </div>
              </Card>
            )}

            {/* Challenges & Solutions */}
            {project.challenges && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Challenges & Solutions</h2>
                <div className="prose dark:prose-dark max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {project.challenges}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Info */}
            <Card className="p-6">
              <h3 className="font-bold mb-4">Project Info</h3>
              <div className="space-y-3">
                {project.duration && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</dt>
                    <dd className="text-gray-900 dark:text-white">{project.duration}</dd>
                  </div>
                )}
                
                {project.role && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</dt>
                    <dd className="text-gray-900 dark:text-white">{project.role}</dd>
                  </div>
                )}
                
                {project.team && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Team Size</dt>
                    <dd className="text-gray-900 dark:text-white">{project.team}</dd>
                  </div>
                )}
                
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="flex items-center gap-2">
                    {getStatusIcon(project.status)}
                    <span className="text-gray-900 dark:text-white">
                      {getStatusText(project.status)}
                    </span>
                  </dd>
                </div>
              </div>
            </Card>

            {/* Technologies */}
            {project.technologies && project.technologies.length > 0 && (
              <Card className="p-6">
                <h3 className="font-bold mb-4">Technologies Used</h3>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Links */}
            <Card className="p-6">
              <h3 className="font-bold mb-4">Links</h3>
              <div className="space-y-3">
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    <ExternalLinkIcon className="w-4 h-4" />
                    Live Project
                  </a>
                )}
                
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                  >
                    <GithubIcon className="w-4 h-4" />
                    Source Code
                  </a>
                )}
                
                {project.demoUrl && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Demo Video
                  </a>
                )}
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </Container>
  );
}