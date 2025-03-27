// components/common/OptimizedImage.tsx
import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { useInView } from 'react-intersection-observer';

// Helper function to determine if a URL is external
function isExternalUrl(url: string): boolean {
  return url.startsWith('http') || url.startsWith('//');
}

// Helper function to determine if URL is from our CDN
function isCdnUrl(url: string): boolean {
  return url.includes('cdn.damneddesigns.com') || 
         url.includes('cloudflare-ipfs.com') || 
         url.includes('cloudfront.net');
}

// Helper to get CDN URL from original URL
function getCdnUrl(src: string, width?: number, quality?: number): string {
  // If it's already a CDN URL, just add parameters
  if (isCdnUrl(src)) {
    const url = new URL(src);
    if (width) url.searchParams.set('w', width.toString());
    if (quality) url.searchParams.set('q', quality.toString());
    return url.toString();
  }

  // If it's from our main domain, rewrite to CDN
  if (src.includes('admin.damneddesigns.com') || src.includes('damneddesigns.com')) {
    // Extract the path from the original URL
    const path = new URL(src).pathname;
    
    // Construct CDN URL (replace with your actual CDN domain)
    const cdnBase = 'https://cdn.damneddesigns.com';
    const cdnUrl = new URL(path, cdnBase);
    
    // Add optimization parameters
    if (width) cdnUrl.searchParams.set('w', width.toString());
    if (quality) cdnUrl.searchParams.set('q', quality.toString());
    
    return cdnUrl.toString();
  }

  // Return original URL if we can't transform it
  return src;
}

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  blurhash?: string;
  fallbackSrc?: string;
  useCdn?: boolean;
  lazyLoad?: boolean;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  sizes,
  quality = 85,
  priority = false,
  placeholder,
  blurhash,
  fallbackSrc = '/placeholder-image.jpg',
  useCdn = true,
  lazyLoad = true,
  className,
  style,
  onLoad,
  onError,
  ...rest
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Set up intersection observer for advanced lazy loading
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px', // Load when within 200px of viewport
  });
  
  // Use CDN URL if enabled and applicable
  const optimizedSrc = useCdn && isExternalUrl(imgSrc) 
    ? getCdnUrl(imgSrc, typeof width === 'number' ? width : undefined, quality)
    : imgSrc;
  
  // Calculate aspect ratio for placeholder
  let aspectRatio: number | undefined;
  if (typeof width === 'number' && typeof height === 'number') {
    aspectRatio = width / height;
  }
  
  // Handle image loading
  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad?.(e);
  };
  
  // Handle image error
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!hasError && fallbackSrc && imgSrc !== fallbackSrc) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
    onError?.(e);
  };
  
  // If using lazy loading and image is not in view, render a placeholder div
  if (lazyLoad && !priority && !inView) {
    return (
      <div 
        ref={ref}
        className={`bg-gray-100 ${className || ''}`}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
          ...style
        }}
        aria-label={alt || 'Loading image'}
      />
    );
  }

  // Custom blur placeholder if blurhash is provided
  const blurDataURL = blurhash || undefined;

  // Calculate optimized sizes prop if not provided
  const optimizedSizes = sizes || 
    (typeof width === 'number' && width < 640 ? '100vw' : 
    (width && typeof width === 'number' && width < 768 ? '50vw' : '33vw'));

  return (
    <div 
      ref={lazyLoad && !priority ? ref : undefined}
      className={`relative overflow-hidden ${!isLoaded ? 'bg-gray-100' : ''} ${className || ''}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
        ...style
      }}
    >
      <Image
        src={optimizedSrc}
        alt={alt || ''}
        width={typeof width === 'number' ? width : undefined}
        height={typeof height === 'number' ? height : undefined}
        sizes={optimizedSizes}
        quality={quality}
        priority={priority}
        placeholder={blurDataURL ? 'blur' : placeholder}
        blurDataURL={blurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          objectFit: 'contain',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
        {...rest}
      />
    </div>
  );
};

export default OptimizedImage;
