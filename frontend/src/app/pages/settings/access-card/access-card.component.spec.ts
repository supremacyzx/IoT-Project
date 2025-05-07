import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessCardComponent } from './access-card.component';

describe('AccessCardComponent', () => {
  let component: AccessCardComponent;
  let fixture: ComponentFixture<AccessCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccessCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
