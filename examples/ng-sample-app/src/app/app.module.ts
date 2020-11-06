import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {appStoreProvider} from 'src/stores';

import {AppComponent} from './app.component';
import {MainEntryComponent} from './layouts/main-entry/main-entry.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatListModule} from '@angular/material/list';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MainComponent} from './views/main/main.component';
import {StackedViewDemoPanelComponent} from './views/stacked-view-demo-panel/stacked-view-demo-panel.component';
import {GlobalCounterComponent} from './views/global-counter/global-counter.component';

@NgModule({
  declarations: [
    AppComponent,
    MainEntryComponent,
    MainComponent,
    StackedViewDemoPanelComponent,
    GlobalCounterComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
  ],
  providers: [appStoreProvider],
  bootstrap: [AppComponent],
})
export class AppModule {}
