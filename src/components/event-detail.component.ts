
import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../services/app-state.service';
import { SettlementService } from '../services/settlement.service';
import { CurrencyService } from '../services/currency.service';
import { ExpenseFormComponent } from './expense-form.component';
import { SettlementViewComponent } from './settlement-view.component';
import { ExpenseCategory, Expense } from '../models/types';

@Component({
  selector: 'app-event-detail',
  imports: [CommonModule, RouterLink, FormsModule, ExpenseFormComponent, SettlementViewComponent],
  template: `
    @if (event(); as e) {
      <div class="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
        <!-- Event Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div class="flex-1">
            <nav class="flex text-sm text-slate-400 mb-2 font-medium">
              <a routerLink="/" class="hover:text-indigo-600 transition-colors">Events</a>
              <span class="mx-2">/</span>
              <span class="text-slate-600 font-bold">{{ e.name }}</span>
            </nav>
            <div class="flex items-center gap-3">
              <h1 class="text-3xl font-black text-slate-900 tracking-tight">{{ e.name }}</h1>
              <button (click)="showCurrencyManager.set(true)" class="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold hover:bg-indigo-100 transition-colors">
                <i class="fas fa-coins mr-1"></i> Rates
              </button>
            </div>
            <p class="text-slate-500 mt-1">{{ e.description }}</p>
          </div>
          <div class="flex flex-wrap gap-3 items-center">
             <div class="flex flex-col items-end sm:mr-4">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reporting Currency</span>
                <select 
                  [ngModel]="reportingCurrency()"
                  (ngModelChange)="updateReportingCurrency($event)"
                  class="bg-slate-50 border border-slate-200 text-sm font-bold px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  @for (cur of currencyService.getSymbols(); track cur) {
                    <option [value]="cur">{{ cur }}</option>
                  }
                </select>
             </div>
            <button 
              (click)="showExpenseForm.set(true)"
              class="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <i class="fas fa-plus"></i> Add Expense
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Main Content Area -->
          <div class="lg:col-span-8 space-y-6">
            <!-- Tabs & Filters -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                <button 
                  (click)="activeTab.set('expenses')"
                  class="px-6 py-2.5 rounded-xl font-bold transition-all text-sm"
                  [class.bg-white]="activeTab() === 'expenses'"
                  [class.shadow-sm]="activeTab() === 'expenses'"
                  [class.text-indigo-600]="activeTab() === 'expenses'"
                  [class.text-slate-500]="activeTab() !== 'expenses'"
                >
                  Expenses
                </button>
                <button 
                  (click)="activeTab.set('settlement')"
                  class="px-6 py-2.5 rounded-xl font-bold transition-all text-sm"
                  [class.bg-white]="activeTab() === 'settlement'"
                  [class.shadow-sm]="activeTab() === 'settlement'"
                  [class.text-indigo-600]="activeTab() === 'settlement'"
                  [class.text-slate-500]="activeTab() !== 'settlement'"
                >
                  Settlements
                </button>
              </div>

              @if (activeTab() === 'expenses') {
                <div class="flex flex-wrap gap-2 items-center">
                  <select [(ngModel)]="filterCategory" class="text-xs font-bold bg-white border border-slate-100 rounded-xl px-3 py-2 outline-none shadow-sm">
                    <option value="all">All Categories</option>
                    @for (cat of categories; track cat) {
                      <option [value]="cat">{{ cat }}</option>
                    }
                  </select>
                  <select [(ngModel)]="sortBy" class="text-xs font-bold bg-white border border-slate-100 rounded-xl px-3 py-2 outline-none shadow-sm">
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="amount-desc">Highest Amount</option>
                    <option value="amount-asc">Lowest Amount</option>
                  </select>
                </div>
              }
            </div>

            @if (activeTab() === 'expenses') {
              <div class="space-y-4">
                @if (filteredExpenses().length === 0) {
                  <div class="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-100">
                    <div class="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                      <i class="fas fa-filter text-3xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-800">No matching expenses</h3>
                    <p class="text-slate-500 mt-2 mb-6">Try adjusting your filters or add a new bill.</p>
                    <button (click)="resetFilters()" class="text-indigo-600 font-bold hover:underline">Clear all filters</button>
                  </div>
                } @else {
                  @for (exp of filteredExpenses(); track exp.id) {
                    <div class="bg-white p-5 rounded-3xl border border-slate-50 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all flex items-center justify-between group">
                      <div class="flex items-center gap-4">
                        @if (exp.icon) {
                          <img [src]="exp.icon" class="w-14 h-14 rounded-2xl object-cover shadow-sm bg-slate-50" alt="Icon">
                        } @else {
                          <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                            <i class="fas fa-shopping-basket text-xl"></i>
                          </div>
                        }
                        <div>
                          <div class="flex items-center gap-2">
                             <h4 class="font-black text-slate-900">{{ exp.description }}</h4>
                             <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase tracking-wider">{{ exp.category || 'General' }}</span>
                          </div>
                          <div class="text-xs text-slate-400 mt-1 font-medium flex gap-2">
                            <span>Paid by <b>{{ getParticipantName(exp.payerId) }}</b></span>
                            <span>•</span>
                            <span>{{ exp.date | date:'mediumDate' }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="text-right flex items-center gap-6">
                        <div>
                          <p class="text-xl font-black text-slate-900">
                            {{ exp.currency }} {{ settlementService.calculateFinalTotal(exp) | number:'1.2-2' }}
                          </p>
                          @if (exp.currency !== reportingCurrency()) {
                            <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">
                              ≈ {{ reportingCurrency() }} {{ currencyService.convert(settlementService.calculateFinalTotal(exp), exp.currency, reportingCurrency(), e.id) | number:'1.2-2' }}
                            </p>
                          }
                        </div>
                        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button (click)="editExpense(exp)" class="w-10 h-10 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><i class="fas fa-pen text-sm"></i></button>
                          <button (click)="deleteExpense(exp.id)" class="w-10 h-10 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><i class="fas fa-trash text-sm"></i></button>
                        </div>
                      </div>
                    </div>
                  }
                }
              </div>
            } @else {
              <app-settlement-view [event]="e"></app-settlement-view>
            }
          </div>

          <!-- Sidebar -->
          <div class="lg:col-span-4 space-y-6">
            <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div class="flex justify-between items-center mb-6">
                <h3 class="font-black text-lg text-slate-900">Members</h3>
                <span class="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{{ e.participants.length }}</span>
              </div>
              
              <div class="space-y-3 mb-6">
                @for (p of e.participants; track p.id) {
                  <div class="flex items-center justify-between group">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shadow-sm">
                        {{ p.name.substring(0, 1).toUpperCase() }}
                      </div>
                      <span class="text-slate-800 font-bold">{{ p.name }}</span>
                    </div>
                    <button 
                      (click)="removeParticipant(p.id)"
                      class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50"
                    >
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                }
              </div>

              <div class="flex gap-2">
                <input 
                  type="text" 
                  [(ngModel)]="newParticipantName"
                  (keyup.enter)="addParticipant()"
                  placeholder="Invite person..."
                  class="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border-transparent text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                <button 
                  (click)="addParticipant()"
                  class="bg-indigo-600 text-white w-11 h-11 rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <i class="fas fa-user-plus"></i>
                </button>
              </div>
            </div>

             <div class="bg-gradient-to-br from-slate-900 to-indigo-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
               <div class="relative z-10">
                 <h3 class="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Event Financials ({{ reportingCurrency() }})</h3>
                 <div class="text-4xl font-black">{{ reportingCurrency() }} {{ calculateTotalEventAmountInBase() | number:'1.2-2' }}</div>
                 <div class="mt-8 space-y-3">
                   <div class="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                     <span class="text-indigo-200/70 font-medium">Original Bills</span>
                     <span class="font-bold tracking-tight">{{ e.expenses.length }} Receipts</span>
                   </div>
                   <div class="flex justify-between items-center text-sm">
                     <span class="text-indigo-200/70 font-medium">Avg. per person</span>
                     <span class="font-bold tracking-tight">{{ reportingCurrency() }} {{ (calculateTotalEventAmountInBase() / (e.participants.length || 1)) | number:'1.2-2' }}</span>
                   </div>
                 </div>
               </div>
               <div class="absolute -right-8 -bottom-8 opacity-10 text-[12rem] rotate-12">
                 <i class="fas fa-chart-line"></i>
               </div>
             </div>
          </div>
        </div>

        @if (showExpenseForm()) {
          <app-expense-form 
            [event]="e" 
            [expenseToEdit]="expenseToEdit()"
            (close)="onExpenseFormClose()"
          ></app-expense-form>
        }

        @if (showCurrencyManager()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-300">
               <div class="flex justify-between items-center mb-6">
                 <h3 class="text-xl font-black text-slate-900">Exchange Rates</h3>
                 <button (click)="showCurrencyManager.set(false)" class="text-slate-400 hover:text-slate-600"><i class="fas fa-times"></i></button>
               </div>
               
               <p class="text-xs text-slate-500 mb-6 font-medium leading-relaxed">Customize rates for this event. These rates will be used instead of market data for calculations.</p>
               
               <div class="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  @for (cur of currencyService.getSymbols(); track cur) {
                    @if (cur !== reportingCurrency()) {
                      <div class="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                         <span class="text-sm font-bold text-slate-700">1 {{ cur }} = </span>
                         <div class="flex items-center gap-2">
                           <input 
                             type="number" 
                             [value]="currencyService.getRate(cur, reportingCurrency(), e.id)"
                             (change)="updateCustomRate(cur, $event)"
                             class="w-24 text-right px-3 py-1.5 rounded-xl border-none font-black text-indigo-600 bg-white shadow-sm"
                           >
                           <span class="text-xs font-black text-slate-400 uppercase tracking-widest">{{ reportingCurrency() }}</span>
                         </div>
                      </div>
                    }
                  }
               </div>

               <div class="mt-8 flex gap-3">
                 <button (click)="refreshLiveRates()" class="flex-1 bg-indigo-50 text-indigo-600 font-bold py-3 rounded-2xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
                   <i class="fas fa-sync-alt"></i> Fetch Live
                 </button>
                 <button (click)="showCurrencyManager.set(false)" class="flex-1 bg-indigo-600 text-white font-black py-3 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                   Done
                 </button>
               </div>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventDetailComponent {
  private route = inject(ActivatedRoute);
  private state = inject(AppStateService);
  public settlementService = inject(SettlementService);
  public currencyService = inject(CurrencyService);

  eventId = signal<string | null>(null);
  event = computed(() => this.eventId() ? this.state.getEvent(this.eventId()!)() : null);
  reportingCurrency = computed(() => this.event()?.baseCurrency || 'USD');

  activeTab = signal<'expenses' | 'settlement'>('expenses');
  showExpenseForm = signal(false);
  showCurrencyManager = signal(false);
  // Properly type the expense state
  expenseToEdit = signal<Expense | null>(null);
  newParticipantName = '';

  // Filters & Sorting
  filterCategory = signal<string>('all');
  sortBy = signal<string>('date-desc');
  categories: ExpenseCategory[] = ['Food', 'Transport', 'Accommodation', 'Entertainment', 'Other'];

  filteredExpenses = computed(() => {
    const e = this.event();
    if (!e) return [];
    
    let list = [...e.expenses];

    // Filter
    if (this.filterCategory() !== 'all') {
      list = list.filter(exp => exp.category === this.filterCategory());
    }

    // Sort
    list.sort((a, b) => {
      switch (this.sortBy()) {
        case 'date-desc': return b.date - a.date;
        case 'date-asc': return a.date - b.date;
        case 'amount-desc': return this.settlementService.calculateFinalTotal(b) - this.settlementService.calculateFinalTotal(a);
        case 'amount-asc': return this.settlementService.calculateFinalTotal(a) - this.settlementService.calculateFinalTotal(b);
        default: return 0;
      }
    });

    return list;
  });

  constructor() {
    this.route.params.subscribe(params => {
      this.eventId.set(params['id']);
    });
  }

  updateReportingCurrency(cur: string) {
    if (this.eventId()) {
      this.state.updateEventReportingCurrency(this.eventId()!, cur);
    }
  }

  // Improved typing for DOM events
  updateCustomRate(from: string, event: Event) {
    const target = event.target as HTMLInputElement;
    const rate = parseFloat(target.value);
    const eId = this.eventId();
    if (eId && !isNaN(rate)) {
      this.currencyService.setCustomRate(eId, from, rate);
    }
  }

  refreshLiveRates() {
    this.currencyService.refreshRates();
  }

  resetFilters() {
    this.filterCategory.set('all');
    this.sortBy.set('date-desc');
  }

  getParticipantName(id: string): string {
    return this.event()?.participants.find(p => p.id === id)?.name || 'Unknown';
  }

  addParticipant() {
    if (!this.newParticipantName.trim() || !this.eventId()) return;
    this.state.addParticipant(this.eventId()!, this.newParticipantName.trim());
    this.newParticipantName = '';
  }

  removeParticipant(pId: string) {
    if (confirm('Permanently remove this member? This will clear their debt history from this event.')) {
      this.state.removeParticipant(this.eventId()!, pId);
    }
  }

  // Proper typing for expense objects
  editExpense(exp: Expense) {
    this.expenseToEdit.set(exp);
    this.showExpenseForm.set(true);
  }

  deleteExpense(id: string) {
    if (confirm('Permanently delete this bill? This action cannot be reversed.')) {
      this.state.deleteExpense(this.eventId()!, id);
    }
  }

  onExpenseFormClose() {
    this.showExpenseForm.set(false);
    this.expenseToEdit.set(null);
  }

  calculateTotalEventAmountInBase(): number {
    const e = this.event();
    if (!e) return 0;
    const base = this.reportingCurrency();
    return e.expenses.reduce((acc, exp) => {
      const billTotal = this.settlementService.calculateFinalTotal(exp);
      const converted = this.currencyService.convert(billTotal, exp.currency || e.baseCurrency, base, e.id);
      return acc + converted;
    }, 0);
  }
}
