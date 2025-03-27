// Type definitions for product data with proper TypeScript interfaces

export interface ProductImage {
  id: string;
  sourceUrl: string;
  altText?: string;
}

export interface ProductVariationAttribute {
  id: string;
  name: string;
  value: string;
  label?: string;
}

export interface ProductVariation {
  id: string;
  databaseId: number;
  name: string;
  price: string;
  regularPrice: string;
  salePrice?: string;
  stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_BACKORDER';
  stockQuantity?: number;
  attributes: {
    nodes: ProductVariationAttribute[];
  };
}

export interface ProductAttributes {
  id: string;
  name: string;
  label?: string;
  variation: boolean;
  options?: string[];
}

export interface Product {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  regularPrice?: string;
  salePrice?: string;
  stockStatus: 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_BACKORDER';
  image?: ProductImage;
  galleryImages?: {
    nodes: ProductImage[];
  };
  variations?: {
    nodes: ProductVariation[];
  };
  attributes?: {
    nodes: ProductAttributes[];
  };
  defaultAttributes?: {
    nodes: ProductVariationAttribute[];
  };
}

export interface CartItem {
  key: string;
  product: {
    node: Product;
  };
  variation?: {
    node: ProductVariation;
  };
  quantity: number;
  subtotal: string;
  total: string;
}

export interface Cart {
  contents: {
    nodes: CartItem[];
  };
  subtotal: string;
  total: string;
  shippingTotal: string;
  appliedCoupons?: {
    nodes: {
      code: string;
      discountAmount: string;
    }[];
  };
}

export interface Customer {
  id: string;
  databaseId: number;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  sessionToken?: string;
  billing?: BillingAddress;
  shipping?: ShippingAddress;
  orders?: {
    nodes: Order[];
  };
}

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface BillingAddress extends Address {
  email: string;
  phone: string;
}

export interface ShippingAddress extends Address {}

export interface LineItem {
  databaseId: number;
  quantity: number;
  variation?: {
    node: ProductVariation;
  };
  product?: {
    node: Product;
  };
}

export interface Order {
  id: string;
  databaseId: number;
  orderNumber: string;
  date: string;
  status: string;
  total: string;
  subtotal: string;
  shippingTotal: string;
  paymentMethodTitle: string;
  lineItems: {
    nodes: LineItem[];
  };
  billing?: BillingAddress;
  shipping?: ShippingAddress;
}

// Example of a proper typed component prop interface
export interface ProductDetailsProps {
  product: Product;
}

export interface ProductListProps {
  data: Product[];
  showPagination: boolean;
}
