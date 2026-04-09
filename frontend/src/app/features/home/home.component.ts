import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { RoomService } from '../../core/room.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="card">
      <h1>Quiz Battle</h1>
      <p>Bienvenue {{ authService.me()?.pseudo ?? 'joueur' }} 👋</p>
      <div class="actions">
        <button (click)="createRoom()">Créer une partie</button>
      </div>

      <div class="join">
        <input [(ngModel)]="joinCode" placeholder="Code salon" />
        <button (click)="joinRoom()">Rejoindre</button>
      </div>

      @if (error()) {
      <p class="error">{{ error() }}</p>
      }
      <button class="ghost" (click)="authService.logout()">Déconnexion</button>
    </section>
  `,
})
export class HomeComponent {
  readonly authService = inject(AuthService);
  private readonly roomService = inject(RoomService);
  private readonly router = inject(Router);

  joinCode = '';
  readonly error = signal<string | null>(null);

  createRoom() {
    this.roomService.createRoom().subscribe({
      next: (room) => this.router.navigateByUrl(`/room/${room.code}`),
      error: () => this.error.set('Erreur lors de la création de salon.'),
    });
  }

  joinRoom() {
    this.roomService.joinRoom(this.joinCode.trim().toUpperCase()).subscribe({
      next: (room) => this.router.navigateByUrl(`/room/${room.code}`),
      error: () => this.error.set('Code salon invalide.'),
    });
  }
}
