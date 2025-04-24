import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private currentTheme: 'dark' | 'light' = 'light';

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.setTheme(this.getPreferredThemeSetting());
  }

  getPreferredThemeSetting(): 'dark' | 'light' {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.currentTheme = theme;
    const body = document.body;
    this.renderer.removeClass(body, 'dark-theme');
    this.renderer.removeClass(body, 'light-theme');
    this.renderer.addClass(body, `${theme}-theme`);
  }

  toggleTheme(): void {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }
}
