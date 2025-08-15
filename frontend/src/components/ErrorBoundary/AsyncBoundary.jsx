import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';

/**
 * AsyncBoundary combines Suspense and ErrorBoundary for async components
 * Perfect for lazy-loaded components and data fetching
 */
const AsyncBoundary = ({ 
  children, 
  fallback = <LoadingSpinner />,
  errorFallback,
  onError,
  context = 'async-component'
}) => {
  return (
    <ErrorBoundary 
      fallback={errorFallback}
      onError={onError}
      context={context}
    >
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default AsyncBoundary;