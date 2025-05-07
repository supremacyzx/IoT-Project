import { Component } from '@angular/core';
import { AccessCardService } from '../../../services/access-card.service';
import { Plus, CreditCard, IdCard, Key, LucideAngularModule} from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-access-card',
  standalone: true,
  imports: [LucideAngularModule, CommonModule, FormsModule],
  templateUrl: './access-card.component.html',
  styleUrl: './access-card.component.scss'
})
export class AccessCardComponent {
  icons = {
    Plus,
    CreditCard,
    IdCard,
    Key,
  }
  isLoading = false;
  error: string | null = null;
  success: string | null = null;
  cardId: string = '';

  constructor(private accessCardService: AccessCardService) {
  }

  addCard(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.error = null;
    this.success = null;

    // Optional die Karten-ID übergeben, falls vorhanden
    this.accessCardService.addAccessId(this.cardId || undefined).subscribe({
      next: () => {
        this.success = 'Zugangskarte erfolgreich hinzugefügt!';
        this.isLoading = false;
        this.cardId = '';
      },
      error: (err) => {
        this.error = `Fehler beim Hinzufügen der Zugangskarte: ${err.message || 'Unbekannter Fehler'}`;
        this.isLoading = false;
      }
    });
  }
}
