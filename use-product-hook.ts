// hooks/products/use-product.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { optimisticUpdate, revertOptimisticUpdate } from '@/lib/query/query-provider';
import { cacheManager } from '@/lib/cache/cache-manager';
import { Product, ProductVariation } from '@/types/product';

// Types for the API responses
interface FetchProductResponse {
  product: Product;
}

interface FetchVariationResponse {
  variation: ProductVariation;
}

/**
 * Fetch a product by slug
 */
async function fetchProduct(slug: string): Promise<Product> {
  // Try to get from cache first
  const cacheKey = `product:${slug}`;
  const cachedProduct = localStorage.getItem(cacheKey);
  
  if (cachedProduct) {
    try {
      return JSON.parse(cachedProduct);
    } catch (e) {
      console.warn('Error parsing cached product:', e);
      // Continue to fetch from API if cache is invalid
    }
  }
  
  const response = await fetch(`/api/product`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: slug, idType: 'SLUG' }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch product: ${response.statusText}`);
  }
  
  const data = await response.json() as FetchProductResponse;
  
  if (!data.product) {
    throw new Error('Product not found');
  }
  
  // Cache the product
  localStorage.setItem(cacheKey, JSON.stringify(data.product));
  
  return data.product;
}

/**
 * Fetch a variation by ID
 */
async function fetchVariation(id: number): Promise<ProductVariation> {
  const cacheKey = `variation:${id}`;
  const cachedVariation = localStorage.getItem(cacheKey);
  
  if (cachedVariation) {
    try {
      return JSON.parse(cachedVariation);
    } catch (e) {
      console.warn('Error parsing cached variation:', e);
    }
  }
  
  const response = await fetch(`/api/product/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch variation: ${response.statusText}`);
  }
  
  const data = await response.json() as FetchVariationResponse;
  
  if (!data.variation) {
    throw new Error('Variation not found');
  }
  
  // Cache the variation
  localStorage.setItem(cacheKey, JSON.stringify(data.variation));
  
  return data.variation;
}

/**
 * Hook to get a product by slug
 */
export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => fetchProduct(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to get a variation by ID
 */
export function useVariation(id: number | undefined) {
  return useQuery({
    queryKey: ['variation', id],
    queryFn: () => fetchVariation(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to prefetch a product
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();
  
  return (slug: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['product', slug],
      queryFn: () => fetchProduct(slug),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
}

/**
 * Hook to add a product to wishlist with optimistic update
 */
interface Wishlist {
  items: { productId: number; addedAt: string }[];
}

interface AddToWishlistVariables {
  productId: number;
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (variables: AddToWishlistVariables) => {
      // API call to add to wishlist
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId: variables.productId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add to wishlist');
      }
      
      return response.json();
    },
    // Optimistic update
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['wishlist'] });
      
      // Snapshot the previous value
      const previousWishlist = queryClient.getQueryData<Wishlist>(['wishlist']);
      
      // Optimistically update to the new value
      queryClient.setQueryData<Wishlist>(['wishlist'], (old) => {
        const newItem = { 
          productId: variables.productId, 
          addedAt: new Date().toISOString() 
        };
        return {
          items: [...(old?.items || []), newItem]
        };
      });
      
      // Return a context object with the snapshot
      return { previousWishlist };
    },
    // If the mutation fails, use the context we returned above
    onError: (err, variables, context) => {
      if (context?.previousWishlist) {
        queryClient.setQueryData(['wishlist'], context.previousWishlist);
      }
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

/**
 * Hook to check stock status with periodic background updates
 */
export function useProductStock(productId: number | undefined) {
  return useQuery({
    queryKey: ['productStock', productId],
    queryFn: async () => {
      const response = await fetch(`/api/product/${productId}/stock`);
      if (!response.ok) {
        throw new Error('Failed to fetch stock');
      }
      return response.json();
    },
    enabled: !!productId,
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: true, // Refetch even when tab is not active
    staleTime: 30000, // Consider stock data stale after 30 seconds
  });
}

/**
 * Hook to get recently viewed products
 */
export function useRecentlyViewedProducts() {
  return useQuery({
    queryKey: ['recentlyViewed'],
    queryFn: async () => {
      // Fetch from local storage
      const recentlyViewedStr = localStorage.getItem('recentlyViewed');
      const recentlyViewed = recentlyViewedStr ? JSON.parse(recentlyViewedStr) : [];
      
      // If we have product IDs, fetch their details
      if (recentlyViewed.length > 0) {
        const response = await fetch('/api/products/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: recentlyViewed }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch recently viewed products');
        }
        
        return response.json();
      }
      
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Add a product to recently viewed
 */
export function addToRecentlyViewed(productId: number) {
  try {
    const recentlyViewedStr = localStorage.getItem('recentlyViewed');
    const recentlyViewed = recentlyViewedStr ? JSON.parse(recentlyViewedStr) : [];
    
    // Remove if already exists
    const updatedList = recentlyViewed.filter((id: number) => id !== productId);
    
    // Add to beginning
    updatedList.unshift(productId);
    
    // Keep only last 10
    const limitedList = updatedList.slice(0, 10);
    
    // Save back to local storage
    localStorage.setItem('recentlyViewed', JSON.stringify(limitedList));
    
    // Invalidate query to trigger refetch
    const queryClient = window._queryClient;
    if (queryClient) {
      queryClient.invalidateQueries({ queryKey: ['recentlyViewed'] });
    }
  } catch (e) {
    console.warn('Failed to update recently viewed products:', e);
  }
}
