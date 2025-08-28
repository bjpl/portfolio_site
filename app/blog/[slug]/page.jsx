import BlogPost from '../../../components/BlogPost';
import Container from '../../../components/ui/Container';

// Sample blog posts data - replace with your actual data source
const blogPosts = [
  {
    slug: 'getting-started',
    title: 'Getting Started with Next.js',
    content: 'Welcome to our blog! This is a sample post about getting started with Next.js.',
    excerpt: 'Learn how to get started with Next.js and build amazing web applications.',
    author: 'Brandon Lambert',
    date: '2024-01-15',
    tags: ['next.js', 'react', 'web development'],
    readTime: '5 min read',
    image: '/images/blog/getting-started.jpg'
  },
  {
    slug: 'react-best-practices',
    title: 'React Best Practices in 2024',
    content: 'Discover the best practices for building React applications in 2024.',
    excerpt: 'Modern React patterns and practices for building scalable applications.',
    author: 'Brandon Lambert',
    date: '2024-02-01',
    tags: ['react', 'javascript', 'best practices'],
    readTime: '8 min read',
    image: '/images/blog/react-best-practices.jpg'
  },
  {
    slug: 'web-performance',
    title: 'Web Performance Optimization',
    content: 'Learn how to optimize your web applications for maximum performance.',
    excerpt: 'Tips and tricks for improving web performance and user experience.',
    author: 'Brandon Lambert',
    date: '2024-02-15',
    tags: ['performance', 'optimization', 'web'],
    readTime: '10 min read',
    image: '/images/blog/web-performance.jpg'
  }
];

// Generate static params for all blog posts
export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const post = blogPosts.find(p => p.slug === params.slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The requested blog post could not be found.'
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      authors: [post.author],
      publishedTime: post.date,
    },
  };
}

export default function BlogPostPage({ params }) {
  const post = blogPosts.find(p => p.slug === params.slug);

  if (!post) {
    return (
      <Container>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
            <p className="text-gray-600">The blog post you're looking for doesn't exist.</p>
          </div>
        </div>
      </Container>
    );
  }

  return <BlogPost post={post} />;
}