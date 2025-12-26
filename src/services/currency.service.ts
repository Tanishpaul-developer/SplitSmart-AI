
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  // Base internal rates (fallback)
  private rates = signal<Record<string, number>>({
    'USD': 1.0,
    'EUR': 0.92,
    'GBP': 0.79,
    'JPY': 150.0,
  });

  // Allows storing event-specific custom overrides
  private customRates: Record<string, Record<string, number>> = {};

  constructor() {
    this.refreshRates();
  }

  async refreshRates() {
    try {
      const response = await fetch('https://api.frankfurter.app/latest?from=USD');
      const data = await response.json();
      if (data && data.rates) {
        this.rates.set({ 'USD': 1.0, ...data.rates });
      }
    } catch (e) {
      console.warn('Could not fetch live rates, using fallbacks.', e);
    }
  }

  setCustomRate(eventId: string, from: string, rate: number) {
    if (!this.customRates[eventId]) this.customRates[eventId] = {};
    this.customRates[eventId][from] = rate;
  }

  getRate(from: string, to: string, eventId?: string): number {
    const globalRates = this.rates();
    
    // Check for custom override for this specific event
    if (eventId && this.customRates[eventId] && this.customRates[eventId][from] && to === 'USD') {
      return this.customRates[eventId][from];
    }

    // Standard conversion via USD bridge
    const fromRate = globalRates[from] || 1;
    const toRate = globalRates[to] || 1;
    return toRate / fromRate;
  }

  convert(amount: number, from: string, to: string, eventId?: string): number {
    if (from === to) return amount;
    return amount * this.getRate(from, to, eventId);
  }

  getSymbols(): string[] {
    return Object.keys(this.rates());
  }

  getAllRates() {
    return this.rates;
  }
}
