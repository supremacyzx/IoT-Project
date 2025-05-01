import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AirqualityComponent } from './airquality.component';

describe('AirqualityComponent', () => {
  let component: AirqualityComponent;
  let fixture: ComponentFixture<AirqualityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AirqualityComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AirqualityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
