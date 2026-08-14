import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 bg-[#FFF8F0]">
      <div className="text-center max-w-md">
        {/* Ornamental number */}
        <div className="flex justify-center gap-2 text-5xl mb-4 select-none">
          <span>🥟</span><span>🍩</span><span>🥬</span>
        </div>
        <p className="font-display text-8xl font-black text-[#CC0000]/15 leading-none mb-2">404</p>
        <h1 className="font-display text-2xl font-black text-gray-900 mb-3">Page Not Found</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-[#CC0000] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#AA0000] transition-colors btn-press shadow-md"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center justify-center gap-2 bg-white text-[#CC0000] font-bold px-6 py-3 rounded-xl border-2 border-[#CC0000] hover:bg-[#CC0000]/5 transition-colors btn-press"
          >
            <ArrowLeft className="h-4 w-4" />
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}
