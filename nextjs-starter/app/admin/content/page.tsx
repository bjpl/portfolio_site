'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  Search,
  Filter
} from 'lucide-react'

interface ContentItem {
  id: string
  title: string
  content: string
  excerpt: string | null
  featured_image: string | null
  published: boolean
  created_at: string
  updated_at: string
}

interface ContentForm {
  title: string
  content: string
  excerpt: string
  featured_image: string
  published: boolean
}

export default function ContentManagement() {
  const { user, isLoading } = useUser()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  
  const [content, setContent] = useState<ContentItem[]>([])
  const [loadingContent, setLoadingContent] = useState(true)
  const [showForm, setShowForm] = useState(!!editId)
  const [formData, setFormData] = useState<ContentForm>({
    title: '',
    content: '',
    excerpt: '',
    featured_image: '',
    published: false
  })
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>('all')

  useEffect(() => {
    if (user) {
      fetchContent()
    }
  }, [user])

  useEffect(() => {
    if (editId && content.length > 0) {
      const itemToEdit = content.find(item => item.id === editId)
      if (itemToEdit) {
        setFormData({
          title: itemToEdit.title,
          content: itemToEdit.content,
          excerpt: itemToEdit.excerpt || '',
          featured_image: itemToEdit.featured_image || '',
          published: itemToEdit.published
        })
        setShowForm(true)
      }
    }
  }, [editId, content])

  const fetchContent = async () => {
    try {
      setLoadingContent(true)
      const response = await fetch('/api/content?all=true')
      if (response.ok) {
        const data = await response.json()
        setContent(data.content || [])
      }
    } catch (error) {
      console.error('Error fetching content:', error)
    } finally {
      setLoadingContent(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = editId ? `/api/content?id=${editId}` : '/api/content'
      const method = editId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchContent()
        setShowForm(false)
        setFormData({
          title: '',
          content: '',
          excerpt: '',
          featured_image: '',
          published: false
        })
        // Update URL to remove edit parameter
        window.history.replaceState({}, '', '/admin/content')
      } else {
        alert('Error saving content')
      }
    } catch (error) {
      console.error('Error saving content:', error)
      alert('Error saving content')
    } finally {
      setSaving(false)
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
      }
    } catch (error) {
      console.error('Error updating content:', error)
    }
  }

  // Filter content based on search and status
  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.excerpt && item.excerpt.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesFilter = filterPublished === 'all' ||
                         (filterPublished === 'published' && item.published) ||
                         (filterPublished === 'draft' && !item.published)

    return matchesSearch && matchesFilter
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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
                Please sign in to access content management
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
                  className="text-gray-600 hover:text-gray-800"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/admin/content" 
                  className="text-blue-600 hover:text-blue-800 font-medium"
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
        {showForm ? (
          // Content Form
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({
                      title: '',
                      content: '',
                      excerpt: '',
                      featured_image: '',
                      published: false
                    })
                    window.history.replaceState({}, '', '/admin/content')
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Content
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">
                  {editId ? 'Edit Content' : 'Create New Content'}
                </h1>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter content title"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="Brief description or excerpt"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="featured_image">Featured Image URL</Label>
                    <Input
                      id="featured_image"
                      type="url"
                      value={formData.featured_image}
                      onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Write your content here..."
                      rows={12}
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="published"
                      checked={formData.published}
                      onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                    />
                    <Label htmlFor="published">Publish immediately</Label>
                  </div>

                  <div className="flex space-x-4">
                    <Button type="submit" disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowForm(false)
                        window.history.replaceState({}, '', '/admin/content')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Content List
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Content Management
                </h1>
                <p className="text-gray-600">
                  Create and manage your articles and pages
                </p>
              </div>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Content
              </Button>
            </div>

            {/* Search and Filter */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                      value={filterPublished}
                      onChange={(e) => setFilterPublished(e.target.value as 'all' | 'published' | 'draft')}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="all">All Content</option>
                      <option value="published">Published Only</option>
                      <option value="draft">Drafts Only</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content List */}
            <Card>
              <CardHeader>
                <CardTitle>All Content ({filteredContent.length})</CardTitle>
                <CardDescription>
                  Manage your articles and pages
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingContent ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 border rounded-lg">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredContent.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      {searchQuery || filterPublished !== 'all' ? (
                        <>
                          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-gray-600 mb-2">No content matches your search</p>
                          <p className="text-sm text-gray-500">
                            Try adjusting your search terms or filters
                          </p>
                        </>
                      ) : (
                        <>
                          <Plus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                          <p className="text-gray-600 mb-4">No content yet</p>
                          <Button onClick={() => setShowForm(true)}>
                            Create Your First Post
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredContent.map((item) => (
                      <div key={item.id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-gray-900 text-lg">
                                {item.title}
                              </h3>
                              <Badge variant={item.published ? "default" : "secondary"}>
                                {item.published ? "Published" : "Draft"}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-2 line-clamp-2">
                              {item.excerpt || "No excerpt available"}
                            </p>
                            <div className="flex items-center text-sm text-gray-500 space-x-4">
                              <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                              <span>Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePublished(item.id, item.published)}
                              title={item.published ? "Unpublish" : "Publish"}
                            >
                              <Eye className={`w-4 h-4 ${item.published ? '' : 'opacity-50'}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                window.history.replaceState({}, '', `/admin/content?edit=${item.id}`)
                                const itemToEdit = content.find(c => c.id === item.id)
                                if (itemToEdit) {
                                  setFormData({
                                    title: itemToEdit.title,
                                    content: itemToEdit.content,
                                    excerpt: itemToEdit.excerpt || '',
                                    featured_image: itemToEdit.featured_image || '',
                                    published: itemToEdit.published
                                  })
                                  setShowForm(true)
                                }
                              }}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteContent(item.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}