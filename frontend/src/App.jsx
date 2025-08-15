import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './store/StoreProvider';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import RouteErrorBoundary from './components/ErrorBoundary/RouteErrorBoundary';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import PublicRoute from './components/Auth/PublicRoute';
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner';
import Layout from './components/Layout/Layout';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Blog = lazy(() => import('./pages/Blog'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdminPanel = lazy(() => import('./pages/Admin/AdminPanel'));
const ContentEditor = lazy(() => import('./pages/Admin/ContentEditor'));
const UserManagement = lazy(() => import('./pages/Admin/UserManagement'));
const Analytics = lazy(() => import('./pages/Admin/Analytics'));
const DevTools = lazy(() => import('./pages/Dev/DevTools'));
const Profile = lazy(() => import('./pages/User/Profile'));
const Settings = lazy(() => import('./pages/User/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

/**
 * Main Application Component
 */
function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <Router>
          <RouteErrorBoundary>
            <Layout>
              <Suspense fallback={<LoadingSpinner fullScreen />}>
                <Routes>
                  {/* ===== PUBLIC ROUTES ===== */}
                  {/* These routes are accessible to everyone */}
                  
                  {/* Home page */}
                  <Route path="/" element={<Home />} />
                  
                  {/* Portfolio sections */}
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/portfolio/:slug" element={<Portfolio />} />
                  <Route path="/projects" element={<Portfolio />} />
                  <Route path="/projects/:slug" element={<Portfolio />} />
                  
                  {/* Content sections */}
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<Blog />} />
                  <Route path="/learn" element={<Blog category="learn" />} />
                  <Route path="/learn/:slug" element={<Blog category="learn" />} />
                  <Route path="/make" element={<Blog category="make" />} />
                  <Route path="/make/:slug" element={<Blog category="make" />} />
                  <Route path="/meet" element={<About />} />
                  <Route path="/think" element={<Blog category="think" />} />
                  <Route path="/think/:slug" element={<Blog category="think" />} />
                  
                  {/* About and contact */}
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  
                  {/* ===== AUTH ROUTES ===== */}
                  {/* Login/Register - redirect to dashboard if already logged in */}
                  <Route 
                    path="/login" 
                    element={
                      <PublicRoute restrictAuthenticated redirectTo="/dashboard">
                        <Login />
                      </PublicRoute>
                    } 
                  />
                  
                  <Route 
                    path="/register" 
                    element={
                      <PublicRoute restrictAuthenticated redirectTo="/dashboard">
                        <Register />
                      </PublicRoute>
                    } 
                  />
                  
                  {/* ===== PROTECTED USER ROUTES ===== */}
                  {/* Require authentication but any role */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* ===== ADMIN ROUTES ===== */}
                  {/* Require admin or editor role */}
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute requireRole={['admin', 'editor']}>
                        <AdminPanel />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/admin/content" 
                    element={
                      <ProtectedRoute requireRole={['admin', 'editor', 'author']}>
                        <ContentEditor />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/admin/content/:id" 
                    element={
                      <ProtectedRoute requireRole={['admin', 'editor', 'author']}>
                        <ContentEditor />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/admin/users" 
                    element={
                      <ProtectedRoute requireRole="admin">
                        <UserManagement />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/admin/analytics" 
                    element={
                      <ProtectedRoute requireRole={['admin', 'editor']}>
                        <Analytics />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* ===== DEV TOOLS ROUTES ===== */}
                  {/* Only accessible to admins in production */}
                  <Route 
                    path="/dev/*" 
                    element={
                      <ProtectedRoute 
                        requireRole="admin"
                        fallback={
                          process.env.NODE_ENV === 'development' ? (
                            <DevTools />
                          ) : (
                            <NotFound />
                          )
                        }
                      >
                        <DevTools />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* ===== FALLBACK ROUTES ===== */}
                  {/* Redirect old URLs */}
                  <Route path="/admin.html" element={<Navigate to="/admin" replace />} />
                  <Route path="/dashboard.html" element={<Navigate to="/dashboard" replace />} />
                  
                  {/* 404 - Not Found */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Layout>
          </RouteErrorBoundary>
        </Router>
      </StoreProvider>
    </ErrorBoundary>
  );
}

export default App;