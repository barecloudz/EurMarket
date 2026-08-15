import type { Handler } from '@netlify/functions';
import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

interface PaymentRequest {
  sourceId: string;
  amountCents: number;
  orderId: string;
  customerEmail?: string;
}

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

  if (!accessToken || !locationId) {
    console.error('[square-payment] Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Payment service not configured' }),
    };
  }

  const client = new SquareClient({
    token: accessToken,
    environment: process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
  });

  try {
    const { sourceId, amountCents, orderId, customerEmail }: PaymentRequest =
      JSON.parse(event.body || '{}');

    if (!sourceId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Payment token is required' }),
      };
    }

    if (!amountCents || amountCents < 50) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid amount — minimum is $0.50' }),
      };
    }

    const response = await client.payments.create({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(amountCents),
        currency: 'USD',
      },
      locationId,
      referenceId: orderId || undefined,
      buyerEmailAddress: customerEmail || undefined,
    });

    const payment = response.payment;
    console.log(`[square-payment] Payment created: ${payment?.id} for order ${orderId}`);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        paymentId: payment?.id,
      }),
    };
  } catch (error: any) {
    console.error('[square-payment] Error:', error);
    const message =
      error.errors?.[0]?.detail ||
      error.message ||
      'Payment failed. Please try again.';

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: message }),
    };
  }
};

export { handler };
