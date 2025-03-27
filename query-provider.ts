// lib/query/query-provider.tsx
'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

interface QueryProviderProps {
  children: React.ReactNode;
}

// Create a client
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      // Default query options
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnMount: true, // Refetch when component mounts
      retry: 1, // Only retry once
      refetchInterval: false, // Don't refetch automatically
      networkMode: 'offlineFirst', // Use cache first, then network
    },
    mutations: {
      // Default mutation options
      retry: 1, // Only retry once
      networkMode: 'offlineFirst', // Use cache first, then network
    },
  },
});

export function QueryProvider({ children }: QueryProviderProps) {
  // Use React's useState and useRef for proper hydration in Next.js
  const [queryClient] = React.useState(() => createQueryClient());

  // Only render ReactQueryDevtools in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {isDevelopment && <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />}
    </QueryClientProvider>
  );
}

// Helper functions for optimistic updates

/**
 * Helper function for optimistic updates when adding an item
 */
export function optimisticAdd<T>(queryKey: unknown[], newItem: T, getId: (item: T) => string | number) {
  return (queryClient: QueryClient) => {
    // Get current data
    const previousData = queryClient.getQueryData<T[]>(queryKey) || [];
    
    // Optimistically update the cache
    queryClient.setQueryData<T[]>(queryKey, (old = []) => {
      return [...old, newItem];
    });
    
    // Return context for onError to revert
    return { previousData };
  };
}

/**
 * Helper function for optimistic updates when updating an item
 */
export function optimisticUpdate<T>(
  queryKey: unknown[], 
  updatedItem: T, 
  getId: (item: T) => string | number
) {
  return (queryClient: QueryClient) => {
    // Get current data
    const previousData = queryClient.getQueryData<T[]>(queryKey) || [];
    
    // Optimistically update the cache
    queryClient.setQueryData<T[]>(queryKey, (old = []) => {
      return old.map(item => 
        getId(item) === getId(updatedItem) ? updatedItem : item
      );
    });
    
    // Return context for onError to revert
    return { previousData };
  };
}

/**
 * Helper function for optimistic updates when removing an item
 */
export function optimisticRemove<T>(
  queryKey: unknown[], 
  itemToRemove: T | string | number,
  getId: (item: T) => string | number
) {
  return (queryClient: QueryClient) => {
    // Get current data
    const previousData = queryClient.getQueryData<T[]>(queryKey) || [];
    
    // Get the ID to remove
    const idToRemove = typeof itemToRemove === 'string' || typeof itemToRemove === 'number' 
      ? itemToRemove 
      : getId(itemToRemove);
    
    // Optimistically update the cache
    queryClient.setQueryData<T[]>(queryKey, (old = []) => {
      return old.filter(item => getId(item) !== idToRemove);
    });
    
    // Return context for onError to revert
    return { previousData };
  };
}

/**
 * Helper function to revert an optimistic update on error
 */
export function revertOptimisticUpdate<T>(queryKey: unknown[], context: { previousData: T[] }) {
  return (queryClient: QueryClient) => {
    queryClient.setQueryData<T[]>(queryKey, context.previousData);
  };
}

// Export custom hooks for common operations
export function useOptimisticAdd<T>(
  queryKey: unknown[], 
  mutationFn: (newItem: T) => Promise<any>,
  getId: (item: T) => string | number
) {
  const queryClient = useQueryClient();
  
  return (newItem: T) => {
    return queryClient.fetchQuery({
      queryKey,
      queryFn: () => mutationFn(newItem),
      meta: {
        optimisticUpdate: optimisticAdd(queryKey, newItem, getId),
        onError: revertOptimisticUpdate(queryKey, { previousData: queryClient.getQueryData(queryKey) || [] }),
      },
    });
  };
}

// Export the QueryClient to use elsewhere
export function useQueryClient() {
  return React.useContext(QueryClientProvider).client;
}
