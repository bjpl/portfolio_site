import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Globe, 
  Shield, 
  Database, 
  Mail, 
  Palette,
  Bell,
  Save,
  RotateCcw,
  Upload,
  Download,
  Key,
  Server,
  Zap,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface AdminSettingsProps {
  userRole: 'admin' | 'editor' | 'viewer';
}

interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
}

interface SecuritySettings {
  twoFactorAuth: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  requireSpecialChars: boolean;
  apiRateLimit: number;
  enableCors: boolean;
  allowedOrigins: string[];
}

interface ContentSettings {
  autoSave: boolean;
  autoSaveInterval: number;
  versionsToKeep: number;
  maxUploadSize: number;
  allowedFileTypes: string[];
  enableComments: boolean;
  moderateComments: boolean;
  enableSEO: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  newContentNotification: boolean;
  commentNotification: boolean;
  systemAlerts: boolean;
  webhookUrl: string;
  slackIntegration: boolean;
  discordIntegration: boolean;
}

interface BackupSettings {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  retentionPeriod: number;
  includeMedia: boolean;
  backupLocation: 'local' | 's3' | 'gdrive';
  encryptBackups: boolean;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    siteName: 'My Portfolio',
    siteDescription: 'A modern portfolio website showcasing my work and expertise',
    siteUrl: 'https://myportfolio.com',
    adminEmail: 'admin@myportfolio.com',
    timezone: 'UTC',
    language: 'en',
    maintenanceMode: false,
    registrationEnabled: false
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorAuth: false,
    sessionTimeout: 3600,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireSpecialChars: true,
    apiRateLimit: 100,
    enableCors: true,
    allowedOrigins: ['https://myportfolio.com']
  });

  const [contentSettings, setContentSettings] = useState<ContentSettings>({
    autoSave: true,
    autoSaveInterval: 30,
    versionsToKeep: 10,
    maxUploadSize: 10,
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    enableComments: true,
    moderateComments: true,
    enableSEO: true
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    newContentNotification: true,
    commentNotification: true,
    systemAlerts: true,
    webhookUrl: '',
    slackIntegration: false,
    discordIntegration: false
  });

  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    autoBackup: true,
    backupFrequency: 'daily',
    retentionPeriod: 30,
    includeMedia: true,
    backupLocation: 'local',
    encryptBackups: true
  });

  const canModifySettings = userRole === 'admin';

  useEffect(() => {
    // Load settings from API
    // This would fetch current settings from your backend
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const allSettings = {
        general: generalSettings,
        security: securitySettings,
        content: contentSettings,
        notifications: notificationSettings,
        backup: backupSettings
      };

      // Save settings to API
      console.log('Saving settings:', allSettings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      // Reset to default values
      setHasChanges(true);
    }
  };

  const handleExportSettings = () => {
    const allSettings = {
      general: generalSettings,
      security: { ...securitySettings, allowedOrigins: securitySettings.allowedOrigins },
      content: contentSettings,
      notifications: notificationSettings,
      backup: backupSettings,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(allSettings, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const settings = JSON.parse(e.target?.result as string);
          
          if (settings.general) setGeneralSettings(settings.general);
          if (settings.security) setSecuritySettings(settings.security);
          if (settings.content) setContentSettings(settings.content);
          if (settings.notifications) setNotificationSettings(settings.notifications);
          if (settings.backup) setBackupSettings(settings.backup);
          
          setHasChanges(true);
        } catch (error) {
          alert('Invalid settings file');
        }
      };
      reader.readAsText(file);
    }
  };

  if (!canModifySettings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to modify system settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Admin Settings
          </h2>
          <p className="text-muted-foreground">
            Configure your application settings and preferences
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportSettings}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <label className="cursor-pointer">
            <Button variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="hidden"
            />
          </label>
          
          <Button variant="outline" onClick={handleResetSettings}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button onClick={handleSaveSettings} disabled={!hasChanges || saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Backup
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Site Information
              </CardTitle>
              <CardDescription>
                Basic information about your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={generalSettings.siteName}
                    onChange={(e) => {
                      setGeneralSettings(prev => ({ ...prev, siteName: e.target.value }));
                      setHasChanges(true);
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="siteUrl">Site URL</Label>
                  <Input
                    id="siteUrl"
                    value={generalSettings.siteUrl}
                    onChange={(e) => {
                      setGeneralSettings(prev => ({ ...prev, siteUrl: e.target.value }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={generalSettings.siteDescription}
                  onChange={(e) => {
                    setGeneralSettings(prev => ({ ...prev, siteDescription: e.target.value }));
                    setHasChanges(true);
                  }}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={generalSettings.adminEmail}
                    onChange={(e) => {
                      setGeneralSettings(prev => ({ ...prev, adminEmail: e.target.value }));
                      setHasChanges(true);
                    }}
                  />
                </div>
                
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={generalSettings.timezone} 
                    onValueChange={(value) => {
                      setGeneralSettings(prev => ({ ...prev, timezone: value }));
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">System Options</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable public access to your site
                    </p>
                  </div>
                  <Switch
                    checked={generalSettings.maintenanceMode}
                    onCheckedChange={(checked) => {
                      setGeneralSettings(prev => ({ ...prev, maintenanceMode: checked }));
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>User Registration</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow new users to register accounts
                    </p>
                  </div>
                  <Switch
                    checked={generalSettings.registrationEnabled}
                    onCheckedChange={(checked) => {
                      setGeneralSettings(prev => ({ ...prev, registrationEnabled: checked }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Authentication & Security
              </CardTitle>
              <CardDescription>
                Configure security settings and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all admin accounts
                  </p>
                </div>
                <Switch
                  checked={securitySettings.twoFactorAuth}
                  onCheckedChange={(checked) => {
                    setSecuritySettings(prev => ({ ...prev, twoFactorAuth: checked }));
                    setHasChanges(true);
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sessionTimeout">Session Timeout (seconds)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => {
                      setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }));
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => {
                      setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Password Requirements</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="passwordMinLength">Minimum Length</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={securitySettings.passwordMinLength}
                      onChange={(e) => {
                        setSecuritySettings(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) }));
                        setHasChanges(true);
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Special Characters</Label>
                    </div>
                    <Switch
                      checked={securitySettings.requireSpecialChars}
                      onCheckedChange={(checked) => {
                        setSecuritySettings(prev => ({ ...prev, requireSpecialChars: checked }));
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">API Security</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="apiRateLimit">Rate Limit (requests/minute)</Label>
                    <Input
                      id="apiRateLimit"
                      type="number"
                      value={securitySettings.apiRateLimit}
                      onChange={(e) => {
                        setSecuritySettings(prev => ({ ...prev, apiRateLimit: parseInt(e.target.value) }));
                        setHasChanges(true);
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable CORS</Label>
                    </div>
                    <Switch
                      checked={securitySettings.enableCors}
                      onCheckedChange={(checked) => {
                        setSecuritySettings(prev => ({ ...prev, enableCors: checked }));
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </div>

                <div>
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value="sk-1234567890abcdef"
                      readOnly
                      className="font-mono"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline">
                      <Key className="h-4 w-4 mr-2" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Settings */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Content Management
              </CardTitle>
              <CardDescription>
                Configure content creation and management options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-save</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save content while editing
                  </p>
                </div>
                <Switch
                  checked={contentSettings.autoSave}
                  onCheckedChange={(checked) => {
                    setContentSettings(prev => ({ ...prev, autoSave: checked }));
                    setHasChanges(true);
                  }}
                />
              </div>

              {contentSettings.autoSave && (
                <div>
                  <Label htmlFor="autoSaveInterval">Auto-save Interval (seconds)</Label>
                  <Input
                    id="autoSaveInterval"
                    type="number"
                    value={contentSettings.autoSaveInterval}
                    onChange={(e) => {
                      setContentSettings(prev => ({ ...prev, autoSaveInterval: parseInt(e.target.value) }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="versionsToKeep">Versions to Keep</Label>
                  <Input
                    id="versionsToKeep"
                    type="number"
                    value={contentSettings.versionsToKeep}
                    onChange={(e) => {
                      setContentSettings(prev => ({ ...prev, versionsToKeep: parseInt(e.target.value) }));
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="maxUploadSize">Max Upload Size (MB)</Label>
                  <Input
                    id="maxUploadSize"
                    type="number"
                    value={contentSettings.maxUploadSize}
                    onChange={(e) => {
                      setContentSettings(prev => ({ ...prev, maxUploadSize: parseInt(e.target.value) }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>

              <div>
                <Label>Allowed File Types</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {contentSettings.allowedFileTypes.map((type, index) => (
                    <Badge key={index} variant="secondary">
                      .{type}
                      <button 
                        onClick={() => {
                          const newTypes = contentSettings.allowedFileTypes.filter((_, i) => i !== index);
                          setContentSettings(prev => ({ ...prev, allowedFileTypes: newTypes }));
                          setHasChanges(true);
                        }}
                        className="ml-2 text-xs"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Features</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Comments</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow visitors to comment on content
                    </p>
                  </div>
                  <Switch
                    checked={contentSettings.enableComments}
                    onCheckedChange={(checked) => {
                      setContentSettings(prev => ({ ...prev, enableComments: checked }));
                      setHasChanges(true);
                    }}
                  />
                </div>

                {contentSettings.enableComments && (
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Moderate Comments</Label>
                      <p className="text-sm text-muted-foreground">
                        Require approval before comments are published
                      </p>
                    </div>
                    <Switch
                      checked={contentSettings.moderateComments}
                      onCheckedChange={(checked) => {
                        setContentSettings(prev => ({ ...prev, moderateComments: checked }));
                        setHasChanges(true);
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label>SEO Features</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable SEO metadata and optimization tools
                    </p>
                  </div>
                  <Switch
                    checked={contentSettings.enableSEO}
                    onCheckedChange={(checked) => {
                      setContentSettings(prev => ({ ...prev, enableSEO: checked }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-semibold">Email Notifications</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Email Notifications</Label>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => {
                      setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }));
                      setHasChanges(true);
                    }}
                  />
                </div>

                {notificationSettings.emailNotifications && (
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center justify-between">
                      <Label>New Content Published</Label>
                      <Switch
                        checked={notificationSettings.newContentNotification}
                        onCheckedChange={(checked) => {
                          setNotificationSettings(prev => ({ ...prev, newContentNotification: checked }));
                          setHasChanges(true);
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>New Comments</Label>
                      <Switch
                        checked={notificationSettings.commentNotification}
                        onCheckedChange={(checked) => {
                          setNotificationSettings(prev => ({ ...prev, commentNotification: checked }));
                          setHasChanges(true);
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>System Alerts</Label>
                      <Switch
                        checked={notificationSettings.systemAlerts}
                        onCheckedChange={(checked) => {
                          setNotificationSettings(prev => ({ ...prev, systemAlerts: checked }));
                          setHasChanges(true);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Integrations</h4>
                
                <div>
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    value={notificationSettings.webhookUrl}
                    onChange={(e) => {
                      setNotificationSettings(prev => ({ ...prev, webhookUrl: e.target.value }));
                      setHasChanges(true);
                    }}
                    placeholder="https://your-webhook-url.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Receive POST notifications for important events
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Slack Integration</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications to Slack channel
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.slackIntegration}
                    onCheckedChange={(checked) => {
                      setNotificationSettings(prev => ({ ...prev, slackIntegration: checked }));
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Discord Integration</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications to Discord server
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.discordIntegration}
                    onCheckedChange={(checked) => {
                      setNotificationSettings(prev => ({ ...prev, discordIntegration: checked }));
                      setHasChanges(true);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup Settings */}
        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Backup & Recovery
              </CardTitle>
              <CardDescription>
                Configure automatic backups and data recovery options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Automatic Backups</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically backup your data on schedule
                  </p>
                </div>
                <Switch
                  checked={backupSettings.autoBackup}
                  onCheckedChange={(checked) => {
                    setBackupSettings(prev => ({ ...prev, autoBackup: checked }));
                    setHasChanges(true);
                  }}
                />
              </div>

              {backupSettings.autoBackup && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Backup Frequency</Label>
                      <Select 
                        value={backupSettings.backupFrequency} 
                        onValueChange={(value: 'daily' | 'weekly' | 'monthly') => {
                          setBackupSettings(prev => ({ ...prev, backupFrequency: value }));
                          setHasChanges(true);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="retentionPeriod">Retention Period (days)</Label>
                      <Input
                        id="retentionPeriod"
                        type="number"
                        value={backupSettings.retentionPeriod}
                        onChange={(e) => {
                          setBackupSettings(prev => ({ ...prev, retentionPeriod: parseInt(e.target.value) }));
                          setHasChanges(true);
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Backup Location</Label>
                    <Select 
                      value={backupSettings.backupLocation} 
                      onValueChange={(value: 'local' | 's3' | 'gdrive') => {
                        setBackupSettings(prev => ({ ...prev, backupLocation: value }));
                        setHasChanges(true);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local Storage</SelectItem>
                        <SelectItem value="s3">Amazon S3</SelectItem>
                        <SelectItem value="gdrive">Google Drive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Include Media Files</Label>
                      <p className="text-sm text-muted-foreground">
                        Include uploaded images and documents
                      </p>
                    </div>
                    <Switch
                      checked={backupSettings.includeMedia}
                      onCheckedChange={(checked) => {
                        setBackupSettings(prev => ({ ...prev, includeMedia: checked }));
                        setHasChanges(true);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Encrypt Backups</Label>
                      <p className="text-sm text-muted-foreground">
                        Encrypt backup files for security
                      </p>
                    </div>
                    <Switch
                      checked={backupSettings.encryptBackups}
                      onCheckedChange={(checked) => {
                        setBackupSettings(prev => ({ ...prev, encryptBackups: checked }));
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Manual Actions</h4>
                
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Create Backup Now
                  </Button>
                  
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Restore from Backup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Warning Messages */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  Unsaved Changes
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Don't forget to save your changes
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;