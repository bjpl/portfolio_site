import { useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/config';
import { RealtimePayload } from '@/types/admin';

export interface UseSupabaseRealtimeOptions {
  filter?: Record<string, any>;
  enabled?: boolean;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

export const useSupabaseRealtime = <T = any>(
  table: string,
  options: UseSupabaseRealtimeOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  const {
    filter = {},
    enabled = true,
    onInsert,
    onUpdate,
    onDelete
  } = options;

  useEffect(() => {
    if (!enabled || !table) {
      return;
    }

    setLoading(true);
    setError(null);

    // Create channel name with filter for uniqueness
    const filterKey = Object.keys(filter).length > 0 
      ? `-${Object.entries(filter).map(([k, v]) => `${k}:${v}`).join('-')}`
      : '';
    const channelName = `${table}${filterKey}`;

    const realtimeChannel = supabase.channel(channelName);

    // Build the subscription with filters
    let subscription = realtimeChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        ...filter
      },
      (payload: RealtimePayload<T>) => {
        try {
          switch (payload.eventType) {
            case 'INSERT':
              if (onInsert) {
                onInsert(payload.new);
              }
              // Update local data if it's an array
              setData(prevData => {
                if (Array.isArray(prevData) && payload.new) {
                  return [...prevData, payload.new] as T;
                }
                return payload.new as T;
              });
              break;

            case 'UPDATE':
              if (onUpdate) {
                onUpdate(payload.new);
              }
              // Update local data
              setData(prevData => {
                if (Array.isArray(prevData) && payload.new) {
                  return prevData.map(item => 
                    (item as any).id === (payload.new as any).id ? payload.new : item
                  ) as T;
                }
                return payload.new as T;
              });
              break;

            case 'DELETE':
              if (onDelete) {
                onDelete(payload.old);
              }
              // Remove from local data
              setData(prevData => {
                if (Array.isArray(prevData) && payload.old) {
                  return prevData.filter(item => 
                    (item as any).id !== (payload.old as any).id
                  ) as T;
                }
                return null;
              });
              break;
          }
        } catch (err) {
          console.error('Error handling realtime payload:', err);
          setError(err as Error);
        }
      }
    );

    // Subscribe to the channel
    subscription
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setLoading(false);
          console.log(`Subscribed to ${table} realtime changes`);
        } else if (status === 'CHANNEL_ERROR') {
          setError(new Error('Failed to subscribe to realtime channel'));
          setLoading(false);
        } else if (status === 'TIMED_OUT') {
          setError(new Error('Realtime subscription timed out'));
          setLoading(false);
        }
      });

    setChannel(realtimeChannel);

    // Cleanup function
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [table, enabled, JSON.stringify(filter)]);

  // Manual refresh function
  const refresh = async () => {
    if (!table) return;

    try {
      setLoading(true);
      let query = supabase.from(table).select('*');

      // Apply filters to the query
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data: freshData, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      setData(freshData as T);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Disconnect from realtime
  const disconnect = () => {
    if (channel) {
      supabase.removeChannel(channel);
      setChannel(null);
    }
  };

  // Reconnect to realtime
  const reconnect = () => {
    disconnect();
    // Re-run the effect by toggling a dependency
    setLoading(true);
  };

  return {
    data,
    loading,
    error,
    channel,
    refresh,
    disconnect,
    reconnect,
    isConnected: channel?.state === 'joined'
  };
};

// Hook for dashboard stats with real-time updates
export const useDashboardStats = () => {
  return useSupabaseRealtime('dashboard_stats', {
    enabled: true,
    onUpdate: (newStats) => {
      console.log('Dashboard stats updated:', newStats);
    }
  });
};

// Hook for content changes
export const useContentRealtime = (contentId?: string) => {
  return useSupabaseRealtime('content', {
    filter: contentId ? { filter: `id=eq.${contentId}` } : {},
    enabled: true,
    onUpdate: (updatedContent) => {
      console.log('Content updated:', updatedContent);
    },
    onInsert: (newContent) => {
      console.log('New content created:', newContent);
    }
  });
};

// Hook for media library changes
export const useMediaRealtime = (folderId?: string) => {
  return useSupabaseRealtime('media_files', {
    filter: folderId ? { filter: `folder_id=eq.${folderId}` } : {},
    enabled: true,
    onUpdate: (updatedMedia) => {
      console.log('Media updated:', updatedMedia);
    },
    onInsert: (newMedia) => {
      console.log('New media uploaded:', newMedia);
    },
    onDelete: (deletedMedia) => {
      console.log('Media deleted:', deletedMedia);
    }
  });
};

// Hook for user activity
export const useActivityRealtime = (userId?: string) => {
  return useSupabaseRealtime('activity_logs', {
    filter: userId ? { filter: `user_id=eq.${userId}` } : {},
    enabled: true,
    onInsert: (newActivity) => {
      console.log('New activity:', newActivity);
    }
  });
};

export default useSupabaseRealtime;