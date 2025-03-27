// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.25, // Capture 25% of transactions for performance monitoring
  profilesSampleRate: 0.1, // Capture 10% of profiles
  
  // Adjust this value in production, as it will affect transaction sample rates
  environment: process.env.NODE_ENV,
  
  integrations: [
    // Enable browser performance monitoring
    new Sentry.BrowserTracing({
      idleTimeout: 5000, // How long until a transaction auto-completes after inactivity (ms)
    }),
    
    // Enable browser profiling
    new Sentry.BrowserProfilingIntegration(),
  ],
  
  // Performance monitoring settings
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    // Filter out certain errors
    if (event.exception && Array.isArray(event.exception.values)) {
      // Filter out CORS errors that are often false positives
      const isCorsError = event.exception.values.some(
        (e) => e.value && e.value.includes('Cross-Origin Request Blocked')
      );
      
      if (isCorsError) {
        return null;
      }
      
      // Filter out navigation cancellations which might be intentional
      const isNavCancel = event.exception.values.some(
        (e) => e.value && e.value.includes('Navigation was cancelled')
      );
      
      if (isNavCancel) {
        return null;
      }
    }
    
    return event;
  },
  
  // Set different trace sample rates based on route
  tracesSampler: (samplingContext) => {
    const url = samplingContext.transactionContext?.name || '';
    
    // High-priority routes to sample more frequently
    if (url.includes('/checkout') || url.includes('/payment')) {
      return 0.5; // 50% of transactions
    }
    
    // Cart operations are important
    if (url.includes('/cart') || url.includes('/api/cart')) {
      return 0.3; // 30% of transactions
    }
    
    // Sample APIs less frequently - they generate many events
    if (url.includes('/api/')) {
      return 0.1; // 10% of transactions
    }
    
    // Default sample rate
    return 0.25; // 25% of transactions
  },
});

// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.25, // Capture 25% of transactions for performance monitoring
  
  environment: process.env.NODE_ENV,
  
  integrations: [
    // Enable automatic instrumentation of Next.js's API routes
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  
  // Performance monitoring settings
  beforeSend(event) {
    // Don't send certain events during development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    
    return event;
  },
  
  // Set different trace sample rates based on route
  tracesSampler: (samplingContext) => {
    const url = samplingContext.transactionContext?.name || '';
    
    // Payment processing is high priority
    if (url.includes('/api/process-nmi') || url.includes('/api/create-order')) {
      return 0.7; // 70% of transactions
    }
    
    // Cart operations are important
    if (url.includes('/api/cart')) {
      return 0.4; // 40% of transactions
    }
    
    // Product APIs are medium priority
    if (url.includes('/api/product') || url.includes('/api/products')) {
      return 0.2; // 20% of transactions
    }
    
    // Default sample rate
    return 0.25; // 25% of transactions
  },
});

// sentry.edge.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.25,
  
  // Adjust this value in production, as it will affect transaction sample rates
  environment: process.env.NODE_ENV,
});

// hooks/useSentryMonitoring.ts
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useSession } from '@/client/SessionProvider';

interface TransactionOptions {
  name: string;
  op?: string;
  description?: string;
  tags?: Record<string, string>;
  data?: Record<string, any>;
}

export function useSentryMonitoring() {
  const { customer } = useSession();
  
  // Set user information for Sentry when customer state changes
  useEffect(() => {
    if (customer && customer.id !== 'guest') {
      Sentry.setUser({
        id: customer.databaseId?.toString(),
        email: customer.email,
        username: customer.displayName || customer.firstName,
      });
    } else {
      // Clear user data when not logged in
      Sentry.setUser(null);
    }
  }, [customer]);

  // Start a performance transaction
  const startTransaction = (options: TransactionOptions) => {
    return Sentry.startTransaction({
      name: options.name,
      op: options.op || 'user-interaction',
      description: options.description,
      tags: options.tags,
      data: options.data,
    });
  };

  // Track a page view
  const trackPageView = (pageName: string) => {
    Sentry.addBreadcrumb({
      category: 'navigation',
      message: `Viewed page: ${pageName}`,
      level: 'info',
    });
  };

  // Track a user interaction
  const trackInteraction = (action: string, data?: Record<string, any>) => {
    Sentry.addBreadcrumb({
      category: 'ui.interaction',
      message: action,
      data,
      level: 'info',
    });
  };

  // Track a business event
  const trackBusinessEvent = (event: string, data: Record<string, any>) => {
    Sentry.captureMessage(`Business Event: ${event}`, {
      level: 'info',
      tags: { type: 'business_event', event },
      extra: data,
    });
  };

  // Track a custom metric
  const trackMetric = (name: string, value: number, unit?: string) => {
    Sentry.setTag(`metric.${name}`, value.toString());
    
    Sentry.addBreadcrumb({
      category: 'metrics',
      message: `Metric: ${name}`,
      data: { value, unit },
      level: 'info',
    });
  };

  // Wrapper for error capturing
  const captureError = (error: Error, context?: Record<string, any>) => {
    Sentry.captureException(error, {
      tags: { source: 'explicit_capture' },
      extra: context,
    });
  };

  // Create a scope for a specific operation
  const withScope = (callback: (scope: Sentry.Scope) => void) => {
    Sentry.withScope(callback);
  };

  return {
    startTransaction,
    trackPageView,
    trackInteraction,
    trackBusinessEvent,
    trackMetric,
    captureError,
    withScope,
  };
}

// Example usage in a component
/*
import { useSentryMonitoring } from '@/hooks/useSentryMonitoring';

function ProductPage() {
  const { trackPageView, trackInteraction, captureError } = useSentryMonitoring();
  
  useEffect(() => {
    // Track page view when component mounts
    trackPageView('Product Detail Page');
  }, [trackPageView]);
  
  const handleAddToCart = async () => {
    try {
      // Start a transaction for performance monitoring
      const transaction = startTransaction({
        name: 'Add to Cart',
        description: 'User adds item to cart',
        tags: { productId: product.id }
      });
      
      // Track the interaction
      trackInteraction('Add to Cart Button Clicked', {
        productId: product.id,
        price: product.price
      });
      
      // Attempt to add the product to cart
      await addToCart();
      
      // Track business metric
      trackBusinessEvent('Product Added to Cart', {
        productId: product.id,
        name: product.name,
        price: product.price
      });
      
      // Finish the transaction
      transaction.finish();
    } catch (error) {
      // Capture the error with context
      captureError(error, {
        productId: product.id,
        action: 'Add to Cart'
      });
    }
  };
  
  return (
    // Component JSX
  );
}
*/