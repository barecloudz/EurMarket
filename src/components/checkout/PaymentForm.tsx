import { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import { squareAppId, squareLocationId } from '../../lib/square';

declare global {
  interface Window {
    Square?: any;
  }
}

interface PaymentFormProps {
  orderId: string;
  amountCents: number;
  customerEmail: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export default function PaymentForm({
  orderId,
  amountCents,
  customerEmail,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
}: PaymentFormProps) {
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cardRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const initSquare = async () => {
      if (!window.Square) {
        setLoadError('Payment system failed to load. Please refresh and try again.');
        return;
      }

      try {
        const payments = window.Square.payments(squareAppId, squareLocationId);
        const card = await payments.card();
        if (cancelled) return;

        cardRef.current = card;
        await card.attach('#card-container');

        if (cancelled) return;
        setIsReady(true);
      } catch (err: any) {
        if (cancelled) return;
        console.error('[PaymentForm] Square init error:', err);
        setLoadError('Failed to initialize payment form. Please refresh and try again.');
      }
    };

    // Small delay to ensure the SDK script has executed
    const timeoutId = setTimeout(initSquare, 150);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (cardRef.current) {
        cardRef.current.destroy().catch(() => {});
        cardRef.current = null;
      }
    };
  }, []);

  // Timeout if card form doesn't load within 15 seconds
  useEffect(() => {
    if (isReady) return;
    const timeout = setTimeout(() => {
      if (!isReady) {
        setLoadError(
          'Payment form is taking too long to load. Please check your connection and refresh.'
        );
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [isReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardRef.current || isProcessing) return;

    setIsProcessing(true);

    try {
      // Tokenize the card
      const result = await cardRef.current.tokenize();

      if (result.status !== 'OK') {
        const message = result.errors?.[0]?.message || 'Card verification failed. Please check your details.';
        onError(message);
        setIsProcessing(false);
        return;
      }

      // Send token to backend to create the payment
      const response = await fetch('/.netlify/functions/square-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: result.token,
          amountCents,
          orderId,
          customerEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        onError(data.error || 'Payment failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error('[PaymentForm] Payment error:', err);
      onError(err.message || 'An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  if (loadError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-400 font-medium">Payment Loading Error</p>
          <p className="text-gray-400 text-sm mt-1">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-[var(--color-primary)] text-sm hover:underline mt-2"
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {!isReady && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent mr-3" />
          <span className="text-gray-400 text-sm">Loading payment form...</span>
        </div>
      )}
      {/* Square injects the card UI into this div */}
      <div
        id="card-container"
        className={!isReady ? 'opacity-0 h-0 overflow-hidden' : 'mb-4'}
      />
      <Button
        type="submit"
        className="w-full mt-6"
        size="lg"
        isLoading={isProcessing}
        disabled={!isReady || isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </Button>
    </form>
  );
}
