import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DrivesComponent } from './drives.component';

describe('DrivesComponent', () => {
  let component: DrivesComponent;
  let fixture: ComponentFixture<DrivesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DrivesComponent]
    });
    fixture = TestBed.createComponent(DrivesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
