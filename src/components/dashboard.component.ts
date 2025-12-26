
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../services/app-state.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Welcome Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div class="animate-in slide-in-from-left duration-700">
          <h1 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-3">
            Your Events
          </h1>
          <p class="text-slate-500 text-lg font-medium max-w-md">
            Split costs, scan receipts, and settle debts with AI-powered precision.
          </p>
        </div>
        <button 
          (click)="showCreateModal.set(true)"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-3xl font-black shadow-2xl shadow-indigo-200 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 group"
        >
          <i class="fas fa-plus text-sm group-hover:rotate-90 transition-transform"></i>
          Create New Event
        </button>
      </div>

      <!-- Bento-style Grid -->
      @if (events().length === 0) {
        <div class="bg-white rounded-[2.5rem] p-20 text-center border-4 border-dashed border-slate-100 animate-in fade-in zoom-in duration-500">
          <div class="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
            <i class="fas fa-folder-open text-4xl"></i>
          </div>
          <h3 class="text-2xl font-black text-slate-800">Ready to start?</h3>
          <p class="text-slate-500 mt-2 mb-8 max-w-xs mx-auto font-medium">Create your first trip or dinner group to start splitting bills smartly.</p>
          <button 
            (click)="showCreateModal.set(true)"
            class="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-600 transition-colors shadow-lg"
          >
            Add your first event
          </button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (event of events(); track event.id) {
            <div class="group relative bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 overflow-hidden flex flex-col h-full">
              <!-- Decorative background element -->
              <div class="absolute -right-8 -top-8 w-32 h-32 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-700 opacity-50"></div>
              
              <div class="relative z-10">
                <div class="flex justify-between items-start mb-6">
                  <div class="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 group-hover:rotate-3 transition-transform">
                    <i class="fas fa-calendar-alt text-2xl"></i>
                  </div>
                  <button 
                    (click)="deleteEvent(event.id); $event.stopPropagation();"
                    class="text-slate-300 hover:text-red-500 transition-colors p-2"
                  >
                    <i class="fas fa-trash-can"></i>
                  </button>
                </div>

                <h3 class="text-2xl font-black text-slate-900 mb-2 leading-tight">{{ event.name }}</h3>
                <p class="text-slate-400 text-sm mb-8 font-medium line-clamp-2">{{ event.description || 'No description provided' }}</p>
                
                <div class="flex flex-wrap items-center gap-4 mb-8">
                  <div class="flex -space-x-3">
                    @for (p of event.participants.slice(0, 3); track p.id) {
                      <div class="w-9 h-9 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">
                        {{ p.name.substring(0, 1).toUpperCase() }}
                      </div>
                    }
                    @if (event.participants.length > 3) {
                      <div class="w-9 h-9 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600">
                        +{{ event.participants.length - 3 }}
                      </div>
                    }
                  </div>
                  <span class="text-xs font-black text-slate-400 uppercase tracking-widest">{{ event.expenses.length }} Receipts</span>
                </div>
              </div>

              <div class="mt-auto pt-4 relative z-10">
                <a 
                  [routerLink]="['/event', event.id]"
                  class="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-2xl font-black transition-all group-hover:gap-4 shadow-lg shadow-slate-100 hover:shadow-indigo-200"
                >
                  Enter Event
                  <i class="fas fa-arrow-right text-xs"></i>
                </a>
              </div>
            </div>
          }
        </div>
      }

      <!-- Create Modal -->
      @if (showCreateModal()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div class="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-12 duration-500 my-auto">
            <div class="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 class="text-2xl font-black text-slate-900">New Group Event</h2>
                <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Setup your split rules</p>
              </div>
              <button (click)="showCreateModal.set(false)" class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <div class="p-8 space-y-6">
              <div class="space-y-1">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Title</label>
                <input 
                  type="text" 
                  [(ngModel)]="newName"
                  placeholder="e.g. Ski Trip 2025" 
                  class="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white focus:ring-4 focus:ring-indigo-50 text-slate-900 font-bold outline-none transition-all placeholder:text-slate-300"
                >
              </div>
              
              <div class="space-y-1">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea 
                  [(ngModel)]="newDesc"
                  placeholder="Notes, locations, or reminders..." 
                  class="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white focus:ring-4 focus:ring-indigo-50 text-slate-900 font-bold outline-none transition-all placeholder:text-slate-300 min-h-[100px]"
                ></textarea>
              </div>

              <div class="space-y-1">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Main Currency</label>
                <div class="grid grid-cols-4 gap-2">
                  @for (curr of ['USD', 'EUR', 'GBP', 'JPY']; track curr) {
                    <button 
                      (click)="newCurrency = curr"
                      class="py-3 rounded-2xl border-2 font-black text-sm transition-all"
                      [class.bg-indigo-600]="newCurrency === curr"
                      [class.border-indigo-600]="newCurrency === curr"
                      [class.text-white]="newCurrency === curr"
                      [class.bg-white]="newCurrency !== curr"
                      [class.border-slate-100]="newCurrency !== curr"
                      [class.text-slate-400]="newCurrency !== curr"
                    >
                      {{ curr }}
                    </button>
                  }
                </div>
              </div>
            </div>

            <div class="p-8 pt-0 flex gap-4">
              <button 
                (click)="showCreateModal.set(false)"
                class="flex-1 px-4 py-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-400 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                (click)="submitCreate()"
                [disabled]="!newName.trim()"
                class="flex-[2] px-4 py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-indigo-600 shadow-xl disabled:opacity-30 transition-all"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private state = inject(AppStateService);
  events = this.state.events;

  showCreateModal = signal(false);
  newName = '';
  newDesc = '';
  newCurrency = 'USD';

  submitCreate() {
    if (!this.newName.trim()) return;
    this.state.createEvent(this.newName, this.newDesc, this.newCurrency);
    this.showCreateModal.set(false);
    this.newName = '';
    this.newDesc = '';
  }

  deleteEvent(id: string) {
    if (confirm('Delete this event? All receipts and split history will be wiped.')) {
      this.state.deleteEvent(id);
    }
  }
}
