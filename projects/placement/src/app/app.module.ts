import { isDevMode, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavigationComponent } from './modules/navigation/navigation.component';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonHttpInterceptor, HttpCommonModule } from '@libs/http-common';
import { AuthService, AuthGuard, SharedToastService, SharedAuthModule } from '@libs/shared-auth';
import { CookieService } from 'ngx-cookie-service';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { EffectsModule } from '@ngrx/effects';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    NavigationComponent
  ],
  providers: [
    {
      provide: LocationStrategy,
      useClass: HashLocationStrategy
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CommonHttpInterceptor,
      multi: true,
    },
    AuthService,
    AuthGuard,
    CookieService,
    SharedToastService
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    StoreModule.forRoot({}, {
          //  metaReducers,
          runtimeChecks: {
              strictStateImmutability: false,
              strictActionImmutability: false,
          },
      }),
    StoreDevtoolsModule.instrument({
          maxAge: 25, // Retains last 25 states
          logOnly: !isDevMode(), // Restrict extension to log-only mode
          autoPause: true, // Pauses recording actions and state changes when the extension window is not open
      }),
      EffectsModule.forRoot([]),
      HttpCommonModule.forRoot(environment),
      SharedAuthModule,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
