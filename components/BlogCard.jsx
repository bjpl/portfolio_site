'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { getReadingTime } from '../utils/readingTime';

export default function BlogCard({ post }) {
  const {
    id,
    title,
    excerpt,
    slug,
    featured_image,
    published_at,
    content,
    tags = [],
    profiles: author
  } = post;

  const publishedDate = new Date(published_at);
  const timeAgo = formatDistanceToNow(publishedDate, { addSuffix: true });
  const readingTime = getReadingTime(content);

  return (
    <article className="group bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Featured Image */}
      {featured_image && (
        <div className="relative h-48 w-full overflow-hidden">
          <Link href={`/blog/${slug}`}>
            <Image
              src={featured_image}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </Link>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                +{tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <Link href={`/blog/${slug}`} className="line-clamp-2">
            {title}
          </Link>
        </h2>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
            {excerpt}
          </p>
        )}

        {/* Meta Information */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          {/* Author Info */}
          <div className="flex items-center space-x-2">
            {author?.avatar_url ? (
              <Image
                src={author.avatar_url}
                alt={author.full_name || author.username}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium">
                  {(author?.full_name || author?.username || 'A')[0].toUpperCase()}
                </span>
              </div>
            )}
            <span className="font-medium">
              {author?.full_name || author?.username || 'Anonymous'}
            </span>
          </div>

          {/* Reading Time & Date */}
          <div className="flex items-center space-x-3">
            <span>{readingTime}</span>
            <span>•</span>
            <time dateTime={published_at} title={publishedDate.toLocaleDateString()}>
              {timeAgo}
            </time>
          </div>
        </div>
      </div>
    </article>
  );
}