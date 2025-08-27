import ProjectClient from './ProjectClient';

// Static generation for all project pages
export async function generateStaticParams() {
  try {
    // Import the projects data directly for static generation
    const { projects } = await import('../../../data/projects.json');
    
    return projects.map((project) => ({
      slug: project.slug,
    }));
  } catch (error) {
    console.warn('Could not load projects for static generation:', error);
    return [];
  }
}

// Generate metadata for each project page
export async function generateMetadata({ params }) {
  try {
    const { projects } = await import('../../../data/projects.json');
    const project = projects.find((p) => p.slug === params.slug);
    
    if (!project) {
      return {
        title: 'Project Not Found',
        description: 'The requested project could not be found.',
      };
    }

    return {
      title: `${project.title} | Portfolio`,
      description: project.description,
      openGraph: {
        title: project.title,
        description: project.description,
        images: [
          {
            url: project.image || '/images/placeholder-project.jpg',
            width: 1200,
            height: 630,
            alt: project.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: project.title,
        description: project.description,
        images: [project.image || '/images/placeholder-project.jpg'],
      },
    };
  } catch (error) {
    return {
      title: 'Project | Portfolio',
      description: 'View project details and live demos.',
    };
  }
}

export default function ProjectDetailPage() {
  return <ProjectClient />;
}