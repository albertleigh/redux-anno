import {Component, OnInit} from '@angular/core';

import {mainViewOptions, MainViewIcon, MainViewOption} from 'sample-shared-models';

@Component({
  selector: 'app-main-entry',
  templateUrl: './main-entry.component.html',
  styleUrls: ['./main-entry.component.scss'],
})
export class MainEntryComponent implements OnInit {
  readonly mainViewOptions = mainViewOptions;

  constructor() {}

  ngOnInit() {}

  getMainEntryIcon(type: MainViewIcon) {
    switch (type) {
      case 'Storage':
        return 'storage';
      case 'ViewComfy':
        return 'view_comfy';
      default:
        return 'view_comfy';
    }
  }
}
