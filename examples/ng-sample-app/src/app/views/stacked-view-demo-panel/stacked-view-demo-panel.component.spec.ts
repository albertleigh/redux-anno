import {ComponentFixture, TestBed} from '@angular/core/testing';

import {StackedViewDemoPanelComponent} from './stacked-view-demo-panel.component';

describe('StackedViewDemoPanelComponent', () => {
  let component: StackedViewDemoPanelComponent;
  let fixture: ComponentFixture<StackedViewDemoPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StackedViewDemoPanelComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StackedViewDemoPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
