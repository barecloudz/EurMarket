import { useState } from 'react';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import type { MenuItem, PreorderSettings } from './types';
import { DEFAULT_MENU } from './types';

interface Props {
  settings: PreorderSettings;
  menu: MenuItem[];
  savingMenu: boolean;
  onMenuChange: (updated: MenuItem[]) => void;
  onSaveMenu: (updated: MenuItem[]) => Promise<void>;
}

export function MenuTab({ menu, savingMenu, onMenuChange, onSaveMenu }: Props) {
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm text-gray-500">Edit item names, sizes, prices, and flavors. Changes go live immediately after saving.</p>
        <button
          type="button"
          onClick={async () => {
            if (!confirm('Reset to built-in defaults?\n\nThis will PERMANENTLY overwrite ALL your custom prices, including any British Meats prices you entered. This cannot be undone.')) return;
            onMenuChange(DEFAULT_MENU);
            await onSaveMenu(DEFAULT_MENU);
          }}
          disabled={savingMenu}
          className="flex-shrink-0 text-xs font-bold text-gray-400 hover:text-[#CC0000] border border-gray-200 hover:border-[#CC0000]/40 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap">
          ↩ Reset to defaults
        </button>
      </div>

      {menu.map((item, idx) => (
        <div key={item.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {editingItemIdx === idx && editItem ? (
            <div className="p-5 space-y-4">
              {/* Item name + emoji */}
              <div className="flex gap-2">
                <div className="w-20 flex-shrink-0">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Emoji</label>
                  <input type="text" value={editItem.emoji} onChange={e => setEditItem({ ...editItem, emoji: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-center text-xl focus:outline-none focus:border-[#CC0000]" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Item Name</label>
                  <input type="text" value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#CC0000]" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Category</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Array.from(new Set(menu.map(m => m.category).filter(Boolean))).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditItem({ ...editItem, category: cat })}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${editItem.category === cat ? 'bg-[#CC0000] border-[#CC0000] text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-[#CC0000]/50'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <input type="text" value={editItem.category ?? ''} onChange={e => setEditItem({ ...editItem, category: e.target.value || undefined })}
                  placeholder="Or type a new category name…"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#CC0000] text-sm" />
              </div>

              {/* Sizes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sizes & Prices</label>
                  <button type="button"
                    onClick={() => setEditItem({ ...editItem, sizes: [...editItem.sizes, { label: '', priceNote: '' }] })}
                    className="text-xs font-bold text-[#CC0000] hover:text-[#AA0000] flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add size
                  </button>
                </div>
                <div className="space-y-2">
                  {editItem.sizes.map((size, si) => (
                    <div key={si} className="flex gap-2 items-center">
                      <input type="text" value={size.label} placeholder="Size label"
                        onChange={e => {
                          const sizes = editItem.sizes.map((s, i) => i === si ? { ...s, label: e.target.value } : s);
                          setEditItem({ ...editItem, sizes });
                        }}
                        className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#CC0000]" />
                      <input type="text" value={size.priceNote} placeholder="Price (e.g. $10)"
                        onChange={e => {
                          const sizes = editItem.sizes.map((s, i) => i === si ? { ...s, priceNote: e.target.value } : s);
                          setEditItem({ ...editItem, sizes });
                        }}
                        className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#CC0000]" />
                      <button type="button" onClick={() => setEditItem({ ...editItem, sizes: editItem.sizes.filter((_, i) => i !== si) })}
                        className="p-2 text-red-400 hover:text-red-600 flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flavors */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Flavors <span className="text-gray-400 font-normal">(optional)</span></label>
                  <button type="button"
                    onClick={() => setEditItem({ ...editItem, flavors: [...editItem.flavors, ''] })}
                    className="text-xs font-bold text-[#CC0000] hover:text-[#AA0000] flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add flavor
                  </button>
                </div>
                {editItem.flavors.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No flavors — customers just pick a size</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {editItem.flavors.map((flavor, fi) => (
                      <div key={fi} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                        <input type="text" value={flavor}
                          onChange={e => {
                            const flavors = editItem.flavors.map((f, i) => i === fi ? e.target.value : f);
                            setEditItem({ ...editItem, flavors });
                          }}
                          className="text-sm text-gray-700 bg-transparent focus:outline-none w-24 min-w-0" />
                        <button type="button" onClick={() => setEditItem({ ...editItem, flavors: editItem.flavors.filter((_, i) => i !== fi) })}
                          className="text-red-400 hover:text-red-600 flex-shrink-0 ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={async () => {
                    const updated = menu.map((m, i) => i === idx ? editItem : m);
                    onMenuChange(updated);
                    setEditingItemIdx(null);
                    await onSaveMenu(updated);
                  }}
                  disabled={savingMenu}
                  className="flex-1 bg-[#CC0000] text-white font-bold py-2.5 rounded-xl hover:bg-[#AA0000] transition-colors disabled:opacity-50 text-sm">
                  {savingMenu ? 'Saving...' : 'Save Item'}
                </button>
                <button onClick={() => setEditingItemIdx(null)}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-gray-600 font-bold hover:border-gray-300 transition-colors text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className={`flex items-center gap-3 px-4 py-4 ${item.active === false ? 'opacity-50' : ''}`}>
              <span className="text-2xl flex-shrink-0">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                {item.category && <p className="text-xs font-bold text-[#CC0000] mb-0.5 uppercase tracking-wide">{item.category}</p>}
                <p className="font-bold text-gray-900 text-sm leading-snug">{item.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.sizes.map(s => `${s.label}: ${s.priceNote}`).join(' · ')}
                </p>
                {item.flavors.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.flavors.length} {item.flavors.length === 1 ? 'flavor' : 'flavors'}</p>
                )}
                {item.active === false && (
                  <p className="text-xs font-bold text-gray-400 mt-0.5">Hidden from customers</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  title={item.active === false ? 'Show to customers' : 'Hide from customers'}
                  onClick={async () => {
                    const updated = menu.map((m, i) => i === idx ? { ...m, active: m.active === false ? true : false } : m);
                    onMenuChange(updated);
                    await onSaveMenu(updated);
                  }}
                  disabled={savingMenu}
                  className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${item.active === false ? 'bg-gray-200' : 'bg-green-500'}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.active === false ? 'left-1' : 'left-5'}`} />
                </button>
                <button onClick={() => { setEditItem({ ...item }); setEditingItemIdx(idx); }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-lg p-2 transition-colors border border-blue-200 flex-shrink-0">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => {
          const newItem: MenuItem = { id: `item-${Date.now()}`, emoji: '🍽️', name: '', sizes: [{ label: '', priceNote: '' }], flavors: [] };
          const updated = [...menu, newItem];
          onMenuChange(updated);
          setEditItem(newItem);
          setEditingItemIdx(updated.length - 1);
        }}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl py-4 text-gray-500 font-bold text-sm hover:border-[#CC0000] hover:text-[#CC0000] transition-colors">
        <Plus className="w-4 h-4" /> Add New Item
      </button>
    </div>
  );
}
