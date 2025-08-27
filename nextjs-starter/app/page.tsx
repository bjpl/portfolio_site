import { Suspense } from 'react'
import Link from 'next/link'
import { contentService } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ContentItem {
  id: string
  title: string
  excerpt: string | null
  slug: string
  featured_image: string | null
  created_at: string
}

async function PublicContent() {
  const { data: content, error } = await contentService.getPublicContent()

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading content: {error.message}</p>
      </div>
    )
  }

  if (!content || content.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">No published content available yet.</p>
        <p className="text-sm text-gray-500">
          Check back later or{' '}
          <Link href="/admin/dashboard" className="text-blue-600 hover:underline">
            sign in as admin
          </Link>{' '}
          to create content.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {content.map((item: ContentItem) => (
        <Card key={item.id} className="hover:shadow-lg transition-shadow">
          {item.featured_image && (
            <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
              <img
                src={item.featured_image}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <CardTitle className="line-clamp-2">{item.title}</CardTitle>
            <CardDescription>
              {new Date(item.created_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          {item.excerpt && (
            <CardContent>
              <p className="text-sm text-gray-600 line-clamp-3">{item.excerpt}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
          <CardHeader>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              <div className="h-3 bg-gray-200 rounded w-4/6"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Next.js Starter
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard">
                <Button variant="outline" size="sm">
                  Admin Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Next.js + Supabase + Auth0 Starter
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A complete starter template with authentication, database integration, 
            and content management. Built with modern tools and best practices.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/admin/dashboard">
              <Button size="lg">
                Get Started
              </Button>
            </Link>
            <Button variant="outline" size="lg" asChild>
              <a 
                href="https://github.com/your-repo" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Latest Content
            </h2>
            <p className="text-lg text-gray-600">
              Explore our published articles and updates
            </p>
          </div>
          
          <Suspense fallback={<LoadingSkeleton />}>
            <PublicContent />
          </Suspense>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600">
              Built with Next.js, Supabase, and Auth0
            </p>
            <div className="mt-4 flex justify-center space-x-6">
              <a href="#" className="text-gray-400 hover:text-gray-600">
                Documentation
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600">
                GitHub
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}