'use client'

import { useAuth, useUserProfile } from '@/hooks/use-auth'
import { useState, useEffect } from 'react'

/**
 * Auth Test Component
 * For testing Auth0 integration
 */
export function AuthTest() {
  const { user, isAuthenticated, isLoading, error } = useAuth()
  const { profile } = useUserProfile()
  const [testResult, setTestResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)

  const runAuthTest = async () => {
    setTestLoading(true)
    try {
      const response = await fetch('/api/auth/test')
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({ error: 'Test failed', message: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setTestLoading(false)
    }
  }

  const testProtectedEndpoint = async () => {
    setTestLoading(true)
    try {
      const response = await fetch('/api/protected/example')
      const result = await response.json()
      setTestResult({ protectedEndpoint: result })
    } catch (error) {
      setTestResult({ error: 'Protected endpoint test failed', message: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Auth0 Integration Test</h2>
      
      {/* Auth Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Authentication Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <span className="font-medium">Is Loading:</span>
            <span className={`ml-2 ${isLoading ? 'text-yellow-600' : 'text-green-600'}`}>
              {isLoading ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <span className="font-medium">Is Authenticated:</span>
            <span className={`ml-2 ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
              {isAuthenticated ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <span className="font-medium">Has Error:</span>
            <span className={`ml-2 ${error ? 'text-red-600' : 'text-green-600'}`}>
              {error ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <span className="font-medium">User ID:</span>
            <span className="ml-2 text-gray-700">
              {user?.sub ? user.sub.substring(0, 20) + '...' : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* User Profile */}
      {profile && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">User Profile</h3>
          <div className="bg-gray-50 p-4 rounded">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Name:</span>
                <span className="ml-2">{profile.name || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Email:</span>
                <span className="ml-2">{profile.email || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Nickname:</span>
                <span className="ml-2">{profile.nickname || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Email Verified:</span>
                <span className={`ml-2 ${profile.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                  {profile.emailVerified ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            {profile.picture && (
              <div className="mt-4">
                <span className="font-medium">Profile Picture:</span>
                <img 
                  src={profile.picture} 
                  alt="Profile" 
                  className="ml-2 w-16 h-16 rounded-full inline-block"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Buttons */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Tests</h3>
        <div className="flex space-x-4">
          <button
            onClick={runAuthTest}
            disabled={testLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {testLoading ? 'Testing...' : 'Test Auth Endpoint'}
          </button>
          <button
            onClick={testProtectedEndpoint}
            disabled={testLoading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {testLoading ? 'Testing...' : 'Test Protected Endpoint'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Test Results</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-red-600">Error</h3>
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <pre className="text-red-700">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuthTest