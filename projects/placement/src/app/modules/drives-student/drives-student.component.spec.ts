import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DrivesStudentComponent } from './drives-student.component';

describe('DrivesStudentComponent', () => {
  let component: DrivesStudentComponent;
  let fixture: ComponentFixture<DrivesStudentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DrivesStudentComponent]
    });
    fixture = TestBed.createComponent(DrivesStudentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
