import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SensoryComponent } from './sensory.component';

describe('SensoryComponent', () => {
  let component: SensoryComponent;
  let fixture: ComponentFixture<SensoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SensoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
