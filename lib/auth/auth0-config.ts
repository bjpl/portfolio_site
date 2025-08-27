import { UserProvider } from '@auth0/nextjs-auth0/client';
import { handleAuth, handleCallback, handleLogin, handleLogout } from '@auth0/nextjs-auth0';
import { NextApiRequest, NextApiResponse } from 'next';

export interface Auth0User {
  sub: string;
  name: string;
  email: string;
  picture: string;
  role?: 'admin' | 'editor' | 'viewer';
  permissions?: string[];
}

export interface AdminPermission {
  action: 'create' | 'read' | 'update' | 'delete';
  resource: 'content' | 'media' | 'users' | 'settings';
}

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  admin: [
    { action: 'create', resource: 'content' },
    { action: 'read', resource: 'content' },
    { action: 'update', resource: 'content' },
    { action: 'delete', resource: 'content' },
    { action: 'create', resource: 'media' },
    { action: 'read', resource: 'media' },
    { action: 'update', resource: 'media' },
    { action: 'delete', resource: 'media' },
    { action: 'create', resource: 'users' },
    { action: 'read', resource: 'users' },
    { action: 'update', resource: 'users' },
    { action: 'delete', resource: 'users' },
    { action: 'create', resource: 'settings' },
    { action: 'read', resource: 'settings' },
    { action: 'update', resource: 'settings' },
    { action: 'delete', resource: 'settings' },
  ],
  editor: [
    { action: 'create', resource: 'content' },
    { action: 'read', resource: 'content' },
    { action: 'update', resource: 'content' },
    { action: 'create', resource: 'media' },
    { action: 'read', resource: 'media' },
    { action: 'update', resource: 'media' },
    { action: 'read', resource: 'users' },
    { action: 'read', resource: 'settings' },
  ],
  viewer: [
    { action: 'read', resource: 'content' },
    { action: 'read', resource: 'media' },
    { action: 'read', resource: 'users' },
    { action: 'read', resource: 'settings' },
  ],
};

// Auth0 configuration
export const auth0Config = {
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  redirectUri: process.env.AUTH0_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/callback`,
  postLogoutRedirectUri: process.env.AUTH0_POST_LOGOUT_REDIRECT_URI || process.env.NEXTAUTH_URL,
  scope: 'openid profile email',
  audience: process.env.AUTH0_AUDIENCE,
};

// Custom login handler with role assignment
export const customLogin = handleLogin({
  authorizationParams: {
    scope: 'openid profile email',
    audience: process.env.AUTH0_AUDIENCE,
    prompt: 'login',
  },
});

// Custom callback handler to process user roles
export const customCallback = handleCallback({
  afterCallback: async (req: NextApiRequest, res: NextApiResponse, session: any) => {
    const user = session.user as Auth0User;
    
    // Fetch user role from Auth0 app_metadata or your database
    try {
      // This would typically call your user management API
      const userRole = await getUserRole(user.sub);
      const userPermissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.viewer;
      
      // Add role and permissions to session
      session.user.role = userRole;
      session.user.permissions = userPermissions;
      
      // Store in database or cache if needed
      await updateUserSession(user.sub, {
        role: userRole,
        permissions: userPermissions,
        lastLogin: new Date(),
      });
      
    } catch (error) {
      console.error('Error processing user role:', error);
      // Default to viewer role
      session.user.role = 'viewer';
      session.user.permissions = ROLE_PERMISSIONS.viewer;
    }
    
    return session;
  },
});

// Utility functions
export const getUserRole = async (userId: string): Promise<'admin' | 'editor' | 'viewer'> => {
  // Implementation would fetch from your user management system
  // This could be Auth0 Management API, your database, etc.
  try {
    const response = await fetch(`/api/admin/users/${userId}/role`);
    const data = await response.json();
    return data.role || 'viewer';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'viewer';
  }
};

export const updateUserSession = async (userId: string, sessionData: any) => {
  // Implementation would update user session data
  try {
    await fetch(`/api/admin/users/${userId}/session`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });
  } catch (error) {
    console.error('Error updating user session:', error);
  }
};

export const hasPermission = (
  user: Auth0User,
  action: AdminPermission['action'],
  resource: AdminPermission['resource']
): boolean => {
  const userPermissions = user.permissions || [];
  return userPermissions.some(
    permission => permission.action === action && permission.resource === resource
  );
};

export const requireAdmin = (handler: any) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { user } = await getSession(req, res) || {};
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    return handler(req, res);
  };
};

export const requirePermission = (action: AdminPermission['action'], resource: AdminPermission['resource']) => {
  return (handler: any) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const { user } = await getSession(req, res) || {};
      
      if (!user || !hasPermission(user, action, resource)) {
        return res.status(403).json({ error: `Permission denied for ${action} on ${resource}` });
      }
      
      return handler(req, res);
    };
  };
};

// Re-export Auth0 handlers
export default handleAuth({
  login: customLogin,
  callback: customCallback,
  logout: handleLogout({
    returnTo: process.env.AUTH0_POST_LOGOUT_REDIRECT_URI || process.env.NEXTAUTH_URL
  }),
});

// Import getSession for permission checks
import { getSession } from '@auth0/nextjs-auth0';