import { useState, useEffect, useCallback } from 'react';
import { PostgrestError, PostgrestFilterBuilder } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/config';

export interface UseSupabaseQueryOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchInterval?: number;
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  filters?: Record<string, any>;
  select?: string;
  limit?: number;
  offset?: number;
}

export interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  error: PostgrestError | null;
  refetch: () => Promise<void>;
  mutate: (newData: T) => void;
}

export const useSupabaseQuery = <T = any>(
  table: string,
  options: UseSupabaseQueryOptions = {}
): QueryResult<T> => {
  const {
    enabled = true,
    refetchOnMount = true,
    refetchInterval,
    orderBy,
    filters = {},
    select = '*',
    limit,
    offset
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PostgrestError | null>(null);

  const executeQuery = useCallback(async () => {
    if (!enabled || !table) return;

    try {
      setLoading(true);
      setError(null);

      // Build the query
      let query = supabase.from(table).select(select);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else if (typeof value === 'string' && value.includes('%')) {
            query = query.ilike(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      // Apply pagination
      if (limit !== undefined) {
        const start = offset || 0;
        const end = start + limit - 1;
        query = query.range(start, end);
      }

      // Execute query
      const { data: queryData, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      setData(queryData as T);
    } catch (err) {
      setError(err as PostgrestError);
      console.error(`Error querying ${table}:`, err);
    } finally {
      setLoading(false);
    }
  }, [table, enabled, select, filters, orderBy, limit, offset]);

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount) {
      executeQuery();
    }
  }, [executeQuery, refetchOnMount]);

  // Interval refetch
  useEffect(() => {
    if (refetchInterval && refetchInterval > 0) {
      const interval = setInterval(executeQuery, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [executeQuery, refetchInterval]);

  // Refetch function
  const refetch = useCallback(async () => {
    await executeQuery();
  }, [executeQuery]);

  // Mutate function for optimistic updates
  const mutate = useCallback((newData: T) => {
    setData(newData);
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    mutate
  };
};

// Specialized hook for paginated queries
export const useSupabasePagination = <T = any>(
  table: string,
  pageSize: number = 10,
  options: Omit<UseSupabaseQueryOptions, 'limit' | 'offset'> = {}
) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const offset = (currentPage - 1) * pageSize;

  const { data, loading, error, refetch } = useSupabaseQuery<T[]>(table, {
    ...options,
    limit: pageSize,
    offset
  });

  // Get total count
  const fetchTotalCount = useCallback(async () => {
    if (!table) return;

    try {
      let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });

      // Apply same filters for count
      Object.entries(options.filters || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            countQuery = countQuery.in(key, value);
          } else if (typeof value === 'string' && value.includes('%')) {
            countQuery = countQuery.ilike(key, value);
          } else {
            countQuery = countQuery.eq(key, value);
          }
        }
      });

      const { count, error: countError } = await countQuery;

      if (countError) {
        throw countError;
      }

      setTotalCount(count || 0);
    } catch (err) {
      console.error(`Error getting count for ${table}:`, err);
    }
  }, [table, options.filters]);

  // Fetch total count when dependencies change
  useEffect(() => {
    fetchTotalCount();
  }, [fetchTotalCount]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const refetchWithCount = useCallback(async () => {
    await Promise.all([refetch(), fetchTotalCount()]);
  }, [refetch, fetchTotalCount]);

  return {
    data,
    loading,
    error,
    refetch: refetchWithCount,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

// Hook for single record queries
export const useSupabaseRecord = <T = any>(
  table: string,
  id: string | undefined,
  options: Omit<UseSupabaseQueryOptions, 'filters'> = {}
) => {
  return useSupabaseQuery<T>(table, {
    ...options,
    filters: id ? { id } : {},
    enabled: options.enabled !== false && Boolean(id)
  });
};

// Hook for search queries
export const useSupabaseSearch = <T = any>(
  table: string,
  searchQuery: string,
  searchColumns: string[],
  options: UseSupabaseQueryOptions = {}
) => {
  const searchFilters = searchQuery && searchColumns.length > 0
    ? { or: searchColumns.map(col => `${col}.ilike.%${searchQuery}%`).join(',') }
    : {};

  return useSupabaseQuery<T[]>(table, {
    ...options,
    filters: {
      ...options.filters,
      ...searchFilters
    },
    enabled: options.enabled !== false && Boolean(searchQuery)
  });
};

// Hook for real-time queries
export const useSupabaseRealtimeQuery = <T = any>(
  table: string,
  options: UseSupabaseQueryOptions = {}
) => {
  const queryResult = useSupabaseQuery<T>(table, options);
  
  useEffect(() => {
    if (!options.enabled || !table) return;

    const channel = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: table },
        () => {
          queryResult.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, options.enabled, queryResult]);

  return queryResult;
};

export default useSupabaseQuery;