
import { Component, ChangeDetectionStrategy, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEvent, Debt } from '../models/types';
import { SettlementService } from '../services/settlement.service';

@Component({
  selector: 'app-settlement-view',
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-slate-900">Optimal Settlement Plan</h3>
          <button 
            (click)="copySummary()"
            class="text-indigo-600 text-sm font-bold flex items-center gap-2 hover:underline"
          >
            <i class="fas fa-copy"></i> Copy Summary
          </button>
        </div>

        @if (debts().length === 0) {
          <div class="text-center py-8">
            <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
              <i class="fas fa-check-circle text-2xl"></i>
            </div>
            <p class="text-slate-500 font-medium">All balances are settled!</p>
          </div>
        } @else {
          <div class="space-y-4">
            @for (debt of debts(); track debt.from + debt.to) {
              <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div class="flex items-center gap-4">
                  <div class="text-center">
                    <p class="text-xs font-bold text-slate-400 uppercase">From</p>
                    <p class="font-bold text-slate-900">{{ getParticipantName(debt.from) }}</p>
                  </div>
                  <i class="fas fa-arrow-right text-indigo-400"></i>
                  <div class="text-center">
                    <p class="text-xs font-bold text-slate-400 uppercase">To</p>
                    <p class="font-bold text-slate-900">{{ getParticipantName(debt.to) }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest">Amount</p>
                  <p class="text-xl font-extrabold text-slate-900">
                    {{ event().currency }} {{ debt.amount | number:'1.2-2' }}
                  </p>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Individual Summaries -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        @for (p of event().participants; track p.id) {
          @let balance = getPersonBalance(p.id);
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div class="flex justify-between items-center mb-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">
                  {{ p.name.substring(0, 2).toUpperCase() }}
                </div>
                <h4 class="font-bold text-slate-800">{{ p.name }}</h4>
              </div>
              <span 
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                [class.bg-green-100]="balance >= 0"
                [class.text-green-600]="balance >= 0"
                [class.bg-red-100]="balance < 0"
                [class.text-red-600]="balance < 0"
              >
                {{ balance >= 0 ? 'Receiving' : 'Owes' }}
              </span>
            </div>
            <div class="flex justify-between items-end">
              <span class="text-xs text-slate-400">Net Balance</span>
              <span class="text-lg font-bold" [class.text-red-500]="balance < 0" [class.text-green-600]="balance >= 0">
                {{ event().currency }} {{ Math.abs(balance) | number:'1.2-2' }}
              </span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettlementViewComponent {
  private settlementService = inject(SettlementService);
  
  event = input.required<AppEvent>();
  debts = computed(() => this.settlementService.calculateSettlements(this.event()));
  Math = Math;

  getParticipantName(id: string): string {
    return this.event().participants.find(p => p.id === id)?.name || 'Unknown';
  }

  getPersonBalance(pId: string): number {
    const event = this.event();
    let balance = 0;

    event.expenses.forEach(exp => {
      const shares = this.settlementService.calculateParticipantShares(exp);
      // Fix: Cast Object.values to number[] and explicitly type reduce params to ensure result is number not unknown
      const totalCost = (Object.values(shares) as number[]).reduce((a: number, b: number) => a + b, 0);

      if (exp.payerId === pId) {
        balance += totalCost;
      }
      
      if (shares[pId]) {
        balance -= (shares[pId] || 0);
      }
    });

    return balance;
  }

  copySummary() {
    const summary = this.debts().map(d => 
      `${this.getParticipantName(d.from)} pays ${this.event().currency} ${d.amount.toFixed(2)} to ${this.getParticipantName(d.to)}`
    ).join('\n');
    
    navigator.clipboard.writeText(`Settlement Summary for ${this.event().name}:\n\n${summary || 'No debts found.'}`)
      .then(() => alert('Summary copied to clipboard!'));
  }
}
