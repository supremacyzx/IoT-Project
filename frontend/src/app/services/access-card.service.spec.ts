import { TestBed } from '@angular/core/testing';

import { AccessCardService } from './access-card.service';

describe('AccessCardService', () => {
  let service: AccessCardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccessCardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
