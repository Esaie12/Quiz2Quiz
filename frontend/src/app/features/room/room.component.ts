import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Room, RoomService } from '../../core/room.service';

@Component({
  selector: 'app-room',
  standalone: true,
  template: `
    <section class="card">
      @if (room()) {
      <h1>Salon {{ room()!.code }}</h1>
      <p>Statut: {{ room()!.status }}</p>
      <p>Mode: {{ room()!.options.mode }} · Difficulté: {{ room()!.options.difficulty }}</p>
      <p>Durée: {{ room()!.options.durationInMinutes }} min</p>
      } @else {
      <p>Chargement du salon...</p>
      }
    </section>
  `,
})
export class RoomComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly roomService = inject(RoomService);

  readonly room = signal<Room | null>(null);

  constructor() {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.roomService.getRoom(code).subscribe((room) => this.room.set(room));
  }
}
