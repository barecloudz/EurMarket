import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface ThemeSettings {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  border_color: string;
}

interface SiteSettings {
  store_name: string;
  logo_url: string | null;
  hero_image_url: string | null;
  contact_email: string;
  default_shipping_cost: number;
  low_stock_threshold: number;
  theme_settings: ThemeSettings | null;
}

interface SettingsState {
  settings: SiteSettings;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<SiteSettings>) => void;
  applyTheme: (theme: ThemeSettings) => void;
}

const defaultTheme: ThemeSettings = {
  primary_color: '#D97706',
  secondary_color: '#B45309',
  accent_color: '#FACC15',
  background_color: '#FAF9F7',
  surface_color: '#FFFFFF',
  text_color: '#1A1A1A',
  border_color: '#E8E2DB',
};

const defaultSettings: SiteSettings = {
  store_name: "European Market",
  logo_url: null,
  hero_image_url: null,
  contact_email: '',
  default_shipping_cost: 5,
  low_stock_threshold: 5,
  theme_settings: null,
};

// Apply theme colors as CSS variables
const applyThemeToDOM = (theme: ThemeSettings) => {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', theme.primary_color);
  root.style.setProperty('--color-secondary', theme.secondary_color);
  root.style.setProperty('--color-accent', theme.accent_color);
  root.style.setProperty('--color-background', theme.background_color);
  root.style.setProperty('--color-surface', theme.surface_color);
  root.style.setProperty('--color-text', theme.text_color);
  root.style.setProperty('--color-border', theme.border_color);

  // Also update body background
  document.body.style.backgroundColor = theme.background_color;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  isLoading: true,

  applyTheme: (theme: ThemeSettings) => {
    applyThemeToDOM(theme);
  },

  fetchSettings: async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data) {
        const dbTheme = data.theme_settings;
        // If DB still has old green branding, use our new defaults
        const isOldGreenTheme = dbTheme?.primary_color === '#2E7D32' || dbTheme?.primary_color === '#1B5E20';
        const themeSettings = (!dbTheme || isOldGreenTheme) ? defaultTheme : dbTheme;

        set({
          settings: {
            store_name: data.store_name === "GENOVA'S" ? 'European Market' : (data.store_name || 'European Market'),
            logo_url: data.logo_url || null,
            hero_image_url: data.hero_image_url || null,
            contact_email: data.contact_email || '',
            default_shipping_cost: data.default_shipping_cost || 5,
            low_stock_threshold: data.low_stock_threshold || 5,
            theme_settings: themeSettings,
          },
        });

        // Apply the theme to the DOM
        applyThemeToDOM(themeSettings);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      // Apply default theme on error
      applyThemeToDOM(defaultTheme);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));

    // If theme was updated, apply it
    if (newSettings.theme_settings) {
      applyThemeToDOM(newSettings.theme_settings);
    }
  },
}));
