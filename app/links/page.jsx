'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ExternalLink, Tag, Grid, List, ChevronDown } from 'lucide-react';

// Metadata cannot be exported from client components
// Set metadata in layout.js or parent server component instead

// Custom components for better organization
const SearchBar = ({ searchQuery, onSearchChange, placeholder = "Search links..." }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
    <input
      type="text"
      placeholder={placeholder}
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
    />
  </div>
);

const FilterDropdown = ({ selectedSection, onSectionChange, sections, isOpen, onToggle }) => (
  <div className="relative">
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
    >
      <Filter className="h-5 w-5" />
      <span>{selectedSection ? sections.find(s => s.id === selectedSection)?.title : 'All Sections'}</span>
      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    
    {isOpen && (
      <div className="absolute top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 dark:bg-gray-800 dark:border-gray-700">
        <button
          onClick={() => {
            onSectionChange('');
            onToggle();
          }}
          className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors dark:hover:bg-gray-700 ${!selectedSection ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : ''}`}
        >
          All Sections
        </button>
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => {
              onSectionChange(section.id);
              onToggle();
            }}
            className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 dark:hover:bg-gray-700 ${selectedSection === section.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : ''}`}
          >
            <span>{section.emoji}</span>
            <span>{section.title}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

const ViewToggle = ({ view, onViewChange }) => (
  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden dark:border-gray-700">
    <button
      onClick={() => onViewChange('grid')}
      className={`flex items-center gap-2 px-4 py-3 transition-colors ${view === 'grid' ? 'bg-blue-500 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
    >
      <Grid className="h-4 w-4" />
      <span className="hidden sm:inline">Grid</span>
    </button>
    <button
      onClick={() => onViewChange('list')}
      className={`flex items-center gap-2 px-4 py-3 transition-colors ${view === 'list' ? 'bg-blue-500 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
    >
      <List className="h-4 w-4" />
      <span className="hidden sm:inline">List</span>
    </button>
  </div>
);

const LinkCard = ({ link, view }) => (
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
          <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-sm text-gray-600 mb-3 dark:text-gray-300 line-clamp-2">
          {link.description}
        </p>
        <div className="flex flex-wrap gap-1">
          {link.tags.slice(0, view === 'list' ? 3 : 4).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full dark:bg-gray-700 dark:text-gray-300"
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

const CategorySection = ({ category, view, searchQuery }) => {
  if (category.links.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white">
        {category.title}
        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
          ({category.links.length} {category.links.length === 1 ? 'link' : 'links'})
        </span>
      </h3>
      <div className={view === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
        : 'space-y-4'
      }>
        {category.links.map((link, index) => (
          <LinkCard key={index} link={link} view={view} />
        ))}
      </div>
    </div>
  );
};

export default function LinksPage() {
  const [linksData, setLinksData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [view, setView] = useState('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Load links data
  useEffect(() => {
    const loadLinksData = async () => {
      try {
        const response = await fetch('/api/links');
        if (!response.ok) {
          throw new Error('Failed to fetch links');
        }
        const data = await response.json();
        setLinksData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadLinksData();
  }, []);

  // Filtered and searched data
  const filteredData = useMemo(() => {
    if (!linksData) return null;

    let filtered = { ...linksData };

    // Filter by selected section
    if (selectedSection) {
      filtered.sections = filtered.sections.filter(section => section.id === selectedSection);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered.sections = filtered.sections.map(section => ({
        ...section,
        categories: section.categories.map(category => ({
          ...category,
          links: category.links.filter(link =>
            link.title.toLowerCase().includes(query) ||
            link.description.toLowerCase().includes(query) ||
            link.tags.some(tag => tag.toLowerCase().includes(query))
          )
        })).filter(category => category.links.length > 0)
      })).filter(section => section.categories.length > 0);
    }

    return filtered;
  }, [linksData, selectedSection, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    if (!filteredData) return null;
    
    return {
      totalSections: filteredData.sections.length,
      totalCategories: filteredData.sections.reduce((acc, section) => acc + section.categories.length, 0),
      totalLinks: filteredData.sections.reduce((acc, section) => 
        acc + section.categories.reduce((catAcc, category) => catAcc + category.links.length, 0), 0
      )
    };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">Error loading links</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 dark:text-white">
          Curated Links Collection
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          A comprehensive collection of useful links and resources across government, education, culture, food, and travel in Latin America
        </p>
        {stats && (
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
            <span>{stats.totalSections} sections</span>
            <span>{stats.totalCategories} categories</span>
            <span>{stats.totalLinks} links</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search by title, description, or tags..."
          />
        </div>
        <div className="flex gap-4">
          <FilterDropdown
            selectedSection={selectedSection}
            onSectionChange={setSelectedSection}
            sections={linksData?.sections || []}
            isOpen={isFilterOpen}
            onToggle={() => setIsFilterOpen(!isFilterOpen)}
          />
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      {/* Results */}
      {filteredData && filteredData.sections.length > 0 ? (
        <div className="space-y-12">
          {filteredData.sections.map((section) => (
            <div key={section.id} className="space-y-8">
              <div className="border-l-4 border-blue-500 pl-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 dark:text-white">
                  <span className="text-3xl">{section.emoji}</span>
                  {section.title}
                </h2>
              </div>
              
              {section.categories.map((category, categoryIndex) => (
                <CategorySection
                  key={categoryIndex}
                  category={category}
                  view={view}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2 dark:text-white">No links found</h3>
          <p className="text-gray-600 dark:text-gray-300">
            {searchQuery || selectedSection 
              ? 'Try adjusting your search or filter criteria'
              : 'No links are available at the moment'
            }
          </p>
          {(searchQuery || selectedSection) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSection('');
              }}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}