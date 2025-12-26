
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppStateService } from '../services/app-state.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-end mb-8">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Your Events</h1>
          <p class="text-slate-500 mt-1">Manage trips, dinners, and group expenses.</p>
        </div>
        <button 
          (click)="showCreateModal.set(true)"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2"
        >
          <i class="fas fa-plus"></i> New Event
        </button>
      </div>

      @if (events().length === 0) {
        <div class="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
          <div class="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-folder-open text-indigo-400 text-3xl"></i>
          </div>
          <h3 class="text-xl font-semibold text-slate-800">No events found</h3>
          <p class="text-slate-500 mt-2 mb-6">Create your first event to start splitting bills!</p>
          <button 
            (click)="showCreateModal.set(true)"
            class="text-indigo-600 font-semibold hover:underline"
          >
            Add an event now
          </button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (event of events(); track event.id) {
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
              <div class="flex justify-between items-start mb-4">
                <div class="bg-indigo-50 w-12 h-12 rounded-xl flex items-center justify-center text-indigo-600">
                  <i class="fas fa-plane-departure text-xl"></i>
                </div>
                <button 
                  (click)="deleteEvent(event.id)"
                  class="text-slate-300 hover:text-red-500 transition-colors p-2"
                >
                  <i class="fas fa-trash-can"></i>
                </button>
              </div>
              <h3 class="text-xl font-bold text-slate-900 mb-1">{{ event.name }}</h3>
              <p class="text-slate-500 text-sm mb-4 line-clamp-1">{{ event.description || 'No description' }}</p>
              
              <div class="flex items-center gap-4 text-xs font-medium text-slate-400 mb-6">
                <span><i class="fas fa-users mr-1"></i> {{ event.participants.length }} Members</span>
                <span><i class="fas fa-receipt mr-1"></i> {{ event.expenses.length }} Bills</span>
              </div>

              <a 
                [routerLink]="['/event', event.id]"
                class="w-full inline-block text-center bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 py-3 rounded-xl font-semibold transition-all"
              >
                View Details
              </a>
            </div>
          }
        </div>
      }

      @if (showCreateModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div class="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 class="text-xl font-bold">Create New Event</h2>
              <button (click)="showCreateModal.set(false)" class="text-slate-400 hover:text-slate-600">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Event Name</label>
                <input 
                  type="text" 
                  [(ngModel)]="newName"
                  placeholder="e.g. Summer Trip 2025" 
                  class="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                <textarea 
                  [(ngModel)]="newDesc"
                  placeholder="What is this event for?" 
                  class="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24"
                ></textarea>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <select 
                  [(ngModel)]="newCurrency"
                  class="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
            </div>
            <div class="p-6 bg-slate-50 flex gap-3">
              <button 
                (click)="showCreateModal.set(false)"
                class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-white transition-all"
              >
                Cancel
              </button>
              <button 
                (click)="submitCreate()"
                class="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md transition-all"
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
    if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      this.state.deleteEvent(id);
    }
  }
}
