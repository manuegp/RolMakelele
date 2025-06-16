import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UniqueTagComponent } from './unique-tag.component';

describe('UniqueTagComponent', () => {
  let component: UniqueTagComponent;
  let fixture: ComponentFixture<UniqueTagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UniqueTagComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UniqueTagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
