'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { db } from '../../../lib/supabase/client';
import BlogPost from '../../../components/BlogPost';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import Container from '../../../components/ui/Container';

// Metadata generation cannot be exported from client components
// Move generateMetadata to a parent server component or remove 'use client'

export default function BlogPostPage() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const params = useParams();

  useEffect(() => {
    async function loadPost() {
      try {
        setLoading(true);
        const postData = await db.blogPosts.getBySlug(params.slug);
        
        if (!postData) {
          notFound();
          return;
        }
        
        setPost(postData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.slug) {
      loadPost();
    }
  }, [params.slug]);

  if (loading) {
    return (
      <Container>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Post</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </Container>
    );
  }

  if (!post) {
    notFound();
    return null;
  }

  return <BlogPost post={post} />;
}