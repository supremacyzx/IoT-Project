import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlidecontentModel } from '../../../models/slidecontent.model';

@Component({
  selector: 'app-slideshow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slideshow.component.html',
  styleUrl: './slideshow.component.scss'
})
export class SlideshowComponent {
  @Input() direction: 'left' | 'right' = 'left';
  @Input() slideShowElements: SlidecontentModel[] = [];
}
