import {BaseViewItem} from 'redux-anno-utils/lib/examples/StackViews/ViewItem';

export enum VIEW_TYPE {
  WELCOME_VIEW = 'WELCOME_VIEW',
  STEP_VIEW = 'STEP_VIEW',
}

export abstract class BaseView extends BaseViewItem {
  abstract type: VIEW_TYPE;
}
