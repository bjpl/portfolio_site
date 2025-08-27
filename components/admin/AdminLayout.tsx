import React, { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth0 } from '@auth0/auth0-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, 
  FileText, 
  Users, 
  Image, 
  Settings, 
  Bell,
  Menu,
  X,
  Home,
  Search,
  Upload,
  Eye,
  LogOut,
  User,
  Moon,
  Sun,
  Globe
} from 'lucide-react';
import { UserRole } from '@/types/admin';
import { useSupabaseRealtime } from '@/hooks/admin/useSupabaseRealtime';

interface AdminLayoutProps {
  children: ReactNode;
  userRole: UserRole;
  currentPage?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  roles: UserRole[];
  badge?: string | number;
  children?: NavigationItem[];
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ 
  children, 
  userRole, 
  currentPage = 'dashboard' 
}) => {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth0();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(0);
  
  // Real-time notifications
  const { data: notificationData } = useSupabaseRealtime('notifications');
  
  useEffect(() => {
    if (notificationData) {
      setNotifications(prev => prev + 1);
    }
  }, [notificationData]);

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      href: '/admin',
      roles: ['admin', 'editor', 'viewer']
    },
    {
      id: 'content',
      label: 'Content',
      icon: FileText,
      href: '/admin/content',
      roles: ['admin', 'editor'],
      children: [
        {
          id: 'content-list',
          label: 'All Content',
          icon: FileText,
          href: '/admin/content',
          roles: ['admin', 'editor']
        },
        {
          id: 'content-new',
          label: 'Create New',
          icon: Upload,
          href: '/admin/content/new',
          roles: ['admin', 'editor']
        },
        {
          id: 'content-categories',
          label: 'Categories',
          icon: FileText,
          href: '/admin/content/categories',
          roles: ['admin', 'editor']
        }
      ]
    },
    {
      id: 'media',
      label: 'Media',
      icon: Image,
      href: '/admin/media',
      roles: ['admin', 'editor']
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      href: '/admin/users',
      roles: ['admin']
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      href: '/admin/analytics',
      roles: ['admin', 'editor']
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: '/admin/settings',
      roles: ['admin']
    }
  ];

  const filteredNavigation = navigationItems.filter(item => 
    item.roles.includes(userRole)
  );

  const handleNavigation = (href: string) => {
    router.push(href);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    logout({ returnTo: window.location.origin });
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to access the admin panel.
            </p>
            <Button onClick={() => router.push('/login')}>Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Globe className="h-8 w-8 text-primary" />
            <span className="ml-2 text-xl font-bold">Admin</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <div key={item.id}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className={`w-full justify-start h-10 ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
                    onClick={() => handleNavigation(item.href)}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.label}
                    {item.badge && (
                      <Badge className="ml-auto" variant="secondary">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                  
                  {/* Sub-navigation */}
                  {item.children && isActive && (
                    <div className="ml-6 mt-2 space-y-1">
                      {item.children.filter(child => child.roles.includes(userRole)).map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <Button
                            key={child.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 text-sm"
                            onClick={() => handleNavigation(child.href)}
                          >
                            <ChildIcon className="h-3 w-3 mr-2" />
                            {child.label}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-3">
            <img 
              src={user?.picture || '/default-avatar.png'} 
              alt={user?.name}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
              {userRole}
            </Badge>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleTheme}
              className="flex-1"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="flex-1"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              {/* Breadcrumb */}
              <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
                <Home className="h-4 w-4" />
                <span>/</span>
                <span className="capitalize">{currentPage}</span>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    variant="destructive"
                  >
                    {notifications}
                  </Badge>
                )}
              </Button>

              {/* User Menu */}
              <div className="flex items-center space-x-2">
                <img 
                  src={user?.picture || '/default-avatar.png'} 
                  alt={user?.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="hidden md:block">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>© 2024 Portfolio Admin</span>
              <Separator orientation="vertical" className="h-4" />
              <span>Version 1.0.0</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                Help
              </Button>
              <Button variant="ghost" size="sm">
                Support
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;