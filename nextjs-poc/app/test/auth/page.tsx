import AuthTest from '@/components/auth/AuthTest'

export default function AuthTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <AuthTest />
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Auth0 Integration Test',
  description: 'Test page for Auth0 authentication integration'
}