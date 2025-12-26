
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
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div class="bg-white w-full max-w-3xl rounded-3xl shadow-2xl my-auto animate-in fade-in zoom-in duration-300">
        <!-- Sticky Header -->
        <div class="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-20 rounded-t-3xl">
          <div class="flex items-center gap-4">
             <div class="relative group">
               @if (icon()) {
                 <img [src]="icon()" class="w-14 h-14 rounded-2xl object-cover shadow-md border-2 border-white" alt="Category Icon">
               } @else {
                 <div class="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400 border-2 border-white">
                   <i class="fas fa-receipt text-2xl"></i>
                 </div>
               }
               <div class="absolute -bottom-1 -right-1 flex gap-1">
                 <button (click)="onCategoryChange()" class="bg-white text-indigo-600 rounded-full w-6 h-6 flex items-center justify-center shadow-lg text-[10px] hover:scale-110 transition-transform" title="Regenerate AI Icon">
                   <i class="fas fa-sync-alt"></i>
                 </button>
                 <button (click)="triggerIconUpload()" class="bg-white text-slate-600 rounded-full w-6 h-6 flex items-center justify-center shadow-lg text-[10px] hover:scale-110 transition-transform" title="Upload Custom Icon">
                   <i class="fas fa-upload"></i>
                 </button>
               </div>
               <input type="file" #iconInput class="hidden" (change)="onIconUpload($event)" accept="image/*">
             </div>
             <div>
               <h2 class="text-xl font-black text-slate-900 leading-tight">{{ expenseToEdit() ? 'Edit' : 'New' }} Expense</h2>
               <p class="text-xs text-slate-400 font-medium">Split bills effortlessly with AI.</p>
             </div>
          </div>
          <div class="flex items-center gap-2">
             <button (click)="triggerFileInput()" class="bg-indigo-600 text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
               @if (isScanning()) {
                 <i class="fas fa-spinner fa-spin"></i>
               } @else {
                 <i class="fas fa-camera"></i>
               }
               <span class="hidden sm:inline">{{ isScanning() ? 'Extracting...' : 'Scan / Upload' }}</span>
             </button>
             <input type="file" #fileInput class="hidden" (change)="onFileSelected($event)" accept="image/*">
             <button (click)="close.emit()" class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"><i class="fas fa-times"></i></button>
          </div>
        </div>

        <div class="p-6 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <!-- Cost Breakdown Visual -->
          <section class="space-y-3 bg-slate-50 p-5 rounded-3xl border border-slate-100">
            <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Bill Composition</h3>
            
            <div class="flex h-3 w-full rounded-full overflow-hidden bg-slate-200">
               <div class="h-full bg-indigo-500 transition-all duration-500" [style.width]="getBreakdownWidth('base') + '%'" title="Base Amount"></div>
               <div class="h-full bg-orange-400 transition-all duration-500" [style.width]="getBreakdownWidth('tax') + '%'" title="Tax"></div>
               <div class="h-full bg-green-400 transition-all duration-500" [style.width]="getBreakdownWidth('tip') + '%'" title="Tip"></div>
               <div class="h-full bg-blue-400 transition-all duration-500" [style.width]="getBreakdownWidth('fee') + '%'" title="Fees"></div>
               <div class="h-full bg-red-400 transition-all duration-500" [style.width]="getBreakdownWidth('discount') + '%'" title="Discounts"></div>
            </div>

            <div class="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold uppercase tracking-wider">
               <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-indigo-500"></span> Base: {{ currencyCode }} {{ amount | number:'1.2-2' }}</div>
               @for (adj of adjustments; track adj.id) {
                 <div class="flex items-center gap-1.5">
                   <span class="w-2 h-2 rounded-full" [class.bg-orange-400]="adj.type === 'tax'" [class.bg-green-400]="adj.type === 'tip'" [class.bg-blue-400]="adj.type === 'fee' || adj.type === 'service_fee'" [class.bg-red-400]="adj.type === 'discount'"></span>
                   {{ adj.name || adj.type }}: {{ currencyCode }} {{ getAdjustmentValue(adj) | number:'1.2-2' }}
                 </div>
               }
            </div>
          </section>

          <!-- Step 1: Basic Details -->
          <section class="space-y-4">
            <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">1. Details</h3>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div class="md:col-span-8">
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
                <input type="text" [(ngModel)]="desc" placeholder="e.g. Dinner at Joe's" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border-transparent text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none">
              </div>
              <div class="md:col-span-4">
                 <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                 <select [(ngModel)]="category" (change)="onCategoryChange()" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border-transparent text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none">
                   @for (cat of categories; track cat) {
                     <option [value]="cat">{{ cat }}</option>
                   }
                 </select>
              </div>
              <div class="md:col-span-4">
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Date</label>
                <input type="date" [(ngModel)]="dateStr" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border-transparent text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none">
              </div>
              <div class="md:col-span-4">
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount (Base)</label>
                <input type="number" [(ngModel)]="amount" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border-transparent text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none">
              </div>
              <div class="md:col-span-4">
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Currency</label>
                <select [(ngModel)]="currencyCode" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border-transparent text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none">
                  @for (cur of currencyService.getSymbols(); track cur) {
                    <option [value]="cur">{{ cur }}</option>
                  }
                </select>
              </div>
              <div class="md:col-span-12">
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payer</label>
                <select [(ngModel)]="payerId" class="w-full px-4 py-3 rounded-2xl bg-slate-50 border-transparent text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none">
                  @for (p of event().participants; track p.id) {
                    <option [value]="p.id">{{ p.name }}</option>
                  }
                </select>
              </div>
            </div>
          </section>

          <!-- Step 2: Adjustments -->
          <section class="space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">2. Adjustments</h3>
              <button (click)="addAdjustment()" class="text-[10px] text-indigo-600 font-black uppercase hover:underline">+ Add Adjustment</button>
            </div>
            <div class="space-y-3">
              @if (adjustments.length === 0) {
                <div class="text-center py-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  No tax, tips, or fees added
                </div>
              }
              @for (adj of adjustments; track adj.id; let idx = $index) {
                <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 group">
                  <div class="flex items-center gap-2">
                    <select [(ngModel)]="adj.type" class="bg-white px-3 py-1.5 rounded-xl border-none text-xs font-bold shadow-sm outline-none">
                      <option value="tax">Tax</option>
                      <option value="tip">Tip</option>
                      <option value="fee">Fee</option>
                      <option value="service_fee">Service Fee</option>
                      <option value="discount">Discount</option>
                    </select>
                    <input type="text" [(ngModel)]="adj.name" placeholder="Label (e.g. Sales Tax)" class="flex-1 bg-white px-3 py-1.5 rounded-xl border-none text-xs font-bold shadow-sm outline-none">
                    <button (click)="removeAdjustment(idx)" class="text-slate-300 hover:text-red-500 p-2 transition-colors"><i class="fas fa-trash"></i></button>
                  </div>
                  <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-2">
                      <div class="w-24 relative">
                        <input type="number" [(ngModel)]="adj.amount" class="w-full bg-white px-3 py-1.5 rounded-xl border-none text-xs font-bold shadow-sm pr-8 outline-none">
                        <button (click)="adj.isPercentage = !adj.isPercentage" class="absolute right-2 top-1.5 text-indigo-500 font-black text-[10px] transition-colors">{{ adj.isPercentage ? '%' : currencyCode }}</button>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] font-bold text-slate-400 uppercase">Apply:</span>
                      <button 
                        (click)="adj.appliedBeforeSplit = !adj.appliedBeforeSplit" 
                        class="text-[10px] font-black uppercase px-3 py-1.5 rounded-full border-2 transition-all"
                        [class.bg-indigo-600]="adj.appliedBeforeSplit"
                        [class.border-indigo-600]="adj.appliedBeforeSplit"
                        [class.text-white]="adj.appliedBeforeSplit"
                        [class.text-slate-400]="!adj.appliedBeforeSplit"
                        [class.border-slate-200]="!adj.appliedBeforeSplit"
                      >
                        {{ adj.appliedBeforeSplit ? 'Before Split' : 'After Split' }}
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- Step 3: Splitting -->
          <section class="space-y-4">
            <div class="flex justify-between items-center">
              <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">3. Splitting</h3>
              <div class="flex gap-3">
                <button (click)="resetSplits('equal')" class="text-[10px] text-indigo-600 font-black uppercase hover:underline">Reset to Equal</button>
                <span class="text-slate-200">|</span>
                <button (click)="clearSplits()" class="text-[10px] text-red-500 font-black uppercase hover:underline">Clear All</button>
              </div>
            </div>

            <div class="flex p-1 bg-slate-100 rounded-2xl w-full sm:w-fit overflow-x-auto">
              @for (type of ['equal', 'percentage', 'shares', 'custom']; track type) {
                <button (click)="setSplitType(type)" class="px-5 py-2 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap" [class.bg-white]="splitType === type" [class.shadow-sm]="splitType === type" [class.text-indigo-600]="splitType === type" [class.text-slate-500]="splitType !== type">
                  {{ type }}
                </button>
              }
            </div>

            <!-- Validation Info -->
            @if (splitType === 'percentage' || splitType === 'custom') {
              <div class="p-4 rounded-2xl text-xs font-bold transition-all border" [class.bg-green-50]="isSplitValid()" [class.border-green-100]="isSplitValid()" [class.text-green-700]="isSplitValid()" [class.bg-red-50]="!isSplitValid()" [class.border-red-100]="!isSplitValid()" [class.text-red-700]="!isSplitValid()">
                <div class="flex justify-between items-center mb-2">
                  <span class="uppercase tracking-widest text-[10px]">{{ splitType === 'percentage' ? 'Allocation Progress' : 'Value Progress' }}</span>
                  <span class="text-sm">{{ getSplitTotal() | number:'1.1-2' }}{{ splitType === 'percentage' ? '%' : currencyCode }}</span>
                </div>
                <div class="w-full bg-white/50 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                  <div class="h-full transition-all duration-500 ease-out" [class.bg-green-500]="isSplitValid()" [class.bg-red-500]="!isSplitValid()" [style.width]="getSplitProgress() + '%'"></div>
                </div>
                @if (!isSplitValid()) {
                  <p class="mt-2 text-[10px] uppercase tracking-wider font-black flex items-center gap-2">
                    <i class="fas fa-exclamation-triangle"></i>
                    {{ getSplitRemainingText() }}
                  </p>
                }
              </div>
            }

            <div class="space-y-2">
              @for (p of event().participants; track p.id) {
                @let split = getSplitFor(p.id);
                <div class="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-50 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all group">
                  <div class="flex items-center gap-3">
                    <input type="checkbox" [checked]="isParticipantInvolved(p.id)" (change)="toggleParticipant(p.id)" class="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
                    <div class="flex flex-col">
                      <span class="font-bold text-slate-800" [class.opacity-50]="!isParticipantInvolved(p.id)">{{ p.name }}</span>
                      @if (isParticipantInvolved(p.id) && splitType !== 'equal') {
                         <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Estimated Share: {{ currencyCode }} {{ getEstimatedPersonShare(p.id) | number:'1.2-2' }}</span>
                      }
                    </div>
                  </div>
                  
                  @if (isParticipantInvolved(p.id)) {
                    <div class="flex items-center gap-3">
                      @if (splitType !== 'equal') {
                        <button (click)="fillRemaining(p.id)" class="text-[9px] text-indigo-600 font-black uppercase hover:bg-indigo-50 px-2 py-1 rounded-lg transition-all opacity-0 group-hover:opacity-100">Fill Left</button>
                      }
                      <div class="w-24 relative">
                        <input 
                          type="number" 
                          [(ngModel)]="split.value"
                          [disabled]="splitType === 'equal'"
                          class="w-full px-3 py-2 rounded-xl border border-slate-100 text-right font-black text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                        <span class="absolute right-2 top-2 text-[8px] font-black text-slate-300 uppercase select-none pointer-events-none">
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

        <!-- Sticky Footer -->
        <div class="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-3xl">
          <div class="flex flex-col text-center sm:text-left">
             <span class="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Calculation</span>
             <div class="flex items-baseline gap-2">
               <span class="text-3xl font-black text-slate-900">{{ currencyCode }} {{ calculatePreviewTotal() | number:'1.2-2' }}</span>
               <span class="text-xs font-bold text-slate-400">incl. adjustments</span>
             </div>
          </div>
          <div class="flex gap-3 w-full sm:w-auto">
            <button (click)="close.emit()" class="flex-1 sm:flex-none px-6 py-3 rounded-2xl border border-slate-200 font-bold hover:bg-white transition-all">Cancel</button>
            <button (click)="save()" [disabled]="!isSplitValid()" class="flex-1 sm:flex-none px-10 py-3 rounded-2xl bg-indigo-600 text-white font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:hover:translate-y-0">
              Save Expense
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
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

  // Reference to file inputs via viewChild for better typing and reliability
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

  // Trigger icon file upload
  triggerIconUpload() {
    this.iconInputRef()?.nativeElement.click();
  }

  // Handle icon upload with proper event typing
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
    if (this.splitType === 'percentage') return Math.abs(total - 100) < 0.01;
    if (this.splitType === 'custom') return Math.abs(total - this.amount) < 0.01;
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

  // Trigger main receipt file input
  triggerFileInput() {
    this.fileInputRef()?.nativeElement.click();
  }

  // Handle receipt selection with improved typing
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

        if (result.tax) {
          this.adjustments.push({ id: crypto.randomUUID(), name: 'Tax', amount: result.tax, type: 'tax', isPercentage: false, appliedBeforeSplit: true });
        }
        if (result.tip) {
          this.adjustments.push({ id: crypto.randomUUID(), name: 'Tip', amount: result.tip, type: 'tip', isPercentage: false, appliedBeforeSplit: true });
        }
        if (result.service_fee) {
          this.adjustments.push({ id: crypto.randomUUID(), name: 'Service Fee', amount: result.service_fee, type: 'service_fee', isPercentage: false, appliedBeforeSplit: true });
        }

        if (result.items) {
          this.items = result.items.map((i: any) => ({
            id: crypto.randomUUID(),
            name: i.name,
            price: i.price
          }));
        }

        // Auto-generate icon based on AI detected category
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
