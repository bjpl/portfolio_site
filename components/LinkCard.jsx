import { ExternalLink, Tag } from 'lucide-react';

export default function LinkCard({ link, view = 'grid' }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition-all duration-200 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-500 ${view === 'list' ? 'p-4' : 'p-6'}`}
    >
      <div className={`flex ${view === 'list' ? 'items-center gap-4' : 'flex-col gap-3'}`}>
        <div className={view === 'list' ? 'flex-1' : ''}>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors dark:text-white dark:group-hover:text-blue-400 line-clamp-1">
              {link.title}
            </h3>
            <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </div>
          
          <p className="text-sm text-gray-600 mb-3 dark:text-gray-300 line-clamp-2">
            {link.description}
          </p>
          
          <div className="flex flex-wrap gap-1">
            {link.tags.slice(0, view === 'list' ? 3 : 4).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-blue-900 dark:hover:text-blue-300"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
            {link.tags.length > (view === 'list' ? 3 : 4) && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{link.tags.length - (view === 'list' ? 3 : 4)} more
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}