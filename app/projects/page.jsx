'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProjectCard from '../../components/ProjectCard';
import Container from '../../components/ui/Container';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTechnology, setSelectedTechnology] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/data/projects.json');
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error('Error loading projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Get unique technologies and types for filters
  const { technologies, types } = useMemo(() => {
    const techSet = new Set();
    const typeSet = new Set();
    
    projects.forEach(project => {
      project.technologies?.forEach(tech => techSet.add(tech));
      if (project.type) typeSet.add(project.type);
    });

    return {
      technologies: Array.from(techSet).sort(),
      types: Array.from(typeSet).sort()
    };
  }, [projects]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Filter by technology
    if (selectedTechnology !== 'all') {
      filtered = filtered.filter(project => 
        project.technologies?.includes(selectedTechnology)
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(project => 
        project.type === selectedType
      );
    }

    // Sort projects
    switch (sortBy) {
      case 'featured':
        filtered.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (a.order || 999) - (b.order || 999);
        });
        break;
      case 'recent':
        filtered.sort((a, b) => {
          const statusOrder = { 'In Progress': 0, 'Completed': 1 };
          return (statusOrder[a.status] || 2) - (statusOrder[b.status] || 2);
        });
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    return filtered;
  }, [projects, selectedTechnology, selectedType, sortBy]);

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
      <div className="min-h-screen pt-20">
        <Container>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16">
      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            My Projects
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A collection of projects I've built, ranging from web applications to mobile apps and blockchain solutions.
            Each project represents a unique challenge and learning experience.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <Card className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Technology Filter */}
              <div className="flex-1">
                <label className="block text-sm font-medium mb-3">Filter by Technology</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedTechnology === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTechnology('all')}
                    className="transition-all duration-200"
                  >
                    All
                  </Button>
                  {technologies.map(tech => (
                    <Button
                      key={tech}
                      variant={selectedTechnology === tech ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedTechnology(tech)}
                      className="transition-all duration-200"
                    >
                      {tech}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div className="flex-1">
                <label className="block text-sm font-medium mb-3">Filter by Type</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedType('all')}
                    className="transition-all duration-200"
                  >
                    All Types
                  </Button>
                  {types.map(type => (
                    <Button
                      key={type}
                      variant={selectedType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedType(type)}
                      className="transition-all duration-200"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sort Options */}
              <div className="lg:w-48">
                <label className="block text-sm font-medium mb-3">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="featured">Featured First</option>
                  <option value="recent">Most Recent</option>
                  <option value="title">Alphabetical</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {filteredProjects.length} of {projects.length} projects
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Projects Grid */}
        <AnimatePresence>
          {filteredProjects.length > 0 ? (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  variants={itemVariants}
                  layout
                  className="h-full"
                >
                  <ProjectCard project={project} />
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
                No projects match your current filters. Try adjusting your search criteria.
              </p>
              <Button
                onClick={() => {
                  setSelectedTechnology('all');
                  setSelectedType('all');
                  setSortBy('featured');
                }}
                variant="outline"
              >
                Clear All Filters
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Featured Projects Section */}
        {selectedTechnology === 'all' && selectedType === 'all' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-20"
          >
            <h2 className="text-3xl font-bold mb-8 text-center">Featured Projects</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {projects
                .filter(project => project.featured)
                .slice(0, 2)
                .map((project) => (
                  <motion.div
                    key={`featured-${project.id}`}
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ProjectCard project={project} featured />
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}
      </Container>
    </div>
  );
}