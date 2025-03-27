// lib/validation/checkout-validation.ts - Enhanced Zod validation schemas

import * as z from 'zod';
import { CountriesEnum } from '@/graphql';

// Email regex pattern for better validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Phone number regex pattern
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

// Zip/Postal code validation by country
const postalCodeByCountry = {
  US: /^\d{5}(-\d{4})?$/,         // USA: 12345 or 12345-6789
  CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,  // Canada: A1A 1A1
  UK: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/,     // UK: AA1 1AA
  AU: /^\d{4}$/,                  // Australia: 1234
  // Add more countries as needed
};

// Base address validation schema
export const baseAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  company: z.string().max(100).optional(),
  address1: z.string().min(3, 'Street address is required').max(200),
  address2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  country: z.nativeEnum(CountriesEnum, { 
    errorMap: () => ({ message: 'Please select a valid country' }) 
  }),
  state: z.string().min(1, 'State/province is required'),
  postcode: z.string().min(1, 'Postal/ZIP code is required').refine(
    (val, ctx) => {
      const country = ctx.path[0] === 'billing' 
        ? (ctx.parent as any).country 
        : (ctx.parent as any).country;
      
      // Apply country-specific validation if available
      if (country && postalCodeByCountry[country]) {
        return postalCodeByCountry[country].test(val);
      }
      
      // Default validation for other countries
      return val.length >= 3 && val.length <= 10;
    },
    {
      message: 'Invalid postal/ZIP code format for the selected country'
    }
  ),
});

// Billing address schema with additional fields
export const billingAddressSchema = baseAddressSchema.extend({
  email: z.string()
    .min(5, 'Email is required')
    .max(100)
    .refine(val => EMAIL_REGEX.test(val), {
      message: 'Please enter a valid email address'
    }),
  phone: z.string()
    .min(7, 'Phone number is required')
    .max(20)
    .refine(val => PHONE_REGEX.test(val), {
      message: 'Please enter a valid phone number'
    }),
});

// Full checkout schema
export const checkoutSchema = z.object({
  billing: billingAddressSchema,
  shipping: baseAddressSchema,
  sameAsBilling: z.boolean().optional(),
  payment: z.object({
    method: z.enum(['credit_card', 'paypal', 'sezzle']),
    cardName: z.string().min(1, 'Name on card is required').optional(),
    save: z.boolean().optional(),
  }),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms and conditions' })
  }),
  createAccount: z.boolean().optional(),
  accountPassword: z.string().optional()
    .refine(val => !val || val.length >= 8, {
      message: 'Password must be at least 8 characters'
    }),
  marketingConsent: z.boolean().optional(),
});

// Type definitions based on schemas
export type BillingAddress = z.infer<typeof billingAddressSchema>;
export type ShippingAddress = z.infer<typeof baseAddressSchema>;
export type CheckoutFormData = z.infer<typeof checkoutSchema>;

// Helper functions for validation
export function validateBillingAddress(data: any): { 
  valid: boolean;
  errors?: Record<string, string>;
} {
  try {
    billingAddressSchema.parse(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.errors.forEach(err => {
        const field = err.path.join('.');
        errors[field] = err.message;
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { form: 'Validation failed' } };
  }
}

export function validateShippingAddress(data: any): { 
  valid: boolean;
  errors?: Record<string, string>;
} {
  try {
    baseAddressSchema.parse(data);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.errors.forEach(err => {
        const field = err.path.join('.');
        errors[field] = err.message;
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { form: 'Validation failed' } };
  }
}

export function validateCheckoutForm(data: any): { 
  valid: boolean;
  errors?: Record<string, string>;
} {
  try {
    // If sameAsBilling is true, copy billing address to shipping
    const formData = { ...data };
    if (formData.sameAsBilling) {
      formData.shipping = { ...formData.billing };
      // Remove email and phone from shipping since they're not in the schema
      delete formData.shipping.email;
      delete formData.shipping.phone;
    }
    
    // If creating account, require password
    if (formData.createAccount) {
      checkoutSchema.extend({
        accountPassword: z.string().min(8, 'Password must be at least 8 characters')
      }).parse(formData);
    } else {
      checkoutSchema.parse(formData);
    }
    
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.errors.forEach(err => {
        const field = err.path.join('.');
        errors[field] = err.message;
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { form: 'Validation failed' } };
  }
}
