// lib/seo/validate-schema.ts
import { isValidElement } from 'react';
import * as schema from 'schema-dts';

// Define a simpler type for schema validation results
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a schema.org schema object against its expected type
 * 
 * @param data The schema object to validate
 * @param type The expected schema type (e.g., 'Product', 'Organization')
 * @returns Validation result with errors if any
 */
export function validateSchema(data: any, type: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
  };

  // Skip validation for React elements
  if (isValidElement(data)) {
    return result;
  }

  // Basic type validation
  if (!data || typeof data !== 'object') {
    result.valid = false;
    result.errors.push(`Schema data must be an object, got ${typeof data}`);
    return result;
  }

  // Check for @context
  if (!data['@context'] || data['@context'] !== 'https://schema.org/') {
    result.valid = false;
    result.errors.push("Schema must have @context set to 'https://schema.org/'");
  }

  // Check for @type
  if (!data['@type']) {
    result.valid = false;
    result.errors.push('Schema must have @type property');
  } else if (data['@type'] !== type) {
    result.valid = false;
    result.errors.push(`Schema @type must be '${type}', got '${data['@type']}'`);
  }

  // Additional validation based on schema type
  switch (type) {
    case 'Product':
      validateProductSchema(data, result);
      break;
    case 'Organization':
      validateOrganizationSchema(data, result);
      break;
    case 'BreadcrumbList':
      validateBreadcrumbSchema(data, result);
      break;
    case 'FAQPage':
      validateFAQSchema(data, result);
      break;
    case 'Review':
      validateReviewSchema(data, result);
      break;
    // Add more schema types as needed
  }

  return result;
}

/**
 * Validate Product schema
 */
function validateProductSchema(data: any, result: ValidationResult): void {
  // Required fields for Product
  const requiredFields = ['name', 'offers'];
  checkRequiredFields(data, requiredFields, result);

  // Check offers
  if (data.offers && typeof data.offers === 'object') {
    if (!data.offers['@type'] || data.offers['@type'] !== 'Offer') {
      result.valid = false;
      result.errors.push("Product offers must have @type 'Offer'");
    }

    const offerRequiredFields = ['price', 'priceCurrency', 'availability'];
    checkRequiredFields(data.offers, offerRequiredFields, result, 'offers.');

    // Check availability format
    if (data.offers.availability && !data.offers.availability.startsWith('https://schema.org/')) {
      result.valid = false;
      result.errors.push("Product offers.availability must start with 'https://schema.org/'");
    }
  }

  // Check aggregateRating if present
  if (data.aggregateRating && typeof data.aggregateRating === 'object') {
    if (!data.aggregateRating['@type'] || data.aggregateRating['@type'] !== 'AggregateRating') {
      result.valid = false;
      result.errors.push("Product aggregateRating must have @type 'AggregateRating'");
    }

    const ratingRequiredFields = ['ratingValue', 'reviewCount'];
    checkRequiredFields(data.aggregateRating, ratingRequiredFields, result, 'aggregateRating.');
  }
}

/**
 * Validate Organization schema
 */
function validateOrganizationSchema(data: any, result: ValidationResult): void {
  // Required fields for Organization
  const requiredFields = ['name', 'url'];
  checkRequiredFields(data, requiredFields, result);

  // Check logo if present
  if (data.logo && typeof data.logo !== 'string' && !data.logo['@type']) {
    result.valid = false;
    result.errors.push("Organization logo should be a URL string or an ImageObject with @type");
  }
}

/**
 * Validate BreadcrumbList schema
 */
function validateBreadcrumbSchema(data: any, result: ValidationResult): void {
  // Check for itemListElement
  if (!Array.isArray(data.itemListElement)) {
    result.valid = false;
    result.errors.push("BreadcrumbList must have itemListElement as an array");
    return;
  }

  // Check each list item
  data.itemListElement.forEach((item: any, index: number) => {
    if (!item['@type'] || item['@type'] !== 'ListItem') {
      result.valid = false;
      result.errors.push(`BreadcrumbList item ${index} must have @type 'ListItem'`);
    }

    if (typeof item.position !== 'number') {
      result.valid = false;
      result.errors.push(`BreadcrumbList item ${index} must have position as a number`);
    }

    if (!item.name) {
      result.valid = false;
      result.errors.push(`BreadcrumbList item ${index} must have name`);
    }

    if (!item.item) {
      result.valid = false;
      result.errors.push(`BreadcrumbList item ${index} must have item (URL)`);
    }
  });
}

/**
 * Validate FAQ schema
 */
function validateFAQSchema(data: any, result: ValidationResult): void {
  // Check for mainEntity
  if (!Array.isArray(data.mainEntity)) {
    result.valid = false;
    result.errors.push("FAQPage must have mainEntity as an array");
    return;
  }

  // Check each question/answer
  data.mainEntity.forEach((item: any, index: number) => {
    if (!item['@type'] || item['@type'] !== 'Question') {
      result.valid = false;
      result.errors.push(`FAQPage item ${index} must have @type 'Question'`);
    }

    if (!item.name) {
      result.valid = false;
      result.errors.push(`FAQPage item ${index} must have name (question text)`);
    }

    if (!item.acceptedAnswer) {
      result.valid = false;
      result.errors.push(`FAQPage item ${index} must have acceptedAnswer`);
    } else if (!item.acceptedAnswer['@type'] || item.acceptedAnswer['@type'] !== 'Answer') {
      result.valid = false;
      result.errors.push(`FAQPage item ${index} acceptedAnswer must have @type 'Answer'`);
    } else if (!item.acceptedAnswer.text) {
      result.valid = false;
      result.errors.push(`FAQPage item ${index} acceptedAnswer must have text`);
    }
  });
}

/**
 * Validate Review schema
 */
function validateReviewSchema(data: any, result: ValidationResult): void {
  // Required fields for Review
  const requiredFields = ['reviewRating', 'author', 'reviewBody'];
  checkRequiredFields(data, requiredFields, result);

  // Check reviewRating
  if (data.reviewRating && typeof data.reviewRating === 'object') {
    if (!data.reviewRating['@type'] || data.reviewRating['@type'] !== 'Rating') {
      result.valid = false;
      result.errors.push("Review reviewRating must have @type 'Rating'");
    }

    if (typeof data.reviewRating.ratingValue !== 'number' && typeof data.reviewRating.ratingValue !== 'string') {
      result.valid = false;
      result.errors.push("Review reviewRating must have ratingValue");
    }
  }

  // Check author
  if (data.author && typeof data.author === 'object') {
    if (!data.author['@type']) {
      result.valid = false;
      result.errors.push("Review author must have @type (e.g., 'Person')");
    }

    if (!data.author.name) {
      result.valid = false;
      result.errors.push("Review author must have name");
    }
  }
}

/**
 * Check for required fields in a schema object
 */
function checkRequiredFields(
  data: any, 
  requiredFields: string[], 
  result: ValidationResult, 
  prefix: string = ''
): void {
  requiredFields.forEach(field => {
    if (!data[field]) {
      result.valid = false;
      result.errors.push(`Missing required field: ${prefix}${field}`);
    }
  });
}

/**
 * Create a valid Product schema object
 */
export function createProductSchema(product: {
  name: string;
  description?: string;
  image?: string;
  price: string | number;
  currency?: string;
  sku?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  brand?: string;
  rating?: {
    value: number;
    count: number;
  };
}): schema.Product {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    sku: product.sku,
    ...(product.brand ? {
      brand: {
        '@type': 'Brand',
        name: product.brand,
      },
    } : {}),
    offers: {
      '@type': 'Offer',
      price: typeof product.price === 'number' ? product.price.toString() : product.price.replace(/[^0-9.]/g, ''),
      priceCurrency: product.currency || 'USD',
      availability: `https://schema.org/${product.availability || 'InStock'}`,
    },
    ...(product.rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating.value.toString(),
        reviewCount: product.rating.count.toString(),
      },
    } : {}),
  };
}

/**
 * Create a valid Organization schema object
 */
export function createOrganizationSchema(org: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
  contactPoint?: {
    telephone: string;
    contactType: string;
    email?: string;
    availableLanguage?: string;
  };
}): schema.Organization {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Organization',
    name: org.name,
    url: org.url,
    logo: org.logo,
    description: org.description,
    sameAs: org.sameAs,
    ...(org.contactPoint ? {
      contactPoint: {
        '@type': 'ContactPoint',
        ...org.contactPoint,
      },
    } : {}),
  };
}

/**
 * Create a valid BreadcrumbList schema object
 */
export function createBreadcrumbSchema(items: Array<{
  name: string;
  url: string;
}>): schema.BreadcrumbList {
  return {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
