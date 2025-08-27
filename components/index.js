// Consolidated Components - Single Source of Truth
// This file exports all consolidated components from their unified locations

// Layout Components
export { Navigation } from './layout/Navigation';
export { Footer } from './layout/Footer';
export { Layout } from './layout/Layout';
export { ThemeToggle } from './layout/ThemeToggle';

// UI Components
export { ProjectCard } from './ui/ProjectCard';

// Other existing components (maintaining compatibility)
export { default as BlogCard } from './BlogCard';
export { default as BlogPost } from './BlogPost';
export { default as ProjectGallery } from './ProjectGallery';
// export { default as HeroSection } from './HeroSection'; // Temporarily disabled
export { default as PWAInstallPrompt } from './PWAInstallPrompt';
export { default as PushNotifications } from './PushNotifications';
export { default as LazyImage } from './LazyImage';
export { default as LinkCard } from './LinkCard';
export { default as LazySection } from './LazySection';

// UI Components
export { default as Container } from './ui/Container';
export { SkeletonLoader } from './ui/SkeletonLoader';
export { LoadingSpinner } from './ui/LoadingSpinner';

// Legacy exports for backward compatibility (will be deprecated)
// These are temporary and should be updated to use the new consolidated versions
export { Navigation as LegacyNavigation } from './Navigation';
export { Footer as LegacyFooter } from './Footer';
export { Layout as LegacyLayout } from './Layout';
export { ThemeToggle as LegacyThemeToggle } from './ThemeToggle';
export { default as LegacyProjectCard } from './ProjectCard';
export { default as LegacyEnhancedProjectCard } from './EnhancedProjectCard';
export { default as LegacyEnhancedFooter } from './EnhancedFooter';