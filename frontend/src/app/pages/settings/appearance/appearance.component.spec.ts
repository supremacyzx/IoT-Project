import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApperanceComponent } from './appearance.component';

describe('ApperanceComponent', () => {
  let component: ApperanceComponent;
  let fixture: ComponentFixture<ApperanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApperanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApperanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
