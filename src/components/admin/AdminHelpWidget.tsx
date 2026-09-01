import { useState, useEffect } from 'react';
import { X, HelpCircle, ChevronRight, ChevronLeft } from 'lucide-react';

const SUPPORT_CONTACT = 'Blake';
const HELP_SEEN_KEY = 'admin_help_seen_v1';

interface Guide {
  title: string;
  emoji: string;
  steps: string[];
}

const GUIDES: Guide[] = [
  {
    title: 'Opening & Closing Orders',
    emoji: '🔓',
    steps: [
      'Go to Pre-Orders in the sidebar.',
      'You\'ll see a big green or red button at the top — that\'s the on/off switch.',
      'Tap it once to flip orders OPEN or CLOSED. It saves automatically.',
      'When orders are OPEN, customers can submit orders on the website.',
      'When CLOSED, the order form is hidden from customers.',
    ],
  },
  {
    title: 'Adding a Market Date',
    emoji: '📅',
    steps: [
      'Go to Pre-Orders → Settings tab.',
      'Scroll down to "Market dates" (Step 3).',
      'Tap "Add a market date" to expand the form.',
      'Pick the date, type the time (e.g. "8:00 AM – 12:00 PM"), and the pickup address.',
      'Choose which cities can order for that date — or leave it as "All Cities".',
      'Tap "Add This Date" — it saves right away.',
      'To edit or delete a date later, tap the pencil ✏️ or trash 🗑️ icon next to it.',
    ],
  },
  {
    title: 'Editing the Menu',
    emoji: '✏️',
    steps: [
      'Go to Pre-Orders → Menu tab.',
      'You\'ll see all your items listed. Tap the blue pencil ✏️ button on any item to edit it.',
      'Change the name, emoji, sizes, prices, or flavors.',
      'To add a new flavor: tap "+ Add flavor", type the name.',
      'To remove a flavor: tap the X next to it.',
      'Tap "Save Item" when done — it goes live on the order form immediately.',
      'Need to start fresh? Use "↩ Reset to defaults" at the top to reload the standard menu.',
    ],
  },
  {
    title: 'Handling Customer Orders',
    emoji: '📦',
    steps: [
      'Go to Pre-Orders → Orders tab.',
      'New orders show up with an amber border and say "⏳ Pending".',
      'Tap "Pack & Set Prices" on a pending order to review what the customer wants.',
      'Enter the price for each item. Mark anything you can\'t make as "unavailable".',
      'Tap "Confirm & Send Email" — the customer gets an email with their total.',
      'Use the dropdown to update the order status: Confirmed → Ready → Completed.',
      'The "Production Summary" at the top totals up everything you need to make.',
    ],
  },
  {
    title: 'Printing & Exporting Orders',
    emoji: '🖨️',
    steps: [
      'Go to Pre-Orders → Orders tab.',
      'Tap "Print Orders" to open the browser print dialog — prints all orders neatly.',
      'Tap "Export CSV" to download a spreadsheet with all order details.',
      'The CSV file can be opened in Excel or Google Sheets.',
      'Great for keeping a paper backup before market day!',
    ],
  },
];

export default function AdminHelpWidget() {
  const [open, setOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState<Guide | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(HELP_SEEN_KEY);
    if (!seen) {
      const t = setTimeout(() => setShowWelcome(true), 1400);
      return () => clearTimeout(t);
    }
  }, []);

  const dismissWelcome = () => {
    localStorage.setItem(HELP_SEEN_KEY, '1');
    setShowWelcome(false);
  };

  const openHelp = () => {
    dismissWelcome();
    setOpen(true);
    setTimeout(() => setPanelVisible(true), 10);
  };

  const closeHelp = () => {
    setPanelVisible(false);
    setTimeout(() => { setOpen(false); setActiveGuide(null); }, 250);
  };

  return (
    <>
      {/* First-visit welcome popup */}
      {showWelcome && (
        <div className="fixed bottom-5 left-5 z-40 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
          <button
            onClick={dismissWelcome}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
          <p className="text-2xl mb-1">👋</p>
          <p className="font-black text-gray-900 text-sm mb-1">Need help?</p>
          <p className="text-sm text-gray-500 leading-relaxed mb-3">
            Tap the <strong className="text-[#CC0000]">?</strong> button in the bottom-right corner any time to see step-by-step guides for everything in the admin.
          </p>
          <button
            onClick={openHelp}
            className="w-full bg-[#CC0000] text-white font-bold text-sm py-2.5 rounded-xl hover:bg-[#AA0000] transition-colors">
            Show me the guides
          </button>
        </div>
      )}

      {/* Floating ? button */}
      <button
        onClick={openHelp}
        className="fixed bottom-5 right-5 z-40 w-14 h-14 bg-[#CC0000] hover:bg-[#AA0000] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        title="Help guides">
        <HelpCircle className="w-7 h-7" />
      </button>

      {/* Help panel overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-end">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={closeHelp}
          />
          <div className={`relative w-full sm:w-96 h-[85vh] sm:h-full bg-white sm:rounded-none rounded-t-3xl shadow-2xl flex flex-col overflow-hidden transition-transform duration-250 ease-out ${panelVisible ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-x-full'}`}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0 bg-gradient-to-r from-[#CC0000] to-[#AA0000]">
              <div className="flex items-center gap-2">
                {activeGuide && (
                  <button
                    onClick={() => setActiveGuide(null)}
                    className="text-white/80 hover:text-white -ml-1 mr-1">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <div>
                  <p className="font-black text-white text-base leading-tight">
                    {activeGuide ? activeGuide.title : 'Help Guides'}
                  </p>
                  {!activeGuide && (
                    <p className="text-white/70 text-xs mt-0.5">Tap a topic to see step-by-step instructions</p>
                  )}
                </div>
              </div>
              <button
                onClick={closeHelp}
                className="text-white/80 hover:text-white flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guide list */}
            {!activeGuide && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {GUIDES.map((guide) => (
                  <button
                    key={guide.title}
                    onClick={() => setActiveGuide(guide)}
                    className="w-full flex items-center gap-4 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-[#CC0000]/30 rounded-2xl px-4 py-4 text-left transition-colors group">
                    <span className="text-3xl flex-shrink-0">{guide.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm leading-snug">{guide.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{guide.steps.length} steps</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#CC0000] flex-shrink-0 transition-colors" />
                  </button>
                ))}

                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <p className="text-sm font-bold text-amber-800 mb-0.5">📞 Still stuck?</p>
                  <p className="text-sm text-amber-700">Call or text {SUPPORT_CONTACT} and he can walk you through it.</p>
                </div>
              </div>
            )}

            {/* Individual guide steps */}
            {activeGuide && (
              <div className="flex-1 overflow-y-auto p-5">
                <div className="text-center mb-6">
                  <span className="text-5xl">{activeGuide.emoji}</span>
                </div>
                <ol className="space-y-4">
                  {activeGuide.steps.map((step, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="w-7 h-7 rounded-full bg-[#CC0000] text-white text-sm font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-gray-700 text-sm leading-relaxed pt-0.5">{step}</p>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                  <p className="text-sm font-bold text-green-800">✅ That's it!</p>
                  <p className="text-sm text-green-700 mt-0.5">Everything saves automatically — no extra steps needed.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
