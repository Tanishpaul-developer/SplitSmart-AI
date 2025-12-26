
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen flex flex-col">
      <header class="bg-indigo-600 text-white p-4 shadow-lg sticky top-0 z-50">
        <div class="container mx-auto flex justify-between items-center">
          <a routerLink="/" class="text-2xl font-bold flex items-center gap-2">
            <i class="fas fa-hand-holding-dollar"></i>
            SplitSmart AI
          </a>
          <nav>
            <a routerLink="/" class="hover:bg-indigo-700 px-3 py-2 rounded-lg transition-colors">
              <i class="fas fa-home"></i> Dashboard
            </a>
          </nav>
        </div>
      </header>

      <main class="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
        <router-outlet></router-outlet>
      </main>

      <footer class="bg-slate-100 border-t border-slate-200 p-4 text-center text-slate-500 text-sm">
        <p>&copy; 2025 SplitSmart AI. Smart splitting, smarter saving.</p>
      </footer>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {}
