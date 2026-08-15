import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';

const METHODS: Record<string, { label: string; emoji: string; note?: string }> = {
  cash:  { label: 'Cash', emoji: '💵' },
  zelle: { label: 'Zelle', emoji: '💜' },
  card:  { label: 'Card / Debit', emoji: '💳', note: '3.5% card fee included in your total' },
};

export default function PreOrderPayment() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('id');
  const method = searchParams.get('method');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const called = useRef(false);

  useEffect(() => {
    if (!orderId || !method || called.current) return;
    called.current = true;

    fetch('/.netlify/functions/set-preorder-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, method }),
    })
      .then(res => res.ok ? setStatus('success') : setStatus('error'))
      .catch(() => setStatus('error'));
  }, [orderId, method]);

  const info = method ? METHODS[method] : null;

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Saving your payment choice...</p>
        </div>
      </div>
    );
  }

  if (status === 'error' || !info) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-500 mb-6 text-lg leading-relaxed">
            Please text us and let us know how you'd like to pay at pickup.
          </p>
          <a href="sms:8645906760"
            className="inline-block bg-[#CC0000] text-white font-bold text-lg px-8 py-4 rounded-2xl hover:bg-[#AA0000] transition-colors">
            Text Us: (864) 590-6760
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center px-4">
      <div className="text-center max-w-sm w-full">
        <div className="text-6xl mb-5">{info.emoji}</div>
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="font-display text-3xl font-black text-gray-900 mb-3">Got it!</h1>
        <p className="text-xl text-gray-700 mb-2 leading-relaxed">
          You'll pay with <strong>{info.label}</strong> at pickup.
        </p>
        {info.note && (
          <p className="text-gray-500 text-base mb-6">{info.note}</p>
        )}
        <div className="bg-white rounded-2xl border-2 border-[#CC0000]/20 p-6 shadow-sm mb-6">
          <p className="text-gray-500 text-sm mb-1">Questions? Text us:</p>
          <a href="sms:8645906760" className="font-display text-2xl font-black text-[#CC0000]">
            (864) 590-6760
          </a>
        </div>
        <p className="text-gray-400 text-sm italic leading-relaxed">
          ❤️ Thank you for supporting our small family business!<br />
          Fresh homemade European favorites made with love. 🇪🇺✨
        </p>
      </div>
    </div>
  );
}
