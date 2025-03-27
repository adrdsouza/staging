// app/api/utils/errorHandling.ts - Centralized API error handling
import { NextResponse } from 'next/server';

// Define standard error types
export enum ErrorType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  SERVER_ERROR = 'server_error',
}

interface ErrorResponse {
  errors: {
    message: string;
    type: ErrorType;
    details?: Record<string, any>;
  };
}

// Create a standard error response
export function createErrorResponse(
  message: string,
  type: ErrorType,
  status: number,
  details?: Record<string, any>
) {
  const response: ErrorResponse = {
    errors: {
      message,
      type,
      ...(details && { details }),
    },
  };

  return NextResponse.json(response, { status });
}

// Centralized error handling function for API routes
export function handleApiError(error: unknown, defaultMessage: string = 'Sorry, something went wrong') {
  console.error('API Error:', error);
  
  // Handle known error types
  if (error instanceof Error) {
    // Authentication errors
    if (error.message.includes('authentication') || error.message.includes('token')) {
      return createErrorResponse(
        'Authentication failed. Please login again.',
        ErrorType.AUTHENTICATION,
        401
      );
    }
    
    // Missing data errors
    if (error.message.includes('missing') || error.message.includes('required')) {
      return createErrorResponse(
        error.message,
        ErrorType.VALIDATION,
        400
      );
    }
    
    // Not found errors
    if (error.message.includes('not found')) {
      return createErrorResponse(
        error.message,
        ErrorType.NOT_FOUND,
        404
      );
    }
    
    // Return the actual error message for other known errors
    return createErrorResponse(
      error.message,
      ErrorType.SERVER_ERROR,
      500
    );
  }
  
  // Default server error
  return createErrorResponse(
    defaultMessage,
    ErrorType.SERVER_ERROR,
    500
  );
}

// Rate limiting utilities
const IP_REQUESTS = new Map<string, { count: number; timestamp: number }>();

export function rateLimitRequest(ip: string, limit: number = 100, windowMs: number = 60 * 1000): boolean {
  const now = Date.now();
  
  // Clean up expired entries
  for (const [storedIp, data] of IP_REQUESTS.entries()) {
    if (now - data.timestamp > windowMs) {
      IP_REQUESTS.delete(storedIp);
    }
  }
  
  // Get or create entry for this IP
  const current = IP_REQUESTS.get(ip) || { count: 0, timestamp: now };
  
  // If this request would exceed the limit, return false
  if (current.count >= limit) {
    return false;
  }
  
  // Update the count for this IP
  IP_REQUESTS.set(ip, {
    count: current.count + 1,
    timestamp: current.timestamp,
  });
  
  return true;
}

// Example of how to use in an API route
/* 
// In your API route:
import { handleApiError, rateLimitRequest } from '@/app/api/utils/errorHandling';

export async function POST(request: Request) {
  try {
    // Get IP from request headers
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Check rate limit (100 requests per minute)
    if (!rateLimitRequest(ip, 100, 60 * 1000)) {
      return createErrorResponse(
        'Too many requests, please try again later',
        ErrorType.AUTHORIZATION,
        429
      );
    }
    
    // Validate inputs
    const body = await request.json();
    if (!body.required_field) {
      return createErrorResponse(
        'Missing required field',
        ErrorType.VALIDATION,
        400
      );
    }
    
    // Process the request...
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
*/
