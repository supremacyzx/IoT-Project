import { Component, Input, AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgOptimizedImage } from '@angular/common';
import { SlideContentModel } from '../../../models/slideContent.model';

@Component({
  selector: 'app-slideshow',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './slideshow.component.html',
  styleUrl: './slideshow.component.scss'
})
export class SlideshowComponent implements AfterViewInit, OnDestroy {
  @Input() direction: 'left' | 'right' = 'left';
  @Input() slideShowElements: SlideContentModel[] = [];

  private observer: IntersectionObserver | null = null;

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    if (this.slideShowElements.length > 0) {
      this.duplicateForInfiniteScroll();
      this.setupVisibilityObserver();
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private duplicateForInfiniteScroll(): void {
    const track = this.el.nativeElement.querySelector('.slide-track');
    const items = track.querySelectorAll('.slide-item');

    // Füge Duplikate der Items hinzu für nahtloses Scrolling
    items.forEach((item: Element) => { // Typ für item hinzugefügt
      const clone = item.cloneNode(true);
      track.appendChild(clone);
    });
  }

  private setupVisibilityObserver(): void {
    // Pausiere Animation wenn nicht sichtbar (Performance)
    this.observer = new IntersectionObserver((entries) => {
      const track = this.el.nativeElement.querySelector('.slide-track');
      entries.forEach(entry => {
        track.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
      });
    });

    this.observer.observe(this.el.nativeElement);
  }

  handleImageError(event: any): void {
    event.target.src = 'assets/images/default-image.svg';
  }
}

