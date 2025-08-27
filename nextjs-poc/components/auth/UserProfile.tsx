'use client'

import { useUserProfile } from '@/hooks/use-auth'
import Image from 'next/image'

interface UserProfileProps {
  className?: string
  showEmail?: boolean
  showPicture?: boolean
  compact?: boolean
}

/**
 * User Profile Component
 * Displays authenticated user information
 */
export function UserProfile({ 
  className = "",
  showEmail = true,
  showPicture = true,
  compact = false
}: UserProfileProps) {
  const { profile, isLoading } = useUserProfile()

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-center space-x-3">
          {showPicture && (
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
          )}
          <div className="space-y-1">
            <div className="h-4 bg-gray-300 rounded w-20"></div>
            {showEmail && !compact && (
              <div className="h-3 bg-gray-300 rounded w-32"></div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showPicture && profile.picture && (
          <Image
            src={profile.picture}
            alt={profile.name || 'User'}
            width={24}
            height={24}
            className="rounded-full"
          />
        )}
        <span className="text-sm font-medium">
          {profile.name || profile.nickname || profile.email}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {showPicture && profile.picture && (
        <Image
          src={profile.picture}
          alt={profile.name || 'User'}
          width={32}
          height={32}
          className="rounded-full"
        />
      )}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">
          {profile.name || profile.nickname || 'User'}
        </span>
        {showEmail && profile.email && (
          <span className="text-xs text-gray-500">
            {profile.email}
          </span>
        )}
      </div>
    </div>
  )
}

export default UserProfile