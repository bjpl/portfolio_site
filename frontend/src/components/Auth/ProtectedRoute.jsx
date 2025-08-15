import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from '../../store/StoreProvider';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';

/**
 * Protected Route Component
 * Wraps routes that require authentication
 */
const ProtectedRoute = ({ 
  children, 
  requireAuth = true,
  requireRole = null,
  requirePermission = null,
  redirectTo = '/login',
  fallback = null
}) => {
  const location = useLocation();
  const { isAuthenticated, user, loading } = useSelector(state => state.auth);
  
  // Show loading spinner while checking auth
  if (loading) {
    return <LoadingSpinner fullScreen message="Checking authentication..." />;
  }
  
  // Check if authentication is required
  if (requireAuth && !isAuthenticated) {
    // Save the attempted location for redirect after login
    return (
      <Navigate 
        to={`${redirectTo}?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        state={{ from: location }}
        replace
      />
    );
  }
  
  // Check role requirements
  if (requireRole && user) {
    const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    
    if (!allowedRoles.includes(user.role)) {
      // User doesn't have required role
      if (fallback) {
        return fallback;
      }
      
      return (
        <div className="access-denied">
          <h1>Access Denied</h1>
          <p>You don't have permission to access this page.</p>
          <p>Required role: {allowedRoles.join(' or ')}</p>
          <p>Your role: {user.role}</p>
          <button onClick={() => window.history.back()}>Go Back</button>
        </div>
      );
    }
  }
  
  // Check specific permissions
  if (requirePermission && user) {
    const permissions = Array.isArray(requirePermission) ? requirePermission : [requirePermission];
    const userPermissions = user.permissions || [];
    
    const hasPermission = permissions.some(perm => 
      userPermissions.includes(perm) || 
      userPermissions.includes('*') || // Admin wildcard
      user.role === 'admin' // Admin bypass
    );
    
    if (!hasPermission) {
      if (fallback) {
        return fallback;
      }
      
      return (
        <div className="access-denied">
          <h1>Permission Required</h1>
          <p>You don't have the required permissions for this action.</p>
          <button onClick={() => window.history.back()}>Go Back</button>
        </div>
      );
    }
  }
  
  // All checks passed, render children
  return children;
};

export default ProtectedRoute;