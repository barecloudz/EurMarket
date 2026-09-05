import { useState, useCallback } from 'react';
import { Plus, Trash2, Pencil, CheckCircle, XCircle, Calendar, Clock, MapPin, Users, ChevronDown, ChevronUp } from 'lucide-react';
import type { PreorderSettings, DeliveryDate } from './types';

interface Props {
  settings: PreorderSettings;
  togglingOpen: boolean;
  savingDates: boolean;
  onToggleOpen: () => Promise<void>;
  onDeadlineBlur: (value: string) => Promise<void>;
  onClearDeadline: () => Promise<void>;
  onAddDate: (date: DeliveryDate) => Promise<void>;
  onEditDate: (idx: number, date: DeliveryDate) => Promise<void>;
  onDeleteDate: (idx: number) => Promise<void>;
  onAddCity: (city: string) => Promise<void>;
  onRemoveCity: (city: string) => Promise<void>;
}

export function SettingsTab({
  settings,
  togglingOpen,
  savingDates,
  onToggleOpen,
  onDeadlineBlur,
  onClearDeadline,
  onAddDate,
  onEditDate,
  onDeleteDate,
  onAddCity,
  onRemoveCity,
}: Props) {
  const [deadlineInput, setDeadlineInput] = useState(
    settings.order_deadline ? settings.order_deadline.slice(0, 16) : ''
  );
  const [newCityInput, setNewCityInput] = useState('');
  const [showAddDate, setShowAddDate] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  // Unique past times and addresses for suggestion chips
  const pastTimes = [...new Set((settings.delivery_dates ?? []).map(d => d.time).filter(Boolean))] as string[];
  const pastAddresses = [...new Set((settings.delivery_dates ?? []).map(d => d.location_address).filter(Boolean))] as string[];

  // Derive "Use Again" cards: up to 3 distinct time+address combos from recent dates
  const usedCombos = (settings.delivery_dates ?? [])
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .reduce<{ time: string; location_address: string; cities: string[] }[]>((acc, d) => {
      if (!d.time && !d.location_address) return acc;
      const key = `${d.time ?? ''}||${d.location_address ?? ''}`;
      if (!acc.find(x => `${x.time}||${x.location_address}` === key)) {
        acc.push({ time: d.time ?? '', location_address: d.location_address ?? '', cities: d.cities });
      }
      return acc;
    }, [])
    .slice(0, 3);

  const handleAddCity = useCallback(() => {
    const trimmed = newCityInput.trim();
    if (!trimmed || settings.served_cities.includes(trimmed)) return;
    onAddCity(trimmed);
    setNewCityInput('');
  }, [newCityInput, settings.served_cities, onAddCity]);

  const handleDeadlineBlur = useCallback(async () => {
    await onDeadlineBlur(deadlineInput);
  }, [deadlineInput, onDeadlineBlur]);

  return (
    <div className="space-y-4">

      {/* Step 1: Open or close orders */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
          <span className="w-6 h-6 rounded-full bg-[#CC0000] text-white text-xs font-black flex items-center justify-center flex-shrink-0">1</span>
          <p className="font-bold text-gray-700 text-sm">Open or close orders</p>
        </div>
        <div className="p-5">
          <button onClick={onToggleOpen} disabled={togglingOpen}
            className={`w-full rounded-2xl border-2 p-5 transition-all text-left flex items-center gap-5 active:scale-[0.99] ${
              settings.orders_open ? 'bg-green-50 border-green-400 hover:bg-green-100' : 'bg-red-50 border-red-300 hover:bg-red-100'
            } disabled:opacity-60 disabled:cursor-not-allowed`}>
            {togglingOpen
              ? <div className="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              : settings.orders_open
                ? <CheckCircle className="w-12 h-12 text-green-500 flex-shrink-0" />
                : <XCircle className="w-12 h-12 text-red-400 flex-shrink-0" />
            }
            <div>
              <p className={`text-xl font-black ${settings.orders_open ? 'text-green-700' : 'text-red-600'}`}>
                {settings.orders_open ? 'ORDERS ARE OPEN' : 'ORDERS ARE CLOSED'}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {settings.orders_open ? 'Customers CAN order right now. Tap here to CLOSE.' : 'Customers CANNOT order. Tap here to OPEN orders.'}
              </p>
              <p className="text-xs text-gray-400 mt-1.5 font-semibold">Saves automatically when tapped</p>
            </div>
          </button>
        </div>
      </div>

      {/* Step 2: Order deadline */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
          <span className="w-6 h-6 rounded-full bg-[#CC0000] text-white text-xs font-black flex items-center justify-center flex-shrink-0">2</span>
          <p className="font-bold text-gray-700 text-sm">Order deadline <span className="text-gray-400 font-normal">(optional)</span></p>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-500 mb-3">Orders close automatically at this time. Leave blank to close manually.</p>
          <input
            type="datetime-local"
            value={deadlineInput}
            onChange={e => setDeadlineInput(e.target.value)}
            onBlur={handleDeadlineBlur}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-base focus:outline-none focus:border-[#CC0000] transition-colors"
          />
          {settings.order_deadline && (
            <div className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-amber-800">
                ⏰ Auto-closes: {new Date(settings.order_deadline).toLocaleString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </p>
              <button onClick={onClearDeadline} className="text-sm text-red-500 font-bold hover:text-red-700 ml-4 flex-shrink-0">
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Cities we serve */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
          <span className="w-6 h-6 rounded-full bg-[#CC0000] text-white text-xs font-black flex items-center justify-center flex-shrink-0">3</span>
          <p className="font-bold text-gray-700 text-sm">Cities we serve</p>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-500 mb-4">
            These appear on the customer order form. Cities stay here permanently — they don't disappear when a market date expires.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {settings.served_cities.length === 0 && (
              <p className="text-gray-400 text-sm italic">No cities yet — add one below.</p>
            )}
            {settings.served_cities.map(city => (
              <span key={city} className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 text-gray-800 text-sm font-semibold px-3 py-1.5 rounded-full">
                {city}
                <button
                  onClick={() => onRemoveCity(city)}
                  className="text-gray-400 hover:text-red-500 leading-none transition-colors ml-0.5"
                  aria-label={`Remove ${city}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newCityInput}
              onChange={e => setNewCityInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCity()}
              placeholder="e.g. Hendersonville, NC"
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-[#CC0000] transition-colors"
            />
            <button
              onClick={handleAddCity}
              disabled={!newCityInput.trim()}
              className="px-4 py-2.5 bg-[#CC0000] text-white text-sm font-bold rounded-xl disabled:opacity-40 hover:bg-[#AA0000] transition-colors">
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Step 4: Market dates */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100">
          <span className="w-6 h-6 rounded-full bg-[#CC0000] text-white text-xs font-black flex items-center justify-center flex-shrink-0">4</span>
          <p className="font-bold text-gray-700 text-sm">Market dates</p>
        </div>
        <div className="p-5">

          {/* Existing dates list */}
          {settings.delivery_dates.length > 0 ? (
            <div className="space-y-2 mb-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current dates</p>
              {settings.delivery_dates.map((d, idx) => editingIdx === idx ? (
                <DateForm
                  key={d.date + '|' + idx}
                  initial={d}
                  servedCities={settings.served_cities}
                  pastTimes={pastTimes}
                  pastAddresses={pastAddresses}
                  saving={savingDates}
                  onSave={async (updated) => {
                    await onEditDate(idx, updated);
                    setEditingIdx(null);
                  }}
                  onCancel={() => setEditingIdx(null)}
                />
              ) : (
                <div key={d.date + '|' + idx} className="flex items-start gap-3 bg-gradient-to-r from-gray-50 to-white rounded-xl px-4 py-4 border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900">{d.label}</p>
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 flex-shrink-0" />
                      {d.cities.includes('all') ? 'All cities' : d.cities.join(', ')}
                    </p>
                    {d.time && <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 flex-shrink-0 text-[#CC0000]" />{d.time}</p>}
                    {d.location_address && <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[#CC0000]" />{d.location_address}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setEditingIdx(idx)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-lg p-2 transition-colors border border-blue-200">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDeleteDate(idx)}
                      className="bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 rounded-lg p-2 transition-colors border border-red-200">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 mb-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-bold">No market dates yet</p>
              <p className="text-gray-400 text-sm">Add one below</p>
            </div>
          )}

          {/* Add date collapsible */}
          <div className="border-t-2 border-dashed border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => setShowAddDate(v => !v)}
              className="w-full flex items-center justify-between gap-2 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-xl px-4 py-3 transition-colors mb-3">
              <span className="flex items-center gap-2 font-bold text-gray-700 text-sm">
                <Plus className="w-4 h-4 text-[#CC0000]" /> Add a market date
              </span>
              {showAddDate ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showAddDate && (
              <AddDateFlow
                servedCities={settings.served_cities}
                pastTimes={pastTimes}
                pastAddresses={pastAddresses}
                usedCombos={usedCombos}
                saving={savingDates}
                onSave={async (date) => {
                  await onAddDate(date);
                  setShowAddDate(false);
                }}
                onCancel={() => setShowAddDate(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AddDateFlow: "Use Again" cards → DateForm ──────────────────────────────

interface AddDateFlowProps {
  servedCities: string[];
  pastTimes: string[];
  pastAddresses: string[];
  usedCombos: { time: string; location_address: string; cities: string[] }[];
  saving: boolean;
  onSave: (date: DeliveryDate) => Promise<void>;
  onCancel: () => void;
}

function AddDateFlow({ servedCities, pastTimes, pastAddresses, usedCombos, saving, onSave, onCancel }: AddDateFlowProps) {
  // prefill starts null = show Use Again cards (if any); or empty = blank form
  const [prefill, setPrefill] = useState<Partial<DeliveryDate> | null>(
    usedCombos.length === 0 ? {} : null
  );

  // If no combos, skip directly to form
  if (prefill !== null) {
    return (
      <DateForm
        initial={{
          date: '',
          label: '',
          cities: prefill.cities ?? [],
          time: prefill.time ?? '',
          location_address: prefill.location_address ?? '',
        }}
        servedCities={servedCities}
        pastTimes={pastTimes}
        pastAddresses={pastAddresses}
        saving={saving}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
  }

  // Show "Use Again" cards
  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Use a recent setup:</p>
      {usedCombos.map((combo, i) => (
        <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start justify-between gap-3">
          <div className="text-sm text-gray-700 space-y-0.5 flex-1 min-w-0">
            {combo.location_address && <p className="flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5 text-[#CC0000] flex-shrink-0" />{combo.location_address}</p>}
            {combo.time && <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#CC0000] flex-shrink-0" />{combo.time}</p>}
            <p className="flex items-center gap-1.5 text-gray-500">
              <Users className="w-3.5 h-3.5 flex-shrink-0" />
              {combo.cities.includes('all') ? 'All Cities' : combo.cities.join(', ')}
            </p>
          </div>
          <button
            onClick={() => setPrefill({ time: combo.time, location_address: combo.location_address, cities: combo.cities })}
            className="shrink-0 text-xs bg-[#CC0000] text-white px-3 py-1.5 rounded-lg hover:bg-[#AA0000] transition-colors font-bold">
            Use This Setup
          </button>
        </div>
      ))}
      <button
        onClick={() => setPrefill({})}
        className="text-sm text-gray-500 hover:text-gray-700 underline py-1 font-semibold">
        Start Fresh
      </button>
    </div>
  );
}

// ── DateForm sub-component ─────────────────────────────────────────────────

function generateWeeklyDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 7);
  }
  return dates;
}

interface DateFormProps {
  initial: DeliveryDate;
  servedCities: string[];
  pastTimes: string[];
  pastAddresses: string[];
  saving: boolean;
  onSave: (date: DeliveryDate) => Promise<void>;
  onCancel: () => void;
}

function DateForm({ initial, servedCities, pastTimes, pastAddresses, saving, onSave, onCancel }: DateFormProps) {
  const [date, setDate] = useState(initial.date ?? '');
  const [label, setLabel] = useState(initial.label ?? '');
  const [time, setTime] = useState(initial.time ?? '');
  const [address, setAddress] = useState(initial.location_address ?? '');
  const [cities, setCities] = useState<string[]>(initial.cities ?? []);
  const [cityInput, setCityInput] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState('');

  const toggleCity = (city: string) => {
    if (city === 'all') {
      setCities(['all']);
      return;
    }
    setCities(prev => {
      const without = prev.filter(c => c !== 'all' && c !== city);
      return prev.includes(city) ? without : [...without, city];
    });
  };

  const addFreeCity = () => {
    const trimmed = cityInput.trim();
    if (!trimmed || cities.includes(trimmed)) return;
    setCities(prev => [...prev.filter(c => c !== 'all'), trimmed]);
    setCityInput('');
  };

  const handleSave = async () => {
    if (!date || cities.length === 0) return;
    const baseLabel = label || new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
    if (recurring && repeatUntil) {
      for (const d of generateWeeklyDates(date, repeatUntil)) {
        const computedLabel = new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        });
        await onSave({
          date: d,
          label: computedLabel,
          cities,
          time: time.trim() || undefined,
          location_address: address.trim() || undefined,
        });
      }
    } else {
      await onSave({
        date,
        label: baseLabel,
        cities,
        time: time.trim() || undefined,
        location_address: address.trim() || undefined,
      });
    }
  };

  const allSelected = cities.includes('all');

  return (
    <div className="rounded-xl border-2 border-[#CC0000] bg-white p-4 space-y-3">
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Date <span className="text-red-500">*</span></label>
        <input type="date" value={date} onChange={e => {
          const d = e.target.value;
          setDate(d);
          if (d) {
            setLabel(new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
          }
        }}
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors" />
        {label && <p className="text-sm text-gray-500 mt-1.5">Customers will see: <strong>{label}</strong></p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => { setRecurring(r => !r); setRepeatUntil(''); }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${recurring ? 'bg-[#CC0000]' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${recurring ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="text-sm text-gray-700 font-medium">Repeat weekly</span>
      </div>

      {recurring && (
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Repeat until</label>
          <input
            type="date"
            value={repeatUntil}
            onChange={e => setRepeatUntil(e.target.value)}
            min={date}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors"
          />
          {date && repeatUntil && (
            <p className="text-xs text-gray-400 mt-1">
              Will create {generateWeeklyDates(date, repeatUntil).length} date entries
            </p>
          )}
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">🕐 Time</label>
        <input type="text" value={time} onChange={e => setTime(e.target.value)}
          placeholder="e.g. 10:00 AM – 2:00 PM"
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors" />
        {pastTimes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {pastTimes.map(t => (
              <button key={t} type="button" onClick={() => setTime(t)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${time === t ? 'bg-[#CC0000] border-[#CC0000] text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-[#CC0000]/50'}`}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">📍 Pickup Address</label>
        <input type="text" value={address} onChange={e => setAddress(e.target.value)}
          placeholder="e.g. 123 Main St, Marshall, NC"
          className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors" />
        {pastAddresses.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {pastAddresses.map(a => (
              <button key={a} type="button" onClick={() => setAddress(a)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${address === a ? 'bg-[#CC0000] border-[#CC0000] text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-[#CC0000]/50'}`}>
                {a}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Which cities can order for this date? <span className="text-red-500">*</span></label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <button type="button" onClick={() => toggleCity('all')}
            className={`px-2.5 py-1 rounded-full border font-bold text-xs transition-colors ${allSelected ? 'border-[#CC0000] bg-[#CC0000] text-white' : 'border-gray-200 text-gray-600 hover:border-[#CC0000]/50'}`}>
            All Cities
          </button>
          {servedCities.map(city => (
            <button key={city} type="button" onClick={() => toggleCity(city)}
              className={`px-2.5 py-1 rounded-full border font-bold text-xs transition-colors ${!allSelected && cities.includes(city) ? 'border-[#CC0000] bg-[#CC0000] text-white' : 'border-gray-200 text-gray-600 hover:border-[#CC0000]/50'}`}>
              {city}
            </button>
          ))}
          {/* Show currently-selected cities that aren't in servedCities (legacy data) */}
          {!allSelected && cities.filter(c => c !== 'all' && !servedCities.includes(c)).map(city => (
            <span key={city} className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#CC0000] bg-[#CC0000] text-white text-xs font-semibold">
              {city}
              <button type="button" onClick={() => setCities(cities.filter(x => x !== city))} className="hover:opacity-75 leading-none">×</button>
            </span>
          ))}
        </div>
        {/* Free-text city input for dates when served_cities might be empty */}
        {!allSelected && servedCities.length === 0 && (
          <div className="flex gap-2">
            <input
              type="text"
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFreeCity(); } }}
              placeholder="Type a city and press Enter"
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#CC0000] transition-colors"
            />
            <button type="button" onClick={addFreeCity}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 transition-colors">
              Add
            </button>
          </div>
        )}
        {servedCities.length === 0 && cities.length === 0 && (
          <p className="text-xs text-gray-400 italic mt-1">Add cities in the "Cities we serve" section above, or type one here.</p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!date || cities.length === 0 || saving || (recurring && !repeatUntil)}
          className="flex-1 bg-[#CC0000] text-white font-black text-base px-4 py-3 rounded-xl hover:bg-[#AA0000] disabled:opacity-40 transition-colors shadow-sm active:scale-[0.99]">
          {saving ? 'Saving...' : recurring && date && repeatUntil ? `Save ${generateWeeklyDates(date, repeatUntil).length} Dates` : 'Add This Date'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold hover:border-gray-300 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
