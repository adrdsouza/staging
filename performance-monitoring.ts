// lib/performance/performance-monitor.ts
// Performance monitoring implementation

// Define the performance metrics we want to track
interface PerformanceMetrics {
  // Navigation and page load metrics
  pageLoadTime: number | null;           // Total page load time
  ttfb: number | null;                   // Time to First Byte
  fcp: number | null;                    // First Contentful Paint
  lcp: number | null;                    // Largest Contentful Paint
  fid: number | null;                    // First Input Delay
  cls: number | null;                    // Cumulative Layout Shift
  
  // UI interactions metrics
  interactions: {
    [key: string]: {                     // Metric name, e.g. "add-to-cart"
      count: number;                     // How many times this interaction occurred
      totalDuration: number;             // Total duration of all interactions
      min: number;                       // Minimum duration
      max: number;                       // Maximum duration
      average: number;                   // Average duration
    };
  };
  
  // Resource loading metrics
  resourceLoading: {
    js: {
      count: number;                     // Number of JS resources
      totalSize: number;                 // Total size in bytes
      totalLoadTime: number;             // Total load time
    };
    css: {
      count: number;                     // Number of CSS resources
      totalSize: number;                 // Total size in bytes
      totalLoadTime: number;             // Total load time
    };
    images: {
      count: number;                     // Number of image resources
      totalSize: number;                 // Total size in bytes
      totalLoadTime: number;             // Total load time
    };
    fonts: {
      count: number;                     // Number of font resources
      totalSize: number;                 // Total size in bytes
      totalLoadTime: number;             // Total load time
    };
    xhr: {
      count: number;                     // Number of XHR/fetch requests
      totalSize: number;                 // Total size in bytes
      totalLoadTime: number;             // Total load time
    };
  };
  
  // Client-side errors
  errors: {
    count: number;                       // Total error count
    types: {                             // Types of errors
      [key: string]: number;             // Error type → count
    };
  };
}

// Initialize empty metrics object
const initializeMetrics = (): PerformanceMetrics => ({
  pageLoadTime: null,
  ttfb: null,
  fcp: null,
  lcp: null,
  fid: null,
  cls: null,
  interactions: {},
  resourceLoading: {
    js: { count: 0, totalSize: 0, totalLoadTime: 0 },
    css: { count: 0, totalSize: 0, totalLoadTime: 0 },
    images: { count: 0, totalSize: 0, totalLoadTime: 0 },
    fonts: { count: 0, totalSize: 0, totalLoadTime: 0 },
    xhr: { count: 0, totalSize: 0, totalLoadTime: 0 },
  },
  errors: {
    count: 0,
    types: {},
  },
});

// Create the performance monitor class
class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private sessionStartTime: number;
  private isInitialized: boolean = false;
  private interactionMarks: Map<string, number> = new Map();
  
  constructor() {
    this.metrics = initializeMetrics();
    this.sessionStartTime = Date.now();
  }
  
  // Initialize the monitor once the page is loaded
  initialize() {
    if (typeof window === 'undefined' || this.isInitialized) {
      return;
    }
    
    this.isInitialized = true;
    this.setupPageLoadMetrics();
    this.setupResourceMetrics();
    this.setupErrorTracking();
    
    // Clean up on page unload and send metrics
    window.addEventListener('beforeunload', () => {
      this.sendMetrics();
    });
  }
  
  // Setup basic page load metrics
  private setupPageLoadMetrics() {
    // Get navigation timing data
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.startTime;
      this.metrics.ttfb = navigation.responseStart - navigation.startTime;
    }
    
    // First Contentful Paint
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      this.metrics.fcp = fcpEntry.startTime;
    }
    
    // Largest Contentful Paint - using PerformanceObserver
    if ('PerformanceObserver' in window) {
      // LCP
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.lcp = lastEntry.startTime;
        });
        
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        console.warn('LCP measurement not supported', e);
      }
      
      // FID
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach(entry => {
            // First input only
            if (!this.metrics.fid) {
              const fidEntry = entry as PerformanceEventTiming;
              this.metrics.fid = fidEntry.processingStart - fidEntry.startTime;
            }
          });
        });
        
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (e) {
        console.warn('FID measurement not supported', e);
      }
      
      // CLS
      try {
        let clsValue = 0;
        let clsEntries = [];
        
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          
          entries.forEach(entry => {
            // @ts-ignore - LayoutShift type may not be recognized
            if (!entry.hadRecentInput) {
              // @ts-ignore
              clsValue += entry.value;
              clsEntries.push(entry);
            }
          });
          
          this.metrics.cls = clsValue;
        });
        
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        console.warn('CLS measurement not supported', e);
      }
    }
  }
  
  // Setup resource loading metrics
  private setupResourceMetrics() {
    // Resource timing
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          
          entries.forEach(entry => {
            const resource = entry as PerformanceResourceTiming;
            const url = resource.name;
            const size = resource.transferSize;
            const duration = resource.duration;
            
            // Categorize by resource type
            if (url.endsWith('.js') || url.includes('js?')) {
              this.metrics.resourceLoading.js.count++;
              this.metrics.resourceLoading.js.totalSize += size;
              this.metrics.resourceLoading.js.totalLoadTime += duration;
            } else if (url.endsWith('.css') || url.includes('css?')) {
              this.metrics.resourceLoading.css.count++;
              this.metrics.resourceLoading.css.totalSize += size;
              this.metrics.resourceLoading.css.totalLoadTime += duration;
            } else if (/\.(jpe?g|png|gif|svg|webp)/.test(url) || url.includes('image')) {
              this.metrics.resourceLoading.images.count++;
              this.metrics.resourceLoading.images.totalSize += size;
              this.metrics.resourceLoading.images.totalLoadTime += duration;
            } else if (/\.(woff2?|eot|ttf|otf)/.test(url) || url.includes('font')) {
              this.metrics.resourceLoading.fonts.count++;
              this.metrics.resourceLoading.fonts.totalSize += size;
              this.metrics.resourceLoading.fonts.totalLoadTime += duration;
            } else if (resource.initiatorType === 'fetch' || resource.initiatorType === 'xmlhttprequest') {
              this.metrics.resourceLoading.xhr.count++;
              this.metrics.resourceLoading.xhr.totalSize += size;
              this.metrics.resourceLoading.xhr.totalLoadTime += duration;
            }
          });
        });
        
        resourceObserver.observe({ type: 'resource', buffered: true });
      } catch (e) {
        console.warn('Resource timing measurement not supported', e);
      }
    }
  }
  
  // Track custom user interactions
  startInteraction(name: string) {
    if (typeof performance === 'undefined') return;
    
    const markName = `interaction_${name}_start`;
    performance.mark(markName);
    this.interactionMarks.set(name, performance.now());
  }
  
  endInteraction(name: string) {
    if (typeof performance === 'undefined') return;
    
    const startMark = this.interactionMarks.get(name);
    if (!startMark) return;
    
    const duration = performance.now() - startMark;
    this.interactionMarks.delete(name);
    
    // Initialize this interaction in metrics if it doesn't exist
    if (!this.metrics.interactions[name]) {
      this.metrics.interactions[name] = {
        count: 0,
        totalDuration: 0,
        min: Infinity,
        max: 0,
        average: 0
      };
    }
    
    const interaction = this.metrics.interactions[name];
    interaction.count++;
    interaction.totalDuration += duration;
    interaction.min = Math.min(interaction.min, duration);
    interaction.max = Math.max(interaction.max, duration);
    interaction.average = interaction.totalDuration / interaction.count;
  }
  
  // Setup error tracking
  private setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.metrics.errors.count++;
      
      const errorType = event.error ? event.error.name : 'Unknown';
      this.metrics.errors.types[errorType] = (this.metrics.errors.types[errorType] || 0) + 1;
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.metrics.errors.count++;
      
      const errorType = event.reason && event.reason.name ? event.reason.name : 'UnhandledPromiseRejection';
      this.metrics.errors.types[errorType] = (this.metrics.errors.types[errorType] || 0) + 1;
    });
  }
  
  // Send metrics to analytics
  private sendMetrics() {
    if (typeof window === 'undefined' || !this.isInitialized) {
      return;
    }
    
    // Calculate session duration
    const sessionDuration = Date.now() - this.sessionStartTime;
    
    // Prepare the data to send
    const data = {
      ...this.metrics,
      sessionDuration,
      url: window.location.href,
      userAgent: window.navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
    
    // Option 1: Send using Beacon API (doesn't block page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon('/api/metrics', blob);
    }
    // Option 2: Fallback to fetch
    else {
      fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        // Use keepalive to ensure the request completes even if the page unloads
        keepalive: true,
      }).catch(console.error);
    }
    
    // Reset metrics for next page view
    this.metrics = initializeMetrics();
  }
  
  // Get current metrics (for debugging)
  getMetrics() {
    return { ...this.metrics };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Example React hook for performance monitoring
// hooks/usePerformanceMonitoring.ts

import { useEffect } from 'react';
import { performanceMonitor } from '@/lib/performance/performance-monitor';

export function usePerformanceMonitoring() {
  useEffect(() => {
    // Initialize performance monitoring
    performanceMonitor.initialize();
    
    // Return cleanup function
    return () => {
      // Send metrics on component unmount
      performanceMonitor.sendMetrics();
    };
  }, []);
  
  return {
    startInteraction: performanceMonitor.startInteraction.bind(performanceMonitor),
    endInteraction: performanceMonitor.endInteraction.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
  };
}

// Example API endpoint to receive metrics
// app/api/metrics/route.ts

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Log metrics to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance metrics:', data);
    }
    
    // Here you would typically send metrics to your analytics service
    // For example, Google Analytics, Datadog, New Relic, etc.
    // This is a placeholder for such implementation
    
    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing metrics:', error);
    return NextResponse.json(
      { error: 'Failed to process metrics' },
      { status: 500 }
    );
  }
}
