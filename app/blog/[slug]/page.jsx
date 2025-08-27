'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { db } from '../../../lib/supabase/client';
import BlogPost from '../../../components/BlogPost';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import Container from '../../../components/ui/Container';

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  try {
    const post = await db.blogPosts.getBySlug(params.slug);
    
    if (!post) {
      return {
        title: 'Post Not Found',
        description: 'The requested blog post could not be found.'
      };
    }

    return {
      title: post.title,
      description: post.meta_description || post.excerpt || `Read ${post.title} on our blog.`,
      keywords: post.tags?.join(', ') || '',
      authors: [{ name: post.profiles?.full_name || post.profiles?.username || 'Anonymous' }],
      openGraph: {
        title: post.title,
        description: post.meta_description || post.excerpt,
        type: 'article',
        publishedTime: post.published_at,
        modifiedTime: post.updated_at,
        authors: [post.profiles?.full_name || post.profiles?.username || 'Anonymous'],
        images: post.featured_image ? [
          {
            url: post.featured_image,
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.meta_description || post.excerpt,
        images: post.featured_image ? [post.featured_image] : undefined,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Blog Post',
      description: 'Read our latest blog post.'
    };
  }
}

export default function BlogPostPage() {
  const params = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPost() {
      try {
        setLoading(true);
        const postData = await db.blogPosts.getBySlug(params.slug);
        
        if (!postData) {
          notFound();
          return;
        }

        setPost(postData);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.slug) {
      fetchPost();
    }
  }, [params.slug]);

  if (loading) {
    return (
      <Container className="py-12">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Loading post...
            </p>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-12">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error Loading Post
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </Container>
    );
  }

  if (!post) {
    return null; // notFound() will be called in the useEffect
  }

  return (
    <Container className="py-12">
      <BlogPost post={post} />
    </Container>
  );
}