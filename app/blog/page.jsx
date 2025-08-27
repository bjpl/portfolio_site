'use client';

import { useState, useEffect } from 'react';
import { db } from '../../lib/supabase/client';
import BlogCard from '../../components/BlogCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Container from '../../components/ui/Container';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [allTags, setAllTags] = useState([]);

  const POSTS_PER_PAGE = 9;

  // Fetch posts
  const fetchPosts = async (page = 1, search = '', tag = '') => {
    try {
      setLoading(true);
      const offset = (page - 1) * POSTS_PER_PAGE;
      
      // Get all posts for filtering (in a real app, you'd do this server-side)
      const allPosts = await db.blogPosts.getAll({ 
        limit: 1000, 
        offset: 0 
      });

      // Extract unique tags
      const tagsSet = new Set();
      allPosts.forEach(post => {
        if (post.tags && Array.isArray(post.tags)) {
          post.tags.forEach(tag => tagsSet.add(tag));
        }
      });
      setAllTags(Array.from(tagsSet).sort());

      // Filter posts
      let filteredPosts = allPosts;

      if (search) {
        filteredPosts = filteredPosts.filter(post =>
          post.title.toLowerCase().includes(search.toLowerCase()) ||
          (post.excerpt && post.excerpt.toLowerCase().includes(search.toLowerCase())) ||
          (post.content && post.content.toLowerCase().includes(search.toLowerCase()))
        );
      }

      if (tag) {
        filteredPosts = filteredPosts.filter(post =>
          post.tags && post.tags.includes(tag)
        );
      }

      // Paginate
      const paginatedPosts = filteredPosts.slice(offset, offset + POSTS_PER_PAGE);
      
      if (page === 1) {
        setPosts(paginatedPosts);
      } else {
        setPosts(prev => [...prev, ...paginatedPosts]);
      }

      setHasMore(filteredPosts.length > offset + POSTS_PER_PAGE);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPosts(1, searchTerm, selectedTag);
  }, [searchTerm, selectedTag]);

  // Load more posts
  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchPosts(nextPage, searchTerm, selectedTag);
    }
  };

  // Reset pagination when filters change
  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleTagFilter = (tag) => {
    setSelectedTag(tag);
    setCurrentPage(1);
  };

  if (error) {
    return (
      <Container className="py-12">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h2>
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

  return (
    <Container className="py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Blog
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Insights, tutorials, and thoughts on web development, design, and technology.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Tag Filter */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by tag:
          </label>
          <select
            value={selectedTag}
            onChange={(e) => handleTagFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          >
            <option value="">All tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Posts Grid */}
      {loading && posts.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No posts found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || selectedTag
              ? 'Try adjusting your search or filter criteria.'
              : 'Check back later for new content.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {posts.map(post => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load More Posts'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Results Info */}
      {posts.length > 0 && (
        <div className="text-center mt-8 text-sm text-gray-600 dark:text-gray-400">
          Showing {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          {(searchTerm || selectedTag) && (
            <>
              {' '}
              {searchTerm && `matching "${searchTerm}"`}
              {searchTerm && selectedTag && ' and '}
              {selectedTag && `tagged with "${selectedTag}"`}
            </>
          )}
        </div>
      )}
    </Container>
  );
}