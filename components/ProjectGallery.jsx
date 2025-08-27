'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ProjectCard from './ProjectCard';
import Container from './ui/Container';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ArrowRightIcon, FilterIcon } from 'lucide-react';

export default function ProjectGallery({ 
  showFeatured = true, 
  showAll = false, 
  limit = 6,
  title = "Featured Projects",
  subtitle = "A selection of my recent work and personal projects"
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [displayedProjects, setDisplayedProjects] = useState([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/data/projects.json');
        const data = await response.json();
        let fetchedProjects = data.projects || [];

        // Filter projects based on props
        if (showFeatured && !showAll) {
          fetchedProjects = fetchedProjects.filter(project => project.featured);
        }

        // Sort by order and featured status
        fetchedProjects.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (a.order || 999) - (b.order || 999);
        });

        // Limit number of projects
        if (limit && limit > 0) {
          fetchedProjects = fetchedProjects.slice(0, limit);
        }

        setProjects(fetchedProjects);
        setDisplayedProjects(fetchedProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
        setProjects([]);
        setDisplayedProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [showFeatured, showAll, limit]);

  // Filter projects by technology/type
  useEffect(() => {
    if (filter === 'all') {
      setDisplayedProjects(projects);
    } else {
      const filtered = projects.filter(project => 
        project.technologies?.includes(filter) || 
        project.type === filter
      );
      setDisplayedProjects(filtered);
    }
  }, [filter, projects]);

  // Get unique filter options
  const getFilterOptions = () => {
    const options = new Set(['all']);
    projects.forEach(project => {
      project.technologies?.forEach(tech => options.add(tech));
      if (project.type) options.add(project.type);
    });
    return Array.from(options);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <Container>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </Container>
      </section>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-background">
      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* Filter Options */}
        {showAll && getFilterOptions().length > 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <FilterIcon className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Filter Projects</h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {getFilterOptions().map(option => (
                  <Button
                    key={option}
                    variant={filter === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(option)}
                    className="transition-all duration-200 capitalize"
                  >
                    {option === 'all' ? 'All Projects' : option}
                  </Button>
                ))}
              </div>

              {/* Results Count */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {displayedProjects.length} of {projects.length} projects
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Projects Grid */}
        <AnimatePresence mode="wait">
          {displayedProjects.length > 0 ? (
            <motion.div
              key={filter}
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {displayedProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  variants={itemVariants}
                  className="h-full"
                >
                  <ProjectCard 
                    project={project} 
                    featured={index === 0 && showFeatured && !showAll}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold mb-4">No Projects Found</h3>
              <p className="text-muted-foreground mb-6">
                No projects match the selected filter. Try choosing a different option.
              </p>
              <Button
                onClick={() => setFilter('all')}
                variant="outline"
              >
                Show All Projects
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View All Link */}
        {!showAll && displayedProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link href="/projects">
              <Button size="lg" className="group">
                View All Projects
                <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Featured Project Spotlight */}
        {showFeatured && !showAll && projects.some(p => p.featured) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-20"
          >
            <h3 className="text-2xl font-bold mb-8 text-center">Project Spotlight</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {projects
                .filter(project => project.featured)
                .slice(0, 2)
                .map((project) => (
                  <motion.div
                    key={`spotlight-${project.id}`}
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ProjectCard project={project} featured />
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <Card className="p-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <h3 className="text-2xl font-bold mb-4">Interested in Working Together?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              I'm always excited to take on new challenges and collaborate on innovative projects. 
              Let's discuss how we can bring your ideas to life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" className="group">
                  Get In Touch
                  <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" size="lg">
                  Learn More About Me
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </Container>
    </section>
  );
}