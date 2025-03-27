// app/ProductPageHead.tsx - Dynamic Metadata Component for Product Pages
import { Metadata } from 'next';

interface ProductSEOData {
  name: string;
  description: string;
  price: string;
  image: string;
  sku: string;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder';
  brand: string;
  category: string;
  rating?: {
    value: number;
    count: number;
  };
}

export function generateProductMetadata(product: ProductSEOData): Metadata {
  // Clean description - strip HTML and limit length
  const cleanDescription = product.description
    ? product.description.replace(/<[^>]*>/g, '').substring(0, 160)
    : `Premium quality ${product.name} by Damned Designs`;

  // Generate structured data for the product
  const structuredData = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: cleanDescription,
    image: product.image || "https://admin.damneddesigns.com/wp-content/uploads/woocommerce-placeholder-1000x1000.png",
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Damned Designs',
    },
    offers: {
      '@type': 'Offer',
      url: 'https://damneddesigns.com/product/' + product.name.toLowerCase().replace(/\s+/g, '-'),
      price: product.price?.replace(/[^0-9.]/g, ''),
      priceCurrency: 'USD',
      availability: `https://schema.org/${product.availability}`,
    },
    ...(product.rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating.value.toString(),
        reviewCount: product.rating.count.toString(),
      }
    } : {}),
  };

  return {
    title: `${product.name} - Premium EDC Tools - Damned Designs`,
    description: cleanDescription,
    openGraph: {
      title: product.name,
      description: cleanDescription,
      url: `https://damneddesigns.com/product/${product.name.toLowerCase().replace(/\s+/g, '-')}`,
      siteName: 'Damned Designs',
      images: [
        {
          url: product.image || "https://admin.damneddesigns.com/wp-content/uploads/woocommerce-placeholder-1000x1000.png",
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
      locale: 'en_US',
      type: 'product',
      // Add product-specific OG tags
      product: {
        price: {
          amount: product.price?.replace(/[^0-9.]/g, ''),
          currency: 'USD',
        },
        availability: product.availability === 'InStock' ? 'in stock' : 
                     product.availability === 'OutOfStock' ? 'out of stock' : 'preorder',
      },
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: cleanDescription,
      creator: '@damneddesigns',
      site: '@damneddesigns',
      images: [product.image || "https://admin.damneddesigns.com/wp-content/uploads/woocommerce-placeholder-1000x1000.png"],
    },
    alternates: {
      canonical: `https://damneddesigns.com/product/${product.name.toLowerCase().replace(/\s+/g, '-')}`,
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: {
      'product:brand': product.brand || 'Damned Designs',
      'product:availability': product.availability,
      'product:price:amount': product.price?.replace(/[^0-9.]/g, ''),
      'product:price:currency': 'USD',
      'og:price:amount': product.price?.replace(/[^0-9.]/g, ''),
      'og:price:currency': 'USD',
    },
    // Add structured data
    keywords: [
      product.name, 
      product.category || 'EDC', 
      'Damned Designs', 
      'Premium', 
      'Quality', 
      product.brand || 'Damned Designs'
    ].join(', '),
    // Use JSON.stringify for the structured data script
    verification: {
      other: {
        'structured-data': JSON.stringify(structuredData),
      },
    },
  };
}

// app/CategoryPageHead.tsx - Metadata for Category Pages
export interface CategorySEOData {
  name: string;
  description: string;
  image?: string;
  products: Array<{
    name: string;
    price: string;
    image: string;
  }>;
}

export function generateCategoryMetadata(category: CategorySEOData): Metadata {
  // Clean description - strip HTML and limit length
  const cleanDescription = category.description
    ? category.description.replace(/<[^>]*>/g, '').substring(0, 160)
    : `Shop premium ${category.name} by Damned Designs`;

  // Generate structured data for the category
  const structuredData = {
    '@context': 'https://schema.org/',
    '@type': 'ItemList',
    name: `${category.name} - Damned Designs`,
    description: cleanDescription,
    url: `https://damneddesigns.com/shop/${category.name.toLowerCase().replace(/\s+/g, '-')}`,
    numberOfItems: category.products.length,
    itemListElement: category.products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        url: `https://damneddesigns.com/product/${product.name.toLowerCase().replace(/\s+/g, '-')}`,
        image: product.image,
        offers: {
          '@type': 'Offer',
          price: product.price?.replace(/[^0-9.]/g, ''),
          priceCurrency: 'USD',
        },
      },
    })),
  };

  return {
    title: `${category.name} - Premium EDC Tools - Damned Designs`,
    description: cleanDescription,
    openGraph: {
      title: `${category.name} - Damned Designs`,
      description: cleanDescription,
      url: `https://damneddesigns.com/shop/${category.name.toLowerCase().replace(/\s+/g, '-')}`,
      siteName: 'Damned Designs',
      images: [
        {
          url: category.image || "https://admin.damneddesigns.com/wp-content/uploads/default-category-image.jpg",
          width: 1200,
          height: 630,
          alt: category.name,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${category.name} - Damned Designs`,
      description: cleanDescription,
      creator: '@damneddesigns',
      site: '@damneddesigns',
      images: [category.image || "https://admin.damneddesigns.com/wp-content/uploads/default-category-image.jpg"],
    },
    alternates: {
      canonical: `https://damneddesigns.com/shop/${category.name.toLowerCase().replace(/\s+/g, '-')}`,
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    keywords: [
      category.name, 
      'Shop', 
      'Collection', 
      'Damned Designs', 
      'Premium', 
      'Quality', 
      'EDC', 
      'Every Day Carry'
    ].join(', '),
    // Use JSON.stringify for the structured data script
    verification: {
      other: {
        'structured-data': JSON.stringify(structuredData),
      },
    },
  };
}

// components/SEOItemSchema.tsx - Reusable SEO Component for Products
import React from 'react';

interface SEOItemSchemaProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: string;
    image: string;
    url: string;
    sku?: string;
    brand?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    rating?: {
      value: number;
      count: number;
    };
  };
}

export const SEOItemSchema: React.FC<SEOItemSchemaProps> = ({ product }) => {
  // Create structured data for the product
  const structuredData = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description.replace(/<[^>]*>/g, ''),
    image: product.image,
    sku: product.sku,
    url: product.url,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Damned Designs',
    },
    offers: {
      '@type': 'Offer',
      url: product.url,
      price: product.price?.replace(/[^0-9.]/g, ''),
      priceCurrency: 'USD',
      availability: `https://schema.org/${product.availability || 'InStock'}`,
    },
    ...(product.rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating.value.toString(),
        reviewCount: product.rating.count.toString(),
      }
    } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

// components/SEOBreadcrumbSchema.tsx - Breadcrumb Schema Component
import React from 'react';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface SEOBreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export const SEOBreadcrumbSchema: React.FC<SEOBreadcrumbSchemaProps> = ({ items }) => {
  // Create structured data for breadcrumbs
  const structuredData = {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

// components/SEOOrganizationSchema.tsx - Organization Schema
import React from 'react';

export const SEOOrganizationSchema: React.FC = () => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Damned Designs',
    url: 'https://damneddesigns.com',
    logo: 'https://admin.damneddesigns.com/wp-content/uploads/damned-designs-logo.png',
    sameAs: [
      'https://www.facebook.com/damneddesigns',
      'https://www.instagram.com/damned.designs/',
      'https://twitter.com/damneddesigns',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-337-602-9228',
      contactType: 'customer service',
      email: 'info@damneddesigns.com',
      availableLanguage: 'English',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

// components/Breadcrumbs.tsx - Enhanced Breadcrumbs Component
import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SEOBreadcrumbSchema } from './SEOBreadcrumbSchema';

interface BreadcrumbProps {
  items: Array<{
    name: string;
    href: string;
  }>;
}

export const Breadcrumbs: React.FC<BreadcrumbProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  // Format items for schema
  const schemaItems = items.map(item => ({
    name: item.name,
    url: `https://damneddesigns.com${item.href}`,
  }));

  return (
    <>
      {/* Add the structured data */}
      <SEOBreadcrumbSchema items={schemaItems} />
      
      {/* Visual breadcrumbs */}
      <nav aria-label="Breadcrumbs" className="py-3 px-4 text-sm">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, index) => (
            <li key={item.href} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 mx-1 text-gray-400" aria-hidden="true" />
              )}
              
              {index === items.length - 1 ? (
                <span className="font-medium text-gray-700" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link 
                  href={item.href}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

// robots.ts - Dynamic robots generation
// This file should be placed at app/robots.ts

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://damneddesigns.com';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/my-account/',
        '/cart/',
        '/checkout/',
        '/order-recieved/',
        // Add other private paths
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

// sitemap.ts - Dynamic sitemap generation
// This file should be placed at app/sitemap.ts

import { MetadataRoute } from 'next';
import { fetchProducts, fetchCategories } from '@/graphql';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://damneddesigns.com';
  
  // Add static routes
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terms-conditions`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.2,
    },
    // Add other static pages
  ] as MetadataRoute.Sitemap;
  
  try {
    // Fetch products for dynamic routes
    const products = await fetchProducts({ first: 1000 });
    
    const productRoutes = products.nodes.map(product => ({
      url: `${baseUrl}/product/${product.slug}`,
      lastModified: new Date(product.modified || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    
    // Fetch categories for dynamic routes
    const categories = await fetchCategories({ first: 100 });
    
    const categoryRoutes = categories.nodes.map(category => ({
      url: `${baseUrl}/shop/${category.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
    
    // Combine all routes
    return [...routes, ...productRoutes, ...categoryRoutes];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return routes;
  }
}

// components/MobileOptimizations.tsx - Mobile-specific optimizations
import React, { useEffect, useState } from 'react';

export const MobileOptimizer: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /iphone|ipad|ipod|android|blackberry|windows phone/g.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    
    // Add viewport meta tag for mobile optimization if not present
    if (!document.querySelector('meta[name="viewport"]')) {
      const viewport = document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1, maximum-scale=5';
      document.head.appendChild(viewport);
    }
    
    // Add theme-color meta for mobile browsers
    if (!document.querySelector('meta[name="theme-color"]')) {
      const themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      themeColor.content = '#4a5568'; // Match your brand color
      document.head.appendChild(themeColor);
    }
    
    // Add touch-icon for iOS
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const touchIcon = document.createElement('link');
      touchIcon.rel = 'apple-touch-icon';
      touchIcon.href = '/apple-touch-icon.png';
      document.head.appendChild(touchIcon);
    }
  }, []);
  
  return null; // This component doesn't render anything visible
};

// lib/seo/canonical-url.ts - Helper for canonical URLs
export function getCanonicalUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://damneddesigns.com';
  
  // Ensure path starts with a slash
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Remove trailing slash if present (unless it's the homepage)
  const normalizedPath = formattedPath === '/' 
    ? formattedPath 
    : formattedPath.endsWith('/') 
      ? formattedPath.slice(0, -1) 
      : formattedPath;
  
  return `${baseUrl}${normalizedPath}`;
}

// Add metadata to HTML tag to help with ranking:
// In your app/layout.tsx file, update to include lang attribute
/*
  <html lang="en" dir="ltr" className="scroll-smooth">
*/