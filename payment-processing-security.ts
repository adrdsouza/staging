// app/api/process-nmi/route.ts - Enhanced security for payment processing

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { encrypt, decrypt } from '@/lib/encryption';

// Define a type for the expected request body
interface PaymentRequestBody {
  token: {
    token: string;
    card: {
      number: string;
      exp: string;
    }
  };
  order: {
    orderNumber: string;
    billing: {
      firstName: string;
      lastName: string;
      address1: string;
      address2?: string;
      city: string;
      state: string;
      postcode: string;
      country: string;
      phone: string;
      email: string;
    };
    shipping: {
      firstName: string;
      lastName: string;
      address1: string;
      address2?: string;
      city: string;
      state: string;
      postcode: string;
      country: string;
    };
    lineItems: {
      nodes: Array<{
        variation?: {
          node: {
            name: string;
          }
        };
        quantity: number;
      }>;
    };
    total: string;
  };
}

// Rate limiter to prevent brute force attacks
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 users per minute
});

export async function POST(request: Request) {
  try {
    // Check rate limit
    const ip = request.headers.get('cf-connecting-ip') || 
               request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               'unknown';
    
    try {
      await limiter.check(ip, 10); // Max 10 payment attempts per minute per IP
    } catch (error) {
      console.log(`Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        { status: false, error: 'Too many payment attempts. Please wait and try again.' }, 
        { status: 429 }
      );
    }

    // Validate content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { status: false, error: 'Invalid content type' }, 
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json() as PaymentRequestBody;
    
    if (!body.token || !body.order) {
      return NextResponse.json(
        { status: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate token data
    if (!body.token.token || !body.token.card) {
      return NextResponse.json(
        { status: false, error: 'Invalid payment token' },
        { status: 400 }
      );
    }

    // Format order description with proper sanitization
    const orderDesc = body.order?.lineItems?.nodes
      .map((node) => {
        const name = node?.variation?.node.name || 'Product';
        const quantity = node.quantity || 1;
        return `${name.replace(/[^\w\s-]/g, '')} × ${quantity}`;
      })
      .join(', ');

    // Sanitize inputs for billing and shipping info
    const sanitizeInput = (input: string): string => {
      return input ? input.replace(/[^\w\s.,\-@]/g, '') : '';
    };

    const billingInfo = {
      first_name: sanitizeInput(body.order.billing.firstName),
      last_name: sanitizeInput(body.order.billing.lastName),
      address1: sanitizeInput(body.order.billing.address1),
      address2: body.order.billing.address2 ? sanitizeInput(body.order.billing.address2) : '',
      city: sanitizeInput(body.order.billing.city),
      state: sanitizeInput(body.order.billing.state),
      zip: sanitizeInput(body.order.billing.postcode),
      country: sanitizeInput(body.order.billing.country),
      phone: sanitizeInput(body.order.billing.phone),
      email: sanitizeInput(body.order.billing.email),
    };

    const shippingInfo = {
      shipping_firstname: sanitizeInput(body.order.shipping.firstName),
      shipping_lastname: sanitizeInput(body.order.shipping.lastName),
      shipping_address1: sanitizeInput(body.order.shipping.address1),
      shipping_address2: body.order.shipping.address2 ? sanitizeInput(body.order.shipping.address2) : '',
      shipping_city: sanitizeInput(body.order.shipping.city),
      shipping_state: sanitizeInput(body.order.shipping.state),
      shipping_country: sanitizeInput(body.order.shipping.country),
      shipping_zip: sanitizeInput(body.order.shipping.postcode),
    };

    // Verify NMI API key exists
    if (!process.env.NMI_PRIVATE_KEY) {
      console.error('NMI_PRIVATE_KEY environment variable is not set');
      return NextResponse.json(
        { status: false, error: 'Payment configuration error' },
        { status: 500 }
      );
    }

    // Create a logging ID that doesn't expose sensitive data
    const loggingId = `order-${body.order.orderNumber}-${Date.now()}`;

    // Build the NMI request data
    const nmiRequestData = {
      type: 'sale',
      security_key: process.env.NMI_PRIVATE_KEY,
      payment_token: body.token.token,
      ccnumber: body.token.card.number,
      ccexp: body.token.card.exp,
      amount: body.order.total.replace('$', ''),
      currency: 'USD',
      orderid: body.order.orderNumber,
      order_description: `Damned Designs - Order ${body.order.orderNumber} (${orderDesc})`,
      ipaddress: ip,
      customer_receipt: true,
      ...billingInfo,
      ...shippingInfo,
    };

    // Use URLSearchParams to format the request body properly
    const reqData = new URLSearchParams(nmiRequestData);

    console.log(`[${loggingId}] Payment attempt started`);

    // Make the API request to NMI
    const response = await fetch(
      'https://secure.networkmerchants.com/api/transact.php',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: reqData,
      }
    );

    // Handle HTTP errors
    if (response.status !== 200) {
      console.error(`[${loggingId}] NMI API HTTP error: ${response.status}`);
      return NextResponse.json(
        { status: false, error: 'Payment gateway error' },
        { status: 502 }
      );
    }

    // Parse the NMI response
    const nmiResponse = await response.text();
    const params = new URLSearchParams(nmiResponse);
    const result: Record<string, string> = {};

    for (const [key, value] of params.entries()) {
      result[key] = value;
    }

    // Check for NMI success response
    if (result.response !== '1') {
      console.error(`[${loggingId}] NMI payment declined: ${result.responsetext}`);
      return NextResponse.json(
        { 
          status: false, 
          message: result.responsetext || 'Payment declined', 
          errorCode: result.response 
        },
        { status: 400 }
      );
    }

    console.log(`[${loggingId}] Payment successful (Transaction ID: ${result.transactionid})`);

    // Return successful response with minimal information
    return NextResponse.json({ 
      status: true, 
      data: {
        transactionId: result.transactionid,
        authCode: result.authcode,
        avsResponse: result.avsresponse,
        orderNumber: body.order.orderNumber
      } 
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json({ 
      status: false, 
      error: 'An unexpected error occurred processing your payment' 
    }, { status: 500 });
  }
}
