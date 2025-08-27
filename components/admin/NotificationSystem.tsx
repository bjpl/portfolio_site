import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Bell, 
  X, 
  Check, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  User,
  Settings,
  MessageSquare,
  Mail,
  Trash2,
  MarkAsUnread,
  Filter,
  Archive,
  Star,
  Zap
} from 'lucide-react';
import { Notification } from '@/types/admin';
import { useSupabaseRealtime } from '@/hooks/admin/useSupabaseRealtime';
import { formatDistanceToNow } from 'date-fns';

interface NotificationSystemProps {
  userId: string;
  userRole: 'admin' | 'editor' | 'viewer';
}

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

const NotificationItem: React.FC<{
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}> = ({ notification, onMarkAsRead, onDelete, onArchive }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'info': return Info;
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      default: return Info;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'info': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const Icon = getIcon(notification.type);

  return (
    <div className={`p-4 border rounded-lg transition-all ${
      notification.read 
        ? 'bg-gray-50 dark:bg-gray-800 border-gray-200' 
        : 'bg-white dark:bg-gray-700 border-blue-200 shadow-sm'
    }`}>
      <div className="flex items-start space-x-3">
        <Icon className={`h-5 w-5 mt-0.5 ${getIconColor(notification.type)}`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${
                notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'
              }`}>
                {notification.title}
              </h4>
              <p className={`text-sm mt-1 ${
                notification.read ? 'text-gray-500' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {notification.message}
              </p>
              
              <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
                
                {notification.action_url && (
                  <a
                    href={notification.action_url}
                    className="text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    View Details
                  </a>
                )}
              </div>
            </div>

            {!notification.read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-2"></div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1">
          {!notification.read && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onMarkAsRead(notification.id)}
              title="Mark as read"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onArchive(notification.id)}
            title="Archive"
          >
            <Archive className="h-3 w-3" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onDelete(notification.id)}
            title="Delete"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const NotificationBell: React.FC<{ 
  unreadCount: number; 
  onClick: () => void;
  hasNewNotifications: boolean;
}> = ({ unreadCount, onClick, hasNewNotifications }) => {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={onClick}
      className={`relative ${hasNewNotifications ? 'animate-pulse' : ''}`}
    >
      <Bell className={`h-5 w-5 ${hasNewNotifications ? 'text-blue-600' : ''}`} />
      {unreadCount > 0 && (
        <Badge 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          variant="destructive"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onArchive
}) => {
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all');
  const [notificationType, setNotificationType] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');

  const filteredNotifications = notifications.filter(notification => {
    const matchesReadStatus = 
      filterType === 'all' || 
      (filterType === 'unread' && !notification.read) ||
      (filterType === 'read' && notification.read);
    
    const matchesType = 
      notificationType === 'all' || notification.type === notificationType;

    return matchesReadStatus && matchesType;
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="cursor-pointer">
          {/* This will be the notification bell */}
        </div>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} unread</Badge>
              )}
            </div>
            
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
                <Check className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center gap-4 py-4 border-b">
          <div className="flex gap-2">
            <Button 
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button 
              variant={filterType === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('unread')}
            >
              Unread ({notifications.filter(n => !n.read).length})
            </Button>
            <Button 
              variant={filterType === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('read')}
            >
              Read
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <select 
            value={notificationType}
            onChange={(e) => setNotificationType(e.target.value as any)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="all">All Types</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length > 0 ? (
            <div className="space-y-3 p-4">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                  onDelete={onDelete}
                  onArchive={onArchive}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {filterType === 'unread' ? 'No unread notifications' : 'No notifications found'}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const NotificationSystem: React.FC<NotificationSystemProps> = ({ 
  userId, 
  userRole 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);\n  const [unreadCount, setUnreadCount] = useState(0);\n  const [hasNewNotifications, setHasNewNotifications] = useState(false);\n  const [showCenter, setShowCenter] = useState(false);\n\n  // Real-time subscription for new notifications\n  const { data: newNotification } = useSupabaseRealtime(\n    `notifications:user_id=eq.${userId}`\n  );\n\n  // Load notifications on mount\n  useEffect(() => {\n    loadNotifications();\n  }, [userId]);\n\n  // Handle new real-time notifications\n  useEffect(() => {\n    if (newNotification) {\n      setNotifications(prev => [newNotification, ...prev]);\n      setUnreadCount(prev => prev + 1);\n      setHasNewNotifications(true);\n      \n      // Show browser notification if permission is granted\n      if ('Notification' in window && Notification.permission === 'granted') {\n        new Notification(newNotification.title, {\n          body: newNotification.message,\n          icon: '/favicon.ico',\n          tag: newNotification.id\n        });\n      }\n      \n      // Reset animation after 3 seconds\n      setTimeout(() => setHasNewNotifications(false), 3000);\n    }\n  }, [newNotification]);\n\n  const loadNotifications = async () => {\n    try {\n      // This would fetch from your API\n      const mockNotifications: Notification[] = [\n        {\n          id: '1',\n          user_id: userId,\n          type: 'info',\n          title: 'Welcome to the Admin Panel',\n          message: 'You now have access to manage your content and settings.',\n          read: false,\n          created_at: new Date().toISOString()\n        },\n        {\n          id: '2',\n          user_id: userId,\n          type: 'success',\n          title: 'Content Published',\n          message: 'Your blog post \"AI Language Learning Revolution\" has been published successfully.',\n          read: false,\n          action_url: '/blog/ai-language-learning-revolution',\n          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 min ago\n        },\n        {\n          id: '3',\n          user_id: userId,\n          type: 'warning',\n          title: 'Storage Almost Full',\n          message: 'Your media storage is 85% full. Consider upgrading or removing unused files.',\n          read: true,\n          action_url: '/admin/media',\n          created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago\n        },\n        {\n          id: '4',\n          user_id: userId,\n          type: 'error',\n          title: 'Backup Failed',\n          message: 'The scheduled backup failed to complete. Please check your backup settings.',\n          read: true,\n          action_url: '/admin/settings?tab=backup',\n          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago\n        }\n      ];\n      \n      setNotifications(mockNotifications);\n      setUnreadCount(mockNotifications.filter(n => !n.read).length);\n    } catch (error) {\n      console.error('Failed to load notifications:', error);\n    }\n  };\n\n  const handleMarkAsRead = async (id: string) => {\n    try {\n      // Update local state immediately for better UX\n      setNotifications(prev => \n        prev.map(n => n.id === id ? { ...n, read: true } : n)\n      );\n      setUnreadCount(prev => Math.max(0, prev - 1));\n      \n      // API call to mark as read would go here\n      console.log('Marking notification as read:', id);\n    } catch (error) {\n      console.error('Failed to mark notification as read:', error);\n    }\n  };\n\n  const handleMarkAllAsRead = async () => {\n    try {\n      setNotifications(prev => \n        prev.map(n => ({ ...n, read: true }))\n      );\n      setUnreadCount(0);\n      \n      // API call to mark all as read would go here\n      console.log('Marking all notifications as read');\n    } catch (error) {\n      console.error('Failed to mark all notifications as read:', error);\n    }\n  };\n\n  const handleDelete = async (id: string) => {\n    try {\n      const notification = notifications.find(n => n.id === id);\n      \n      setNotifications(prev => prev.filter(n => n.id !== id));\n      if (notification && !notification.read) {\n        setUnreadCount(prev => Math.max(0, prev - 1));\n      }\n      \n      // API call to delete would go here\n      console.log('Deleting notification:', id);\n    } catch (error) {\n      console.error('Failed to delete notification:', error);\n    }\n  };\n\n  const handleArchive = async (id: string) => {\n    try {\n      const notification = notifications.find(n => n.id === id);\n      \n      setNotifications(prev => prev.filter(n => n.id !== id));\n      if (notification && !notification.read) {\n        setUnreadCount(prev => Math.max(0, prev - 1));\n      }\n      \n      // API call to archive would go here\n      console.log('Archiving notification:', id);\n    } catch (error) {\n      console.error('Failed to archive notification:', error);\n    }\n  };\n\n  // Request notification permission on mount\n  useEffect(() => {\n    if ('Notification' in window && Notification.permission === 'default') {\n      Notification.requestPermission();\n    }\n  }, []);\n\n  return (\n    <>\n      {/* Notification Bell - This can be used in the header */}\n      <Dialog open={showCenter} onOpenChange={setShowCenter}>\n        <DialogTrigger asChild>\n          <div>\n            <NotificationBell \n              unreadCount={unreadCount}\n              onClick={() => setShowCenter(true)}\n              hasNewNotifications={hasNewNotifications}\n            />\n          </div>\n        </DialogTrigger>\n        \n        <NotificationCenter\n          notifications={notifications}\n          unreadCount={unreadCount}\n          onMarkAsRead={handleMarkAsRead}\n          onMarkAllAsRead={handleMarkAllAsRead}\n          onDelete={handleDelete}\n          onArchive={handleArchive}\n        />\n      </Dialog>\n\n      {/* Toast notifications for new items */}\n      {hasNewNotifications && (\n        <div className=\"fixed top-4 right-4 z-50 animate-slide-in\">\n          <Card className=\"border-blue-200 bg-blue-50 dark:bg-blue-950\">\n            <CardContent className=\"flex items-center gap-3 p-4\">\n              <Bell className=\"h-5 w-5 text-blue-600\" />\n              <div>\n                <p className=\"font-medium text-blue-800 dark:text-blue-200\">\n                  New Notification\n                </p>\n                <p className=\"text-sm text-blue-700 dark:text-blue-300\">\n                  You have {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}\n                </p>\n              </div>\n            </CardContent>\n          </Card>\n        </div>\n      )}\n    </>\n  );\n};\n\n// Export components separately for flexible usage\nexport { NotificationBell, NotificationCenter };\nexport default NotificationSystem;