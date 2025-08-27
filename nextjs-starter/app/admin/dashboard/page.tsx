'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  FileText, 
  Users, 
  Settings, 
  Plus,
  Eye,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react'

interface ContentItem {
  id: string
  title: string
  excerpt: string | null
  published: boolean
  created_at: string
  updated_at: string
}

interface DashboardStats {
  totalContent: number
  publishedContent: number
  draftContent: number
  totalViews: number
}

export default function AdminDashboard() {
  const { user, error, isLoading } = useUser()
  const [content, setContent] = useState<ContentItem[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalContent: 0,
    publishedContent: 0,
    draftContent: 0,
    totalViews: 0
  })
  const [loadingContent, setLoadingContent] = useState(true)

  useEffect(() => {
    if (user) {
      fetchContent()
    }
  }, [user])

  const fetchContent = async () => {
    try {
      setLoadingContent(true)
      const response = await fetch('/api/content?all=true')
      if (response.ok) {
        const data = await response.json()
        setContent(data.content || [])
        
        // Calculate stats
        const total = data.content?.length || 0
        const published = data.content?.filter((item: ContentItem) => item.published).length || 0
        const draft = total - published
        
        setStats({
          totalContent: total,
          publishedContent: published,
          draftContent: draft,
          totalViews: Math.floor(Math.random() * 10000) // Mock data
        })
      }
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoadingContent(false)
    }
  }

  const deleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return

    try {
      const response = await fetch(`/api/content?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchContent()
      } else {
        alert('Error deleting content')
      }
    } catch (error) {
      console.error('Error deleting content:', error)
      alert('Error deleting content')
    }
  }

  const togglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/content?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ published: !currentStatus })
      })
      
      if (response.ok) {
        await fetchContent()
      } else {
        alert('Error updating content')
      }
    } catch (error) {
      console.error('Error updating content:', error)
      alert('Error updating content')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">There was an error loading your profile.</p>
            <Button asChild>
              <a href="/api/auth/login">Try Again</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto pt-32">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Admin Access Required</CardTitle>
              <CardDescription>
                Please sign in to access the admin dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Button asChild className="w-full">
                <a href="/api/auth/login">Sign In</a>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/">Back to Home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Next.js Starter
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link 
                  href="/admin/dashboard" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/admin/content" 
                  className="text-gray-600 hover:text-gray-800"
                >
                  Content
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user.picture && (
                  <img 
                    src={user.picture} 
                    alt={user.name || 'User'} 
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {user.name || user.email}
                </span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/api/auth/logout">Sign Out</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.name?.split(' ')[0] || 'Admin'}!
          </h1>
          <p className="text-gray-600">
            Manage your content and monitor your site performance.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Content</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalContent}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.draftContent} drafts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.publishedContent}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalContent > 0 ? Math.round((stats.publishedContent / stats.totalContent) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1</div>
              <p className="text-xs text-muted-foreground">
                Admin user
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Content</CardTitle>
                  <CardDescription>
                    Manage your latest articles and pages
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href="/admin/content">
                    <Plus className="w-4 h-4 mr-2" />
                    New Content
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {loadingContent ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : content.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-4">No content yet</p>
                    <Button asChild>
                      <Link href="/admin/content">
                        Create Your First Post
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {content.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900 truncate">
                              {item.title}
                            </h3>
                            <Badge variant={item.published ? "default" : "secondary"}>
                              {item.published ? "Published" : "Draft"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {item.excerpt || "No excerpt available"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Updated {new Date(item.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePublished(item.id, item.published)}
                          >
                            {item.published ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-50" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link href={`/admin/content?edit=${item.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteContent(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {content.length > 5 && (
                      <div className="text-center pt-4">
                        <Button variant="outline" asChild>
                          <Link href="/admin/content">
                            View All Content
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" asChild>
                  <Link href="/admin/content">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Post
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/" target="_blank">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Site
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings (Coming Soon)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics (Coming Soon)
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Supabase</span>
                  <Badge className="bg-green-100 text-green-800">Connected</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Auth0</span>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Deployment</span>
                  <Badge className="bg-green-100 text-green-800">Live</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}