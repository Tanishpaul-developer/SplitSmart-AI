
import { Component, ChangeDetectionStrategy, inject, signal, input, output, effect, computed, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppEvent, Expense, SplitType, SplitMember, Adjustment, LineItem, ExpenseCategory } from '../models/types';
import { AppStateService } from '../services/app-state.service';
import { GeminiService } from '../services/gemini.service';
import { ImageGenService } from '../services/image-gen.service';
import { CurrencyService } from '../services/currency.service';

@Component({
  selector: 'app-expense-form',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl overflow-y-auto">
      <div class="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl my-auto animate-in fade-in zoom-in slide-in-from-bottom-8 duration-500 overflow-hidden border border-slate-100">
        
        <!-- Sticky Header with Dual-Action Scan -->
        <div class="p-8 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-20">
          <div class="flex items-center gap-5">
             <div class="relative group">
               @if (icon()) {
                 <img [src]="icon()" class="w-20 h-20 rounded-3xl object-cover shadow-2xl border-4 border-white group-hover:scale-105 transition-transform cursor-pointer" alt="Category Icon">
               } @else {
                 <div class="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-400 border-4 border-white shadow-lg">
                   <i class="fas fa-receipt text-3xl"></i>
                 </div>
               }
               <div class="absolute -bottom-2 -right-2 flex gap-1.5">
                 <button (click)="onCategoryChange()" class="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:scale-110 transition-transform" title="Regenerate AI Icon">
                   <i class="fas fa-magic text-[10px]"></i>
                 </button>
                 <button (click)="triggerIconUpload()" class="bg-white text-slate-600 rounded-full w-8 h-8 flex items-center justify-center shadow-lg border border-slate-100 hover:scale-110 transition-transform" title="Upload Custom Photo">
                   <i class="fas fa-camera text-[10px]"></i>
                 </button>
               </div>
               <input type="file" #iconInput class="hidden" (change)="onIconUpload($event)" accept="image/*">
             </div>
             <div>
               <h2 class="text-3xl font-black text-slate-900 leading-tight">{{ expenseToEdit() ? 'Update' : 'Log' }} Expense</h2>
               <p class="text-[10px] text-indigo-500 font-black uppercase tracking-[0.2em] mt-1">Smart Extraction Active</p>
             </div>
          </div>
          <div class="flex items-center gap-3">
             <button (click)="triggerFileInput()" class="bg-slate-900 text-white text-sm font-black px-6 py-4 rounded-2xl shadow-xl hover:bg-indigo-600 transition-all flex items-center gap-3 group">
               @if (isScanning()) {
                 <i class="fas fa-spinner fa-spin"></i>
                 <span>Scanning...</span>
               } @else {
                 <i class="fas fa-expand-alt group-hover:scale-125 transition-transform"></i>
                 <span class="hidden sm:inline">Scan / Upload Receipt</span>
               }
             </button>
             <input type="file" #fileInput class="hidden" (change)="onFileSelected($event)" accept="image/*">
             <button (click)="close.emit()" class="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all text-xl"><i class="fas fa-times"></i></button>
          </div>
        </div>

        <div class="p-8 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          <!-- Modern Composition Visualization -->
          <section class="space-y-4 p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
            <div class="flex justify-between items-center">
              <h3 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Bill Architecture</h3>
              <span class="text-xs font-black text-indigo-600">{{ currencyCode }} {{ calculatePreviewTotal() | number:'1.2-2' }} Total</span>
            </div>
            
            <div class="flex h-4 w-full rounded-full overflow-hidden bg-slate-200 shadow-inner">
               <div class="h-full bg-indigo-500 transition-all duration-700 ease-out" [style.width]="getBreakdownWidth('base') + '%'"></div>
               <div class="h-full bg-orange-400 transition-all duration-700 ease-out" [style.width]="getBreakdownWidth('tax') + '%'"></div>
               <div class="h-full bg-emerald-400 transition-all duration-700 ease-out" [style.width]="getBreakdownWidth('tip') + '%'"></div>
               <div class="h-full bg-sky-400 transition-all duration-700 ease-out" [style.width]="getBreakdownWidth('fee') + '%'"></div>
               <div class="h-full bg-red-400 transition-all duration-700 ease-out" [style.width]="getBreakdownWidth('discount') + '%'"></div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
               <div class="flex flex-col">
                 <div class="flex items-center gap-1.5 mb-1"><span class="w-2 h-2 rounded-full bg-indigo-500"></span><span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base</span></div>
                 <span class="text-xs font-bold text-slate-900">{{ currencyCode }} {{ amount | number:'1.2-2' }}</span>
               </div>
               @for (adj of adjustments.slice(0, 3); track adj.id) {
                 <div class="flex flex-col">
                   <div class="flex items-center gap-1.5 mb-1">
                     <span class="w-2 h-2 rounded-full" [class.bg-orange-400]="adj.type === 'tax'" [class.bg-emerald-400]="adj.type === 'tip'" [class.bg-sky-400]="adj.type === 'fee' || adj.type === 'service_fee'" [class.bg-red-400]="adj.type === 'discount'"></span>
                     <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">{{ adj.name || adj.type }}</span>
                   </div>
                   <span class="text-xs font-bold text-slate-900">{{ currencyCode }} {{ getAdjustmentValue(adj) | number:'1.2-2' }}</span>
                 </div>
               }
            </div>
          </section>

          <!-- Step 1: Core Details -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section class="space-y-5">
              <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                Description & Dates
              </h3>
              <div class="space-y-4">
                <div class="space-y-1">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Merchant / Title</label>
                  <input type="text" [(ngModel)]="desc" placeholder="Dinner, Flight, etc." class="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white text-sm font-bold outline-none transition-all">
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                    <select [(ngModel)]="category" (change)="onCategoryChange()" class="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white text-sm font-bold outline-none transition-all">
                      @for (cat of categories; track cat) {
                        <option [value]="cat">{{ cat }}</option>
                      }
                    </select>
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                    <input type="date" [(ngModel)]="dateStr" class="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white text-sm font-bold outline-none transition-all">
                  </div>
                </div>
              </div>
            </section>

            <section class="space-y-5">
              <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                Pricing & Payer
              </h3>
              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                    <input type="number" [(ngModel)]="amount" class="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white text-sm font-bold outline-none transition-all">
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Currency</label>
                    <select [(ngModel)]="currencyCode" class="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white text-sm font-bold outline-none transition-all">
                      @for (cur of currencyService.getSymbols(); track cur) {
                        <option [value]="cur">{{ cur }}</option>
                      }
                    </select>
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Who paid?</label>
                  <select [(ngModel)]="payerId" class="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white text-sm font-bold outline-none transition-all">
                    @for (p of event().participants; track p.id) {
                      <option [value]="p.id">{{ p.name }}</option>
                    }
                  </select>
                </div>
              </div>
            </section>
          </div>

          <!-- Step 2: Custom Splitting Engine -->
          <section class="space-y-6 pt-4 border-t border-slate-50">
            <div class="flex justify-between items-center">
              <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                Split Rules
              </h3>
              <div class="flex gap-4">
                <button (click)="resetSplits('equal')" class="text-[10px] text-indigo-600 font-black uppercase tracking-widest hover:underline transition-all">Split Equally</button>
                <button (click)="clearSplits()" class="text-[10px] text-red-500 font-black uppercase tracking-widest hover:underline transition-all">Clear All</button>
              </div>
            </div>

            <div class="flex p-1 bg-slate-100 rounded-2xl w-full sm:w-fit overflow-x-auto mb-6">
              @for (type of ['equal', 'percentage', 'shares', 'custom']; track type) {
                <button (click)="setSplitType(type)" class="px-8 py-3 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap tracking-widest" [class.bg-white]="splitType === type" [class.shadow-md]="splitType === type" [class.text-indigo-600]="splitType === type" [class.text-slate-500]="splitType !== type">
                  {{ type }}
                </button>
              }
            </div>

            <!-- Validation Progress -->
            @if (splitType === 'percentage' || splitType === 'custom') {
              <div class="p-5 rounded-3xl text-xs font-bold transition-all border-2 mb-6" [class.bg-emerald-50]="isSplitValid()" [class.border-emerald-100]="isSplitValid()" [class.bg-red-50]="!isSplitValid()" [class.border-red-100]="!isSplitValid()">
                <div class="flex justify-between items-center mb-3">
                  <span class="uppercase tracking-[0.2em] text-[10px] text-slate-400">Assignment Balance</span>
                  <span class="font-black" [class.text-emerald-600]="isSplitValid()" [class.text-red-600]="!isSplitValid()">
                    {{ getSplitTotal() | number:'1.1-2' }}{{ splitType === 'percentage' ? '%' : currencyCode }}
                  </span>
                </div>
                <div class="w-full bg-slate-200/50 rounded-full h-3 overflow-hidden shadow-inner">
                  <div class="h-full transition-all duration-700 ease-out" [class.bg-emerald-500]="isSplitValid()" [class.bg-red-500]="!isSplitValid()" [style.width]="getSplitProgress() + '%'"></div>
                </div>
                @if (!isSplitValid()) {
                  <p class="mt-3 text-[9px] uppercase tracking-widest font-black text-red-500 flex items-center gap-2">
                    <i class="fas fa-circle-info"></i>
                    {{ getSplitRemainingText() }}
                  </p>
                }
              </div>
            }

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              @for (p of event().participants; track p.id) {
                @let split = getSplitFor(p.id);
                <div class="group flex items-center justify-between p-5 rounded-[1.5rem] bg-white border-2 border-slate-50 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50 transition-all">
                  <div class="flex items-center gap-4">
                    <div class="relative">
                      <input type="checkbox" [checked]="isParticipantInvolved(p.id)" (change)="toggleParticipant(p.id)" class="w-6 h-6 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-4 focus:ring-indigo-50 cursor-pointer transition-all">
                    </div>
                    <div class="flex flex-col">
                      <span class="font-black text-slate-800 tracking-tight" [class.opacity-40]="!isParticipantInvolved(p.id)">{{ p.name }}</span>
                      @if (isParticipantInvolved(p.id) && splitType !== 'equal') {
                         <span class="text-[9px] text-indigo-400 font-black uppercase tracking-widest mt-0.5">Share: {{ currencyCode }} {{ getEstimatedPersonShare(p.id) | number:'1.2-2' }}</span>
                      }
                    </div>
                  </div>
                  
                  @if (isParticipantInvolved(p.id)) {
                    <div class="flex items-center gap-3">
                      @if (splitType !== 'equal') {
                        <button (click)="fillRemaining(p.id)" class="text-[9px] text-indigo-600 font-black uppercase tracking-widest hover:bg-indigo-50 px-2 py-1 rounded-lg transition-all opacity-0 group-hover:opacity-100">Fill</button>
                      }
                      <div class="w-24 relative">
                        <input 
                          type="number" 
                          [(ngModel)]="split.value"
                          [disabled]="splitType === 'equal'"
                          class="w-full pl-3 pr-7 py-3 rounded-xl border-2 border-slate-50 text-right font-black text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-200 outline-none transition-all"
                        >
                        <span class="absolute right-2 top-3.5 text-[8px] font-black text-slate-300 uppercase select-none pointer-events-none">
                          {{ splitType === 'percentage' ? '%' : (splitType === 'shares' ? 'sh' : currencyCode) }}
                        </span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </section>
        </div>

        <!-- Sticky Interaction Footer -->
        <div class="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 rounded-b-[2.5rem]">
          <div class="flex items-center gap-6 text-center sm:text-left">
             <div class="flex flex-col">
               <span class="text-[10px] uppercase font-black tracking-[0.3em] text-slate-400 mb-1">Total Bill</span>
               <span class="text-4xl font-black text-slate-900 tracking-tighter">{{ currencyCode }} {{ calculatePreviewTotal() | number:'1.2-2' }}</span>
             </div>
             <div class="hidden sm:block w-px h-12 bg-slate-200"></div>
             <div class="hidden sm:flex flex-col">
               <span class="text-[10px] uppercase font-black tracking-[0.3em] text-slate-400 mb-1">Splitting</span>
               <span class="text-sm font-bold text-slate-500">{{ splits.length }} Members Involved</span>
             </div>
          </div>
          <div class="flex gap-4 w-full sm:w-auto">
            <button (click)="close.emit()" class="flex-1 sm:flex-none px-10 py-4 rounded-2xl bg-white border-2 border-slate-200 font-black text-slate-400 hover:text-slate-600 transition-all">Cancel</button>
            <button (click)="save()" [disabled]="!isSplitValid()" class="flex-1 sm:flex-none px-12 py-4 rounded-2xl bg-indigo-600 text-white font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-20 disabled:translate-y-0">
              Finalize & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseFormComponent {
  private state = inject(AppStateService);
  private gemini = inject(GeminiService);
  private imageGen = inject(ImageGenService);
  public currencyService = inject(CurrencyService);

  event = input.required<AppEvent>();
  expenseToEdit = input<Expense | null>(null);
  close = output();

  fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  iconInputRef = viewChild<ElementRef<HTMLInputElement>>('iconInput');

  categories: ExpenseCategory[] = ['Food', 'Transport', 'Accommodation', 'Entertainment', 'Other'];
  
  desc = '';
  amount = 0;
  currencyCode = 'USD';
  category: ExpenseCategory = 'Other';
  icon = signal<string | null>(null);
  payerId = '';
  dateStr = new Date().toISOString().split('T')[0];
  splitType: SplitType = 'equal';
  splits: SplitMember[] = [];
  adjustments: Adjustment[] = [];
  items: LineItem[] = [];
  isScanning = signal(false);

  constructor() {
    effect(() => {
      const exp = this.expenseToEdit();
      const evt = this.event();
      if (exp) {
        this.desc = exp.description;
        this.amount = exp.totalAmount;
        this.currencyCode = exp.currency || evt.baseCurrency;
        this.category = exp.category || 'Other';
        this.icon.set(exp.icon || null);
        this.payerId = exp.payerId;
        this.dateStr = new Date(exp.date).toISOString().split('T')[0];
        this.splitType = exp.splitType;
        this.splits = JSON.parse(JSON.stringify(exp.splits));
        this.adjustments = JSON.parse(JSON.stringify(exp.adjustments));
        this.items = JSON.parse(JSON.stringify(exp.items || []));
      } else {
        this.currencyCode = evt.baseCurrency;
        if (evt.participants.length > 0) {
          this.payerId = evt.participants[0].id;
          this.splits = evt.participants.map(p => ({ participantId: p.id, value: 0 }));
        }
      }
    });
  }

  async onCategoryChange() {
    if (this.category) {
      this.isScanning.set(true);
      const newIcon = await this.imageGen.generateCategoryIcon(this.category);
      if (newIcon) this.icon.set(newIcon);
      this.isScanning.set(false);
    }
  }

  triggerIconUpload() {
    this.iconInputRef()?.nativeElement.click();
  }

  onIconUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.icon.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  getAdjustmentValue(adj: Adjustment): number {
    return adj.isPercentage ? (this.amount * (adj.amount / 100)) : adj.amount;
  }

  getBreakdownWidth(type: 'base' | 'tax' | 'tip' | 'fee' | 'discount'): number {
    const total = this.calculatePreviewTotal() || 1;
    if (type === 'base') return (this.amount / total) * 100;
    const relevantAdjs = this.adjustments.filter(a => {
        if (type === 'fee') return a.type === 'fee' || a.type === 'service_fee';
        return a.type === type;
    });
    const sum = relevantAdjs.reduce((acc, a) => acc + this.getAdjustmentValue(a), 0);
    return (sum / total) * 100;
  }

  getSplitFor(pId: string): SplitMember {
    let split = this.splits.find(s => s.participantId === pId);
    if (!split) {
      split = { participantId: pId, value: 0 };
      this.splits.push(split);
    }
    return split;
  }

  isParticipantInvolved(pId: string): boolean {
    return this.splits.some(s => s.participantId === pId);
  }

  toggleParticipant(pId: string) {
    if (this.isParticipantInvolved(pId)) {
      this.splits = this.splits.filter(s => s.participantId !== pId);
    } else {
      this.splits.push({ participantId: pId, value: 0 });
    }
  }

  setSplitType(type: string) {
    this.splitType = type as SplitType;
    if (type === 'equal') {
       this.splits.forEach(s => s.value = 0);
    }
  }

  resetSplits(type: SplitType) {
    this.splitType = type;
    this.splits = this.event().participants.map(p => ({ participantId: p.id, value: 0 }));
  }

  clearSplits() {
    this.splits = [];
  }

  getSplitTotal(): number {
    return this.splits.reduce((acc, s) => acc + (s.value || 0), 0);
  }

  getSplitProgress(): number {
    const total = this.getSplitTotal();
    if (this.splitType === 'percentage') return Math.min(100, (total / 100) * 100);
    if (this.splitType === 'custom') return Math.min(100, (total / (this.amount || 1)) * 100);
    return 100;
  }

  isSplitValid(): boolean {
    if (this.splits.length === 0) return false;
    if (this.splitType === 'equal' || this.splitType === 'shares') return true;
    const total = this.getSplitTotal();
    if (this.splitType === 'percentage') return Math.abs(total - 100) < 0.1;
    if (this.splitType === 'custom') return Math.abs(total - this.amount) < 0.1;
    return false;
  }

  getSplitRemainingText(): string {
    const total = this.getSplitTotal();
    if (this.splitType === 'percentage') return `${(100 - total).toFixed(1)}% remaining`;
    if (this.splitType === 'custom') return `${(this.amount - total).toFixed(2)} ${this.currencyCode} remaining`;
    return '';
  }

  getEstimatedPersonShare(pId: string): number {
    const base = this.calculatePreviewTotal();
    const involvedCount = this.splits.length;
    if (involvedCount === 0) return 0;
    if (this.splitType === 'equal') return base / involvedCount;
    const split = this.getSplitFor(pId);
    if (this.splitType === 'percentage') return (base * split.value) / 100;
    if (this.splitType === 'shares') {
       const totalShares = this.getSplitTotal() || 1;
       return (base * split.value) / totalShares;
    }
    return split.value;
  }

  fillRemaining(pId: string) {
    const currentTotal = this.getSplitTotal();
    const split = this.getSplitFor(pId);
    if (this.splitType === 'percentage') {
      split.value = Math.max(0, split.value + (100 - currentTotal));
    } else if (this.splitType === 'custom') {
      split.value = Math.max(0, split.value + (this.amount - currentTotal));
    }
  }

  addAdjustment() {
    this.adjustments.push({
      id: crypto.randomUUID(),
      name: '',
      amount: 0,
      type: 'tax',
      isPercentage: true,
      appliedBeforeSplit: true
    });
  }

  removeAdjustment(idx: number) {
    this.adjustments.splice(idx, 1);
  }

  calculatePreviewTotal(): number {
    let total = this.amount;
    this.adjustments.forEach(adj => {
      const val = adj.isPercentage ? (this.amount * (adj.amount / 100)) : adj.amount;
      if (adj.type === 'discount') total -= val;
      else total += val;
    });
    return Math.max(0, total);
  }

  triggerFileInput() {
    this.fileInputRef()?.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isScanning.set(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const result = await this.gemini.scanReceipt(base64);
      if (result) {
        this.desc = result.merchant || this.desc;
        this.amount = result.total || this.amount;
        this.currencyCode = result.currency || this.currencyCode;
        this.category = (result.category as ExpenseCategory) || this.category;
        
        this.adjustments = [];
        this.items = [];

        if (result.tax) this.adjustments.push({ id: crypto.randomUUID(), name: 'Tax', amount: result.tax, type: 'tax', isPercentage: false, appliedBeforeSplit: true });
        if (result.tip) this.adjustments.push({ id: crypto.randomUUID(), name: 'Tip', amount: result.tip, type: 'tip', isPercentage: false, appliedBeforeSplit: true });
        if (result.service_fee) this.adjustments.push({ id: crypto.randomUUID(), name: 'Service Fee', amount: result.service_fee, type: 'service_fee', isPercentage: false, appliedBeforeSplit: true });

        if (result.items) {
          this.items = result.items.map((i: any) => ({
            id: crypto.randomUUID(),
            name: i.name,
            price: i.price
          }));
        }
        this.onCategoryChange();
      }
      this.isScanning.set(false);
    };
    reader.readAsDataURL(file);
  }

  save() {
    if (!this.desc.trim() || !this.payerId || !this.isSplitValid()) return;

    const expense: Expense = {
      id: this.expenseToEdit()?.id || crypto.randomUUID(),
      description: this.desc,
      totalAmount: this.amount,
      currency: this.currencyCode,
      category: this.category,
      icon: this.icon() || undefined,
      date: new Date(this.dateStr).getTime(),
      payerId: this.payerId,
      splitType: this.splitType,
      splits: this.splits,
      adjustments: this.adjustments,
      items: this.items
    };

    if (this.expenseToEdit()) {
      this.state.updateExpense(this.event().id, expense);
    } else {
      this.state.addExpense(this.event().id, expense);
    }
    this.close.emit();
  }
}
