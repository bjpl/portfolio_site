import React, { useState, useEffect, useCallback } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Typography,
  Box,
  Button,
  Chip,
  Divider,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Avatar,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Notifications,
  NotificationsNone,
  Circle,
  CheckCircle,
  Warning,
  Error,
  Info,
  Settings,
  Close,
  Delete,
  MarkEmailRead,
  Schedule,
  Person,
  Article,
  Security,
  Analytics,
  System,
  Clear,
} from '@mui/icons-material';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'system';
  category: 'user' | 'content' | 'system' | 'security' | 'analytics' | 'workflow';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
  userId?: string;
  metadata?: any;
}

interface NotificationSettings {
  emailEnabled: boolean;
  browserEnabled: boolean;
  soundEnabled: boolean;
  categories: {
    user: boolean;
    content: boolean;
    system: boolean;
    security: boolean;
    analytics: boolean;
    workflow: boolean;
  };
  priority: {
    low: boolean;
    medium: boolean;
    high: boolean;
    urgent: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const StyledMenu = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    width: 400,
    maxHeight: 600,
    marginTop: theme.spacing(1),
  },
}));

const NotificationItem = styled(ListItem)<{ priority: string; read: boolean }>(({ theme, priority, read }) => ({
  borderLeft: `4px solid ${
    priority === 'urgent' ? theme.palette.error.main :
    priority === 'high' ? theme.palette.warning.main :
    priority === 'medium' ? theme.palette.info.main :
    theme.palette.success.main
  }`,
  backgroundColor: read ? 'transparent' : theme.palette.action.hover,
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
  opacity: read ? 0.7 : 1,
  marginBottom: theme.spacing(0.5),
  borderRadius: theme.spacing(0.5),
}));

const CategoryIcon = styled(Avatar)<{ category: string }>(({ theme, category }) => ({
  width: 32,
  height: 32,
  backgroundColor:
    category === 'user' ? theme.palette.primary.main :
    category === 'content' ? theme.palette.secondary.main :
    category === 'system' ? theme.palette.info.main :
    category === 'security' ? theme.palette.error.main :
    category === 'analytics' ? theme.palette.success.main :
    theme.palette.warning.main,
}));

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    browserEnabled: true,
    soundEnabled: false,
    categories: {
      user: true,
      content: true,
      system: true,
      security: true,
      analytics: true,
      workflow: true,
    },
    priority: {
      low: true,
      medium: true,
      high: true,
      urgent: true,
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  });
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'priority'>('all');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    loadNotifications();
    loadSettings();
    setupWebSocket();
    requestNotificationPermission();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const setupWebSocket = () => {
    const websocket = new WebSocket(`${process.env.REACT_APP_WS_URL}/notifications`);
    
    websocket.onopen = () => {
      console.log('Notifications WebSocket connected');
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      addNotification(notification);
    };

    websocket.onclose = () => {
      console.log('Notifications WebSocket disconnected, attempting to reconnect...');
      setTimeout(setupWebSocket, 3000);
    };

    websocket.onerror = (error) => {
      console.error('Notifications WebSocket error:', error);
    };
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const result = await response.json();
      
      if (result.success) {
        setNotifications(result.data.map((notification: any) => ({
          ...notification,
          timestamp: new Date(notification.timestamp),
        })));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings');
      const result = await response.json();
      
      if (result.success) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        setSettingsOpen(false);
      }
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  const addNotification = useCallback((notification: Notification) => {
    const newNotification = {
      ...notification,
      timestamp: new Date(notification.timestamp),
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Show browser notification if enabled
    if (settings.browserEnabled && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
      });
      
      browserNotification.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotification.close();
      };
      
      setTimeout(() => browserNotification.close(), 5000);
    }
    
    // Play sound if enabled
    if (settings.soundEnabled && notification.priority === 'urgent') {
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(console.error);
    }
  }, [settings.browserEnabled, settings.soundEnabled]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!confirm('Are you sure you want to clear all notifications?')) return;
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return <Error fontSize="small" />;
      case 'warning': return <Warning fontSize="small" />;
      case 'success': return <CheckCircle fontSize="small" />;
      case 'info': return <Info fontSize="small" />;
      default: return <Circle fontSize="small" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'user': return <Person fontSize="small" />;
      case 'content': return <Article fontSize="small" />;
      case 'system': return <System fontSize="small" />;
      case 'security': return <Security fontSize="small" />;
      case 'analytics': return <Analytics fontSize="small" />;
      case 'workflow': return <Schedule fontSize="small" />;
      default: return <Info fontSize="small" />;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'priority':
        return notification.priority === 'urgent' || notification.priority === 'high';
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <IconButton
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          {unreadCount > 0 ? <Notifications /> : <NotificationsNone />}
        </Badge>
      </IconButton>

      <StyledMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Notifications</Typography>
          <Box display="flex" gap={1}>
            <IconButton size="small" onClick={() => setSettingsOpen(true)}>
              <Settings fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setAnchorEl(null)}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Divider />

        {/* Filters */}
        <Box p={2} display="flex" gap={1}>
          <Chip
            label="All"
            variant={filter === 'all' ? 'filled' : 'outlined'}
            size="small"
            onClick={() => setFilter('all')}
          />
          <Chip
            label="Unread"
            variant={filter === 'unread' ? 'filled' : 'outlined'}
            size="small"
            onClick={() => setFilter('unread')}
            color="primary"
          />
          <Chip
            label="Priority"
            variant={filter === 'priority' ? 'filled' : 'outlined'}
            size="small"
            onClick={() => setFilter('priority')}
            color="error"
          />
        </Box>

        <Divider />

        {/* Actions */}
        {notifications.length > 0 && (
          <>
            <Box p={1} display="flex" gap={1}>
              <Button
                size="small"
                startIcon={<MarkEmailRead />}
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                Mark all read
              </Button>
              <Button
                size="small"
                startIcon={<Clear />}
                onClick={clearAllNotifications}
                color="error"
              >
                Clear all
              </Button>
            </Box>
            <Divider />
          </>
        )}

        {/* Notifications List */}
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {filteredNotifications.length === 0 ? (
            <Box p={3} textAlign="center">
              <NotificationsNone sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredNotifications.slice(0, 20).map((notification) => (
                <NotificationItem
                  key={notification.id}
                  priority={notification.priority}
                  read={notification.read}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    if (notification.actionUrl) {
                      window.open(notification.actionUrl, '_blank');
                    }
                  }}
                >
                  <ListItemIcon>
                    <CategoryIcon category={notification.category}>
                      {getCategoryIcon(notification.category)}
                    </CategoryIcon>
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="subtitle2" noWrap>
                          {notification.title}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {getIcon(notification.type)}
                          {!notification.read && (
                            <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                          )}
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {notification.timestamp.toLocaleString()}
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </NotificationItem>
              ))}
            </List>
          )}
        </Box>

        {filteredNotifications.length > 20 && (
          <>
            <Divider />
            <Box p={2} textAlign="center">
              <Button size="small" onClick={() => window.open('/admin/notifications', '_blank')}>
                View all notifications
              </Button>
            </Box>
          </>
        )}
      </StyledMenu>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Notification Settings</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} mt={2}>
            {/* General Settings */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                General Settings
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailEnabled}
                    onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                  />
                }
                label="Email notifications"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.browserEnabled}
                    onChange={(e) => setSettings({ ...settings, browserEnabled: e.target.checked })}
                  />
                }
                label="Browser notifications"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.soundEnabled}
                    onChange={(e) => setSettings({ ...settings, soundEnabled: e.target.checked })}
                  />
                }
                label="Sound alerts"
              />
            </Paper>

            {/* Categories */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Categories
              </Typography>
              
              {Object.entries(settings.categories).map(([category, enabled]) => (
                <FormControlLabel
                  key={category}
                  control={
                    <Switch
                      checked={enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        categories: { ...settings.categories, [category]: e.target.checked }
                      })}
                    />
                  }
                  label={category.charAt(0).toUpperCase() + category.slice(1)}
                />
              ))}
            </Paper>

            {/* Priority Levels */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Priority Levels
              </Typography>
              
              {Object.entries(settings.priority).map(([priority, enabled]) => (
                <FormControlLabel
                  key={priority}
                  control={
                    <Switch
                      checked={enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        priority: { ...settings.priority, [priority]: e.target.checked }
                      })}
                    />
                  }
                  label={priority.charAt(0).toUpperCase() + priority.slice(1)}
                />
              ))}
            </Paper>

            {/* Quiet Hours */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Quiet Hours
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.quietHours.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      quietHours: { ...settings.quietHours, enabled: e.target.checked }
                    })}
                  />
                }
                label="Enable quiet hours"
              />
              
              {settings.quietHours.enabled && (
                <Box display="flex" gap={2} mt={2}>
                  <TextField
                    type="time"
                    label="Start time"
                    value={settings.quietHours.start}
                    onChange={(e) => setSettings({
                      ...settings,
                      quietHours: { ...settings.quietHours, start: e.target.value }
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                  
                  <TextField
                    type="time"
                    label="End time"
                    value={settings.quietHours.end}
                    onChange={(e) => setSettings({
                      ...settings,
                      quietHours: { ...settings.quietHours, end: e.target.value }
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              )}
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveSettings}>
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotificationCenter;