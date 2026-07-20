import { useState, useCallback } from 'react';
import { CATEGORIES, DEFAULT_CHIP_AMOUNTS } from '../utils/constants';

function getStoredJson(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

export function useSettings() {
  // Currency
  const [currency, setCurrencyState] = useState(
    () => localStorage.getItem('app_currency') || 'INR'
  );

  const setCurrency = useCallback((code) => {
    localStorage.setItem('app_currency', code);
    setCurrencyState(code);
  }, []);

  // Theme Preference: 'dark' | 'light' | 'system'
  const [themePref, setThemePrefState] = useState(
    () => localStorage.getItem('app_theme_pref') || 'dark'
  );

  const setThemePref = useCallback((pref) => {
    localStorage.setItem('app_theme_pref', pref);
    setThemePrefState(pref);
    if (pref === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
      localStorage.setItem('expense-tracker-theme', systemDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', pref);
      localStorage.setItem('expense-tracker-theme', pref);
    }
  }, []);

  // Quick-Save Chip Amounts
  const [chipAmounts, setChipAmountsState] = useState(
    () => getStoredJson('app_chip_amounts', DEFAULT_CHIP_AMOUNTS)
  );

  const setChipAmounts = useCallback((amounts) => {
    localStorage.setItem('app_chip_amounts', JSON.stringify(amounts));
    setChipAmountsState(amounts);
  }, []);

  // Hidden Categories
  const [hiddenCategories, setHiddenCategoriesState] = useState(
    () => getStoredJson('app_hidden_categories', [])
  );

  const toggleCategoryVisibility = useCallback((category) => {
    setHiddenCategoriesState(prev => {
      const next = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category];
      localStorage.setItem('app_hidden_categories', JSON.stringify(next));
      return next;
    });
  }, []);

  // Custom Categories
  const [customCategories, setCustomCategoriesState] = useState(
    () => getStoredJson('app_custom_categories', [])
  );

  const addCustomCategory = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomCategoriesState(prev => {
      const next = [...prev, trimmed];
      localStorage.setItem('app_custom_categories', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeCustomCategory = useCallback((name) => {
    setCustomCategoriesState(prev => {
      const next = prev.filter(c => c !== name);
      localStorage.setItem('app_custom_categories', JSON.stringify(next));
      return next;
    });
  }, []);

  // Computed: all categories merged and filtered
  const allCategories = [...CATEGORIES, ...customCategories];
  const visibleCategories = allCategories.filter(c => !hiddenCategories.includes(c));

  return {
    currency, setCurrency,
    themePref, setThemePref,
    chipAmounts, setChipAmounts,
    hiddenCategories, toggleCategoryVisibility,
    customCategories, addCustomCategory, removeCustomCategory,
    allCategories,
    visibleCategories,
  };
}
