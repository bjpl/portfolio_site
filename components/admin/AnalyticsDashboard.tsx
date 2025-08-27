import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Users, 
  Clock, 
  Globe,
  Smartphone,
  Monitor,
  MousePointer,
  Share,
  Download,
  Calendar,
  Target,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';
import { ContentAnalytics } from '@/types/admin';
import { useSupabaseQuery } from '@/hooks/admin/useSupabaseQuery';

interface AnalyticsDashboardProps {
  userRole: 'admin' | 'editor' | 'viewer';
}

interface AnalyticsData {
  totalViews: number;
  uniqueViews: number;
  averageEngagement: number;
  bounceRate: number;
  topPages: Array<{ page: string; views: number; change: number }>;
  deviceBreakdown: Array<{ device: string; percentage: number; count: number }>;
  trafficSources: Array<{ source: string; percentage: number; count: number }>;
  engagementMetrics: Array<{ date: string; engagement: number; views: number }>;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: any;
  color: string;
  format?: 'number' | 'percentage' | 'duration';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color, 
  format = 'number' 
}) => {
  const formatValue = (val: string | number) => {
    if (format === 'percentage') {
      return `${val}%`;
    }
    if (format === 'duration') {
      return `${val}s`;
    }
    if (format === 'number' && typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const getChangeColor = (change?: number) => {
    if (!change) return '';
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = (change?: number) => {
    if (!change) return null;
    return change > 0 ? TrendingUp : TrendingDown;
  };

  const ChangeIcon = getChangeIcon(change);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-2">{formatValue(value)}</p>
            {change && (
              <div className={`flex items-center mt-1 text-sm ${getChangeColor(change)}`}>
                {ChangeIcon && <ChangeIcon className="h-3 w-3 mr-1" />}
                <span>{Math.abs(change)}% vs last period</span>
              </div>
            )}
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userRole }) => {
  const [dateRange, setDateRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalViews: 12847,
    uniqueViews: 8934,
    averageEngagement: 4.2,
    bounceRate: 34.5,
    topPages: [
      { page: '/portfolio', views: 2847, change: 12.5 },
      { page: '/blog/ai-language-learning', views: 1234, change: -8.2 },
      { page: '/about', views: 987, change: 23.1 },
      { page: '/contact', views: 654, change: 5.7 },
      { page: '/tools', views: 432, change: -12.3 }
    ],
    deviceBreakdown: [
      { device: 'Desktop', percentage: 58, count: 5234 },
      { device: 'Mobile', percentage: 35, count: 3156 },
      { device: 'Tablet', percentage: 7, count: 632 }
    ],
    trafficSources: [
      { source: 'Organic Search', percentage: 42, count: 3789 },
      { source: 'Direct', percentage: 28, count: 2523 },
      { source: 'Social Media', percentage: 18, count: 1623 },
      { source: 'Referral', percentage: 12, count: 1082 }
    ],
    engagementMetrics: [
      { date: '2024-01-15', engagement: 4.2, views: 1200 },
      { date: '2024-01-16', engagement: 3.8, views: 1100 },
      { date: '2024-01-17', engagement: 4.5, views: 1350 },
      { date: '2024-01-18', engagement: 4.1, views: 1250 },
      { date: '2024-01-19', engagement: 4.7, views: 1400 },
      { date: '2024-01-20', engagement: 4.3, views: 1320 },
      { date: '2024-01-21', engagement: 4.6, views: 1380 }
    ]
  });

  const { data: contentAnalytics } = useSupabaseQuery<ContentAnalytics[]>('content_analytics');\n\n  const handleExportData = () => {\n    const dataToExport = {\n      dateRange,\n      exported_at: new Date().toISOString(),\n      metrics: analyticsData\n    };\n\n    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {\n      type: 'application/json'\n    });\n\n    const url = URL.createObjectURL(blob);\n    const a = document.createElement('a');\n    a.href = url;\n    a.download = `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;\n    document.body.appendChild(a);\n    a.click();\n    document.body.removeChild(a);\n    URL.revokeObjectURL(url);\n  };\n\n  const renderChart = (title: string, description: string, children: React.ReactNode) => (\n    <Card>\n      <CardHeader>\n        <CardTitle className=\"flex items-center gap-2\">\n          <LineChart className=\"h-5 w-5\" />\n          {title}\n        </CardTitle>\n        <CardDescription>{description}</CardDescription>\n      </CardHeader>\n      <CardContent>\n        {children}\n      </CardContent>\n    </Card>\n  );\n\n  const renderTopPages = () => (\n    <Card>\n      <CardHeader>\n        <CardTitle className=\"flex items-center gap-2\">\n          <Target className=\"h-5 w-5\" />\n          Top Performing Pages\n        </CardTitle>\n        <CardDescription>Most visited pages in the selected period</CardDescription>\n      </CardHeader>\n      <CardContent>\n        <div className=\"space-y-4\">\n          {analyticsData.topPages.map((page, index) => {\n            const changeColor = page.change > 0 ? 'text-green-600' : 'text-red-600';\n            const ChangeIcon = page.change > 0 ? TrendingUp : TrendingDown;\n            \n            return (\n              <div key={page.page} className=\"flex items-center justify-between p-3 border rounded-lg\">\n                <div className=\"flex items-center space-x-3\">\n                  <div className=\"flex-shrink-0\">\n                    <Badge variant=\"outline\">#{index + 1}</Badge>\n                  </div>\n                  <div>\n                    <p className=\"font-medium\">{page.page}</p>\n                    <p className=\"text-sm text-muted-foreground\">\n                      {page.views.toLocaleString()} views\n                    </p>\n                  </div>\n                </div>\n                <div className={`flex items-center text-sm ${changeColor}`}>\n                  <ChangeIcon className=\"h-3 w-3 mr-1\" />\n                  {Math.abs(page.change)}%\n                </div>\n              </div>\n            );\n          })}\n        </div>\n      </CardContent>\n    </Card>\n  );\n\n  const renderDeviceBreakdown = () => (\n    <Card>\n      <CardHeader>\n        <CardTitle className=\"flex items-center gap-2\">\n          <PieChart className=\"h-5 w-5\" />\n          Device Breakdown\n        </CardTitle>\n        <CardDescription>Visitor device preferences</CardDescription>\n      </CardHeader>\n      <CardContent>\n        <div className=\"space-y-4\">\n          {analyticsData.deviceBreakdown.map((device) => {\n            const Icon = device.device === 'Desktop' ? Monitor : \n                        device.device === 'Mobile' ? Smartphone : \n                        MousePointer;\n            \n            return (\n              <div key={device.device} className=\"flex items-center justify-between\">\n                <div className=\"flex items-center space-x-3\">\n                  <Icon className=\"h-5 w-5 text-muted-foreground\" />\n                  <div>\n                    <p className=\"font-medium\">{device.device}</p>\n                    <p className=\"text-sm text-muted-foreground\">\n                      {device.count.toLocaleString()} users\n                    </p>\n                  </div>\n                </div>\n                <div className=\"text-right\">\n                  <p className=\"font-semibold\">{device.percentage}%</p>\n                  <div className=\"w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1\">\n                    <div \n                      className=\"bg-blue-600 h-2 rounded-full transition-all duration-300\" \n                      style={{ width: `${device.percentage}%` }}\n                    />\n                  </div>\n                </div>\n              </div>\n            );\n          })}\n        </div>\n      </CardContent>\n    </Card>\n  );\n\n  const renderTrafficSources = () => (\n    <Card>\n      <CardHeader>\n        <CardTitle className=\"flex items-center gap-2\">\n          <Globe className=\"h-5 w-5\" />\n          Traffic Sources\n        </CardTitle>\n        <CardDescription>Where your visitors come from</CardDescription>\n      </CardHeader>\n      <CardContent>\n        <div className=\"space-y-4\">\n          {analyticsData.trafficSources.map((source, index) => {\n            const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];\n            \n            return (\n              <div key={source.source} className=\"flex items-center justify-between\">\n                <div className=\"flex items-center space-x-3\">\n                  <div className={`w-3 h-3 rounded-full ${colors[index]}`} />\n                  <div>\n                    <p className=\"font-medium\">{source.source}</p>\n                    <p className=\"text-sm text-muted-foreground\">\n                      {source.count.toLocaleString()} visitors\n                    </p>\n                  </div>\n                </div>\n                <div className=\"text-right\">\n                  <p className=\"font-semibold\">{source.percentage}%</p>\n                </div>\n              </div>\n            );\n          })}\n        </div>\n      </CardContent>\n    </Card>\n  );\n\n  const renderEngagementChart = () => (\n    renderChart(\n      \"Engagement Over Time\",\n      \"Average time spent on pages and view trends\",\n      <div className=\"space-y-4\">\n        {/* Placeholder for actual chart component */}\n        <div className=\"h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed\">\n          <div className=\"text-center\">\n            <LineChart className=\"h-12 w-12 mx-auto text-muted-foreground mb-2\" />\n            <p className=\"text-muted-foreground\">Engagement Chart</p>\n            <p className=\"text-xs text-muted-foreground mt-1\">Integration with Chart.js or similar</p>\n          </div>\n        </div>\n        \n        {/* Summary metrics */}\n        <div className=\"grid grid-cols-2 gap-4 mt-4\">\n          <div className=\"text-center\">\n            <p className=\"text-2xl font-bold text-green-600\">4.3s</p>\n            <p className=\"text-sm text-muted-foreground\">Avg. Engagement</p>\n          </div>\n          <div className=\"text-center\">\n            <p className=\"text-2xl font-bold text-blue-600\">1,286</p>\n            <p className=\"text-sm text-muted-foreground\">Avg. Daily Views</p>\n          </div>\n        </div>\n      </div>\n    )\n  );\n\n  return (\n    <div className=\"space-y-6\">\n      {/* Header */}\n      <div className=\"flex justify-between items-center\">\n        <div>\n          <h2 className=\"text-2xl font-bold flex items-center gap-2\">\n            <BarChart3 className=\"h-6 w-6\" />\n            Analytics Dashboard\n          </h2>\n          <p className=\"text-muted-foreground\">\n            Track your content performance and visitor engagement\n          </p>\n        </div>\n        \n        <div className=\"flex items-center gap-4\">\n          <Select value={dateRange} onValueChange={setDateRange}>\n            <SelectTrigger className=\"w-[180px]\">\n              <SelectValue />\n            </SelectTrigger>\n            <SelectContent>\n              <SelectItem value=\"24h\">Last 24 hours</SelectItem>\n              <SelectItem value=\"7d\">Last 7 days</SelectItem>\n              <SelectItem value=\"30d\">Last 30 days</SelectItem>\n              <SelectItem value=\"90d\">Last 90 days</SelectItem>\n              <SelectItem value=\"1y\">Last year</SelectItem>\n            </SelectContent>\n          </Select>\n          \n          <Button variant=\"outline\" onClick={handleExportData}>\n            <Download className=\"h-4 w-4 mr-2\" />\n            Export Data\n          </Button>\n        </div>\n      </div>\n\n      {/* Key Metrics */}\n      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6\">\n        <MetricCard\n          title=\"Total Page Views\"\n          value={analyticsData.totalViews}\n          change={8.2}\n          icon={Eye}\n          color=\"text-blue-600\"\n        />\n        \n        <MetricCard\n          title=\"Unique Visitors\"\n          value={analyticsData.uniqueViews}\n          change={12.1}\n          icon={Users}\n          color=\"text-green-600\"\n        />\n        \n        <MetricCard\n          title=\"Avg. Engagement\"\n          value={analyticsData.averageEngagement}\n          change={-2.3}\n          icon={Clock}\n          color=\"text-purple-600\"\n          format=\"duration\"\n        />\n        \n        <MetricCard\n          title=\"Bounce Rate\"\n          value={analyticsData.bounceRate}\n          change={-5.7}\n          icon={Activity}\n          color=\"text-orange-600\"\n          format=\"percentage\"\n        />\n      </div>\n\n      <Tabs defaultValue=\"overview\" className=\"space-y-6\">\n        <TabsList className=\"grid w-full grid-cols-4\">\n          <TabsTrigger value=\"overview\">Overview</TabsTrigger>\n          <TabsTrigger value=\"content\">Content Performance</TabsTrigger>\n          <TabsTrigger value=\"audience\">Audience Insights</TabsTrigger>\n          <TabsTrigger value=\"traffic\">Traffic Sources</TabsTrigger>\n        </TabsList>\n\n        {/* Overview Tab */}\n        <TabsContent value=\"overview\" className=\"space-y-6\">\n          <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">\n            {renderEngagementChart()}\n            {renderTopPages()}\n          </div>\n        </TabsContent>\n\n        {/* Content Performance Tab */}\n        <TabsContent value=\"content\" className=\"space-y-6\">\n          <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">\n            {renderTopPages()}\n            \n            <Card>\n              <CardHeader>\n                <CardTitle className=\"flex items-center gap-2\">\n                  <Share className=\"h-5 w-5\" />\n                  Social Engagement\n                </CardTitle>\n                <CardDescription>Social media shares and interactions</CardDescription>\n              </CardHeader>\n              <CardContent>\n                <div className=\"space-y-4\">\n                  <div className=\"flex items-center justify-between\">\n                    <div>\n                      <p className=\"font-medium\">Total Shares</p>\n                      <p className=\"text-sm text-muted-foreground\">Across all platforms</p>\n                    </div>\n                    <p className=\"text-2xl font-bold\">1,247</p>\n                  </div>\n                  \n                  <div className=\"space-y-2\">\n                    {[\n                      { platform: 'Twitter', shares: 654, color: 'bg-blue-500' },\n                      { platform: 'LinkedIn', shares: 342, color: 'bg-blue-700' },\n                      { platform: 'Facebook', shares: 251, color: 'bg-blue-600' }\n                    ].map(item => (\n                      <div key={item.platform} className=\"flex items-center justify-between\">\n                        <div className=\"flex items-center space-x-2\">\n                          <div className={`w-3 h-3 rounded-full ${item.color}`} />\n                          <span className=\"text-sm\">{item.platform}</span>\n                        </div>\n                        <span className=\"text-sm font-medium\">{item.shares}</span>\n                      </div>\n                    ))}\n                  </div>\n                </div>\n              </CardContent>\n            </Card>\n          </div>\n        </TabsContent>\n\n        {/* Audience Tab */}\n        <TabsContent value=\"audience\" className=\"space-y-6\">\n          <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">\n            {renderDeviceBreakdown()}\n            \n            <Card>\n              <CardHeader>\n                <CardTitle className=\"flex items-center gap-2\">\n                  <Globe className=\"h-5 w-5\" />\n                  Geographic Distribution\n                </CardTitle>\n                <CardDescription>Where your visitors are located</CardDescription>\n              </CardHeader>\n              <CardContent>\n                <div className=\"space-y-4\">\n                  {[\n                    { country: 'United States', percentage: 35, visitors: 3156 },\n                    { country: 'United Kingdom', percentage: 18, visitors: 1623 },\n                    { country: 'Canada', percentage: 12, visitors: 1082 },\n                    { country: 'Germany', percentage: 8, visitors: 721 },\n                    { country: 'Other', percentage: 27, visitors: 2435 }\n                  ].map(item => (\n                    <div key={item.country} className=\"flex items-center justify-between\">\n                      <div>\n                        <p className=\"font-medium\">{item.country}</p>\n                        <p className=\"text-sm text-muted-foreground\">\n                          {item.visitors.toLocaleString()} visitors\n                        </p>\n                      </div>\n                      <div className=\"text-right\">\n                        <p className=\"font-semibold\">{item.percentage}%</p>\n                      </div>\n                    </div>\n                  ))}\n                </div>\n              </CardContent>\n            </Card>\n          </div>\n        </TabsContent>\n\n        {/* Traffic Sources Tab */}\n        <TabsContent value=\"traffic\" className=\"space-y-6\">\n          <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">\n            {renderTrafficSources()}\n            \n            <Card>\n              <CardHeader>\n                <CardTitle className=\"flex items-center gap-2\">\n                  <Calendar className=\"h-5 w-5\" />\n                  Traffic Trends\n                </CardTitle>\n                <CardDescription>Daily visitor patterns</CardDescription>\n              </CardHeader>\n              <CardContent>\n                <div className=\"h-64 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed\">\n                  <div className=\"text-center\">\n                    <BarChart3 className=\"h-12 w-12 mx-auto text-muted-foreground mb-2\" />\n                    <p className=\"text-muted-foreground\">Traffic Trends Chart</p>\n                    <p className=\"text-xs text-muted-foreground mt-1\">Daily/Weekly patterns</p>\n                  </div>\n                </div>\n              </CardContent>\n            </Card>\n          </div>\n        </TabsContent>\n      </Tabs>\n\n      {/* Real-time Activity (if admin) */}\n      {userRole === 'admin' && (\n        <Card>\n          <CardHeader>\n            <CardTitle className=\"flex items-center gap-2\">\n              <Activity className=\"h-5 w-5\" />\n              Real-time Activity\n            </CardTitle>\n            <CardDescription>\n              Live visitor activity and recent events\n            </CardDescription>\n          </CardHeader>\n          <CardContent>\n            <div className=\"space-y-4\">\n              {[\n                { time: '2 minutes ago', event: 'New visitor from United States viewing /portfolio', type: 'visitor' },\n                { time: '5 minutes ago', event: 'Blog post \"AI Language Learning\" shared on Twitter', type: 'social' },\n                { time: '8 minutes ago', event: 'Contact form submission received', type: 'conversion' },\n                { time: '12 minutes ago', event: 'User spent 4.2 minutes reading /blog/vr-immersion', type: 'engagement' }\n              ].map((activity, index) => (\n                <div key={index} className=\"flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg\">\n                  <div className={`w-2 h-2 rounded-full mt-2 ${\n                    activity.type === 'visitor' ? 'bg-blue-500' :\n                    activity.type === 'social' ? 'bg-green-500' :\n                    activity.type === 'conversion' ? 'bg-purple-500' :\n                    'bg-orange-500'\n                  }`} />\n                  <div className=\"flex-1\">\n                    <p className=\"text-sm\">{activity.event}</p>\n                    <p className=\"text-xs text-muted-foreground\">{activity.time}</p>\n                  </div>\n                </div>\n              ))}\n            </div>\n          </CardContent>\n        </Card>\n      )}\n    </div>\n  );\n};\n\nexport default AnalyticsDashboard;