import { create } from "zustand";
import { STORAGE_KEYS } from "@/constants/storage";
import { DEFAULT_THEME_PRESET, isThemePresetKey, type ThemePresetKey } from "@/theme";

interface ThemeState {
  preset: ThemePresetKey;
  setPreset: (preset: ThemePresetKey) => void;
}

function readStoredPreset(): ThemePresetKey {
  const stored = localStorage.getItem(STORAGE_KEYS.themePreset);
  return isThemePresetKey(stored) ? stored : DEFAULT_THEME_PRESET;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preset: readStoredPreset(),
  setPreset: (preset) => {
    localStorage.setItem(STORAGE_KEYS.themePreset, preset);
    set({ preset });
  },
}));
