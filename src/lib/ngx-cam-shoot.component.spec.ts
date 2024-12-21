import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxCamShoot } from './ngx-cam-shoot.component';

describe('NgxCamShootComponent', () => {
  let component: NgxCamShoot;
  let fixture: ComponentFixture<NgxCamShoot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxCamShoot]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxCamShoot);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
