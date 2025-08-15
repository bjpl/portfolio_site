import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from '../../store/StoreProvider';

/**
 * Public Route Component
 * Routes that redirect authenticated users (like login page)
 */
const PublicRoute = ({ 
  children, 
  redirectTo = '/dashboard',
  restrictAuthenticated = false 
}) => {
  const { isAuthenticated } = useSelector(state => state.auth);
  
  // If route is restricted for authenticated users and user is logged in
  if (restrictAuthenticated && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }
  
  // Render children for public access
  return children;
};

export default PublicRoute;