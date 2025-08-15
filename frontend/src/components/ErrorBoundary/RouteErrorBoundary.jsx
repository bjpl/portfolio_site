import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';

/**
 * Route-specific error boundary that provides navigation context
 */
const RouteErrorBoundary = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleError = (error, errorInfo, errorId) => {
    // Log route-specific error information
    console.error('Route Error:', {
      path: location.pathname,
      search: location.search,
      error,
      errorInfo,
      errorId
    });
  };

  const handleReset = () => {
    // Navigate to home on reset
    navigate('/');
  };

  const RouteErrorFallback = ({ error, errorId, onReset }) => (
    <div className="route-error">
      <div className="route-error__container">
        <h1>Page Error</h1>
        <p>
          We encountered an error loading this page: 
          <code>{location.pathname}</code>
        </p>
        {errorId && (
          <p className="route-error__id">
            Error ID: <code>{errorId}</code>
          </p>
        )}
        <div className="route-error__actions">
          <button onClick={onReset}>Go to Homepage</button>
          <button onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={RouteErrorFallback}
      onError={handleError}
      onReset={handleReset}
      context={`route:${location.pathname}`}
      metadata={{ route: location.pathname }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default RouteErrorBoundary;