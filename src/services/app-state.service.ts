
import { Injectable, signal, computed, effect } from '@angular/core';
import { AppEvent, Participant, Expense } from '../models/types';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly STORAGE_KEY = 'splitsmart_ai_data';
  
  events = signal<AppEvent[]>(this.loadFromStorage());

  constructor() {
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.events()));
    });
  }

  private loadFromStorage(): AppEvent[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  createEvent(name: string, description: string, baseCurrency: string) {
    const newEvent: AppEvent = {
      id: crypto.randomUUID(),
      name,
      description,
      baseCurrency,
      participants: [],
      expenses: [],
      createdAt: Date.now()
    };
    this.events.update(prev => [newEvent, ...prev]);
    return newEvent;
  }

  updateEventReportingCurrency(eventId: string, currency: string) {
    this.events.update(prev => prev.map(e => e.id === eventId ? { ...e, baseCurrency: currency } : e));
  }

  deleteEvent(id: string) {
    this.events.update(prev => prev.filter(e => e.id !== id));
  }

  addParticipant(eventId: string, name: string) {
    this.events.update(prev => prev.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          participants: [...e.participants, { id: crypto.randomUUID(), name }]
        };
      }
      return e;
    }));
  }

  removeParticipant(eventId: string, pId: string) {
    this.events.update(prev => prev.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          participants: e.participants.filter(p => p.id !== pId),
          expenses: e.expenses.map(ex => ({
            ...ex,
            splits: ex.splits.filter(s => s.participantId !== pId)
          }))
        };
      }
      return e;
    }));
  }

  addExpense(eventId: string, expense: Expense) {
    this.events.update(prev => prev.map(e => {
      if (e.id === eventId) {
        return { ...e, expenses: [expense, ...e.expenses] };
      }
      return e;
    }));
  }

  updateExpense(eventId: string, expense: Expense) {
    this.events.update(prev => prev.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          expenses: e.expenses.map(ex => ex.id === expense.id ? expense : ex)
        };
      }
      return e;
    }));
  }

  deleteExpense(eventId: string, expenseId: string) {
    this.events.update(prev => prev.map(e => {
      if (e.id === eventId) {
        return { ...e, expenses: e.expenses.filter(ex => ex.id !== expenseId) };
      }
      return e;
    }));
  }

  getEvent(id: string) {
    return computed(() => this.events().find(e => e.id === id));
  }
}
