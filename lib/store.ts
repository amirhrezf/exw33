import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

export interface Currency {
  code: string
  symbol: string
  name: string
}

export const currencies: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
]

interface CurrencyStore {
  currency: Currency
  setCurrency: (currency: Currency) => void
  formatAmount: (amount: number) => string
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set, get) => ({
      currency: currencies[0], // Default to USD
      setCurrency: (currency: Currency) => set({ currency }),
      formatAmount: (amount: number) => {
        const { currency } = get()
        return `${currency.symbol}${amount.toFixed(2)}`
      },
    }),
    {
      name: 'currency-storage',
    }
  )
)

// Theme store
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

const applyTheme = (theme: 'light' | 'dark') => {
  if (typeof window !== 'undefined') {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: (theme: Theme) => {
        const resolvedTheme = theme === 'system' ? getSystemTheme() : theme
        set({ theme, resolvedTheme })
        applyTheme(resolvedTheme)
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolvedTheme = state.theme === 'system' ? getSystemTheme() : state.theme
          state.resolvedTheme = resolvedTheme
          applyTheme(resolvedTheme)
        }
      },
    }
  )
)

// Initialize theme on client-side
if (typeof window !== 'undefined') {
  const themeStore = useThemeStore.getState()
  const resolvedTheme = themeStore.theme === 'system' ? getSystemTheme() : themeStore.theme
  applyTheme(resolvedTheme)
}
