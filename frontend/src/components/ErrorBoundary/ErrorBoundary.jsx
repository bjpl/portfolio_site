import React, { Component } from 'react';
import { logError } from '../../services/errorService';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log error to error reporting service
    logError({
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
      errorId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      context: this.props.context || 'unknown',
      userId: this.props.userId || null,
      metadata: this.props.metadata || {}
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: this.state.retryCount + 1
    });

    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Check if custom fallback component is provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            errorId={this.state.errorId}
            onReset={this.handleReset}
            onReload={this.handleReload}
          />
        );
      }

      // Default error UI
      return (
        <div className="error-boundary">
          <div className="error-boundary__container">
            <div className="error-boundary__icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2"/>
                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2"/>
              </svg>
            </div>
            
            <h1 className="error-boundary__title">
              {this.props.title || 'Something went wrong'}
            </h1>
            
            <p className="error-boundary__message">
              {this.props.message || 'We encountered an unexpected error. Our team has been notified.'}
            </p>

            {this.state.errorId && (
              <p className="error-boundary__error-id">
                Error ID: <code>{this.state.errorId}</code>
              </p>
            )}

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-boundary__details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-boundary__stack">
                  <strong>{this.state.error.toString()}</strong>
                  {'\n\n'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="error-boundary__actions">
              <button
                className="error-boundary__button error-boundary__button--primary"
                onClick={this.handleReset}
                disabled={this.state.retryCount >= 3}
              >
                {this.state.retryCount >= 3 ? 'Max retries reached' : 'Try Again'}
              </button>
              
              <button
                className="error-boundary__button error-boundary__button--secondary"
                onClick={this.handleReload}
              >
                Reload Page
              </button>

              {this.props.showHomeButton !== false && (
                <button
                  className="error-boundary__button error-boundary__button--tertiary"
                  onClick={() => window.location.href = '/'}
                >
                  Go to Homepage
                </button>
              )}
            </div>

            {this.props.showSupport !== false && (
              <div className="error-boundary__support">
                <p>
                  If this problem persists, please{' '}
                  <a href="/contact" className="error-boundary__link">
                    contact our support team
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;