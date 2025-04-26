import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlideContentModel } from '../../../models/slideContent.model';

@Component({
  selector: 'app-slideshow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slideshow.component.html',
  styleUrl: './slideshow.component.scss'
})
export class SlideshowComponent {
  @Input() direction: 'left' | 'right' = 'left';
  @Input() slideShowElements: SlideContentModel[] = [];
}
