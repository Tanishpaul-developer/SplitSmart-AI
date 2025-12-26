
import { Component, ChangeDetectionStrategy, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEvent, Debt } from '../models/types';
import { SettlementService } from '../services/settlement.service';

@Component({
  selector: 'app-settlement-view',
  imports: [CommonModule],
  template: `
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div class="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm relative overflow-hidden">
        <div class="absolute -right-12 -top-12 w-48 h-48 bg-indigo-50/50 rounded-full"></div>
        
        <div class="flex justify-between items-center mb-8 relative z-10">
          <div>
            <h3 class="text-2xl font-black text-slate-900">Settlement Plan</h3>
            <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Minimum Transaction Algorithm</p>
          </div>
          <button 
            (click)="copySummary()"
            class="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2"
          >
            <i class="fas fa-copy"></i> Copy List
          </button>
        </div>

        @if (debts().length === 0) {
          <div class="text-center py-20 relative z-10">
            <div class="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-xl shadow-emerald-50">
              <i class="fas fa-check-double text-3xl"></i>
            </div>
            <h4 class="text-xl font-black text-slate-800">Perfectly Balanced!</h4>
            <p class="text-slate-400 mt-2 font-medium">All members are squared away.</p>
          </div>
        } @else {
          <div class="space-y-4 relative z-10">
            @for (debt of debts(); track debt.from + debt.to) {
              <div class="group flex items-center justify-between p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 hover:border-indigo-100 hover:bg-white hover:shadow-xl transition-all duration-300">
                <div class="flex items-center gap-6">
                  <div class="flex flex-col items-center">
                    <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg">
                      {{ getParticipantName(debt.from).substring(0, 1).toUpperCase() }}
                    </div>
                    <span class="text-[9px] font-black text-slate-400 uppercase mt-2">Payer</span>
                  </div>
                  
                  <div class="flex flex-col items-center px-4">
                    <i class="fas fa-arrow-right-long text-slate-200 text-xl group-hover:text-indigo-400 transition-colors"></i>
                  </div>

                  <div class="flex flex-col items-center">
                    <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black shadow-lg">
                      {{ getParticipantName(debt.to).substring(0, 1).toUpperCase() }}
                    </div>
                    <span class="text-[9px] font-black text-slate-400 uppercase mt-2">Receiver</span>
                  </div>

                  <div class="ml-4 flex flex-col">
                    <span class="text-sm font-black text-slate-800 tracking-tight">{{ getParticipantName(debt.from) }}</span>
                    <span class="text-[10px] text-slate-400 font-bold">owes {{ getParticipantName(debt.to) }}</span>
                  </div>
                </div>

                <div class="text-right flex flex-col items-end">
                  <span class="text-3xl font-black text-slate-900 tracking-tighter">{{ event().baseCurrency }} {{ debt.amount | number:'1.2-2' }}</span>
                  <span class="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1">Pending Transfer</span>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Member Balances Bento Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (p of event().participants; track p.id) {
          @let balance = getPersonBalance(p.id);
          <div class="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm flex flex-col">
            <div class="flex justify-between items-start mb-6">
              <div class="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 border border-slate-100">
                {{ p.name.substring(0, 1).toUpperCase() }}
              </div>
              <span 
                class="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm"
                [class.bg-emerald-50]="balance >= 0"
                [class.text-emerald-600]="balance >= 0"
                [class.bg-red-50]="balance < 0"
                [class.text-red-600]="balance < 0"
              >
                {{ balance >= 0 ? 'Surplus' : 'Deficit' }}
              </span>
            </div>
            
            <h4 class="font-black text-slate-900 text-lg mb-1">{{ p.name }}</h4>
            <div class="mt-auto">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Flow</p>
              <p class="text-2xl font-black tracking-tighter" [class.text-red-500]="balance < 0" [class.text-emerald-500]="balance >= 0">
                {{ balance > 0 ? '+' : (balance < 0 ? '-' : '') }}{{ event().baseCurrency }} {{ Math.abs(balance) | number:'1.2-2' }}
              </p>
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
      const totalCost = (Object.values(shares) as number[]).reduce((a: number, b: number) => a + b, 0);
      if (exp.payerId === pId) balance += totalCost;
      if (shares[pId]) balance -= (shares[pId] || 0);
    });
    return balance;
  }

  copySummary() {
    const summary = this.debts().map(d => 
      `${this.getParticipantName(d.from)} → ${this.getParticipantName(d.to)}: ${this.event().baseCurrency} ${d.amount.toFixed(2)}`
    ).join('\n');
    navigator.clipboard.writeText(`Settlement Report for ${this.event().name}:\n\n${summary || 'Settled.'}`)
      .then(() => alert('Summary copied!'));
  }
}
