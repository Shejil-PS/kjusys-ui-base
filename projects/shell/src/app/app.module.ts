import { APP_INITIALIZER, ErrorHandler, NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { StoreModule } from '@ngrx/store';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { LocationStrategy, HashLocationStrategy, CommonModule } from '@angular/common';
import { CommonService } from './service/common.service';
import { MfeCommonService } from './utils/mfe-common.service';
import { APP_ROUTES } from './app.routes';
import { RouterModule, Routes } from '@angular/router';
import { FormlyBootstrapModule } from '@ngx-formly/bootstrap';
import { FormlyModule } from '@ngx-formly/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { NavigationComponent } from './navigation/navigation.component';

import { CookieService } from 'ngx-cookie-service';
import { AgGridSharedModule, AuthGuard, AuthService, MFE_COMMON_SERVICE, SharedAuthModule, SharedToastService, ToastComponent, VERSION_CHECK_SERVICE } from '@libs/shared-auth';
import { SharedToastModule } from '@libs/shared-toast';

import { LeftMenuLibModule } from '@libs/left-menu-lib';
import { CommonHttpInterceptor, HttpCommonModule } from '@libs/http-common';
import { environment } from '../environments/environment';
import { ToastrModule } from 'ngx-toastr';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MenuHeaderLibModule } from '@libs/menu-header-lib';
import { VersionCheckService } from './utils/version-check.service';
import { ChunkErrorHandler } from './chunk-error-handler';
import { ZXingScannerModule } from '@zxing/ngx-scanner';


const routes: Routes = [];

@NgModule({
  declarations: [AppComponent, NavigationComponent],
  providers: [
    CommonService,
    VersionCheckService,
    { provide: ErrorHandler, useClass: ChunkErrorHandler },
    {
      provide: APP_INITIALIZER,
      useFactory: (mfeService: MfeCommonService) => () => mfeService.init(),
      deps: [MfeCommonService],
      multi: true,
    },
    { provide: MFE_COMMON_SERVICE, useClass: MfeCommonService },
    { provide: VERSION_CHECK_SERVICE, useExisting: VersionCheckService },
    { provide: LocationStrategy, useClass: HashLocationStrategy },
    // {
    //   provide: HTTP_INTERCEPTORS,
    //   useClass: CommonHttpInterceptor,
    //   multi: true,
    // },
    // AuthService,
    // AuthGuard,
    CookieService,
    SharedToastService
  ],
  bootstrap: [AppComponent],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    RouterModule.forRoot(APP_ROUTES, {}),
    FormsModule,
    ZXingScannerModule,
    RouterModule,
    FormlyModule.forRoot({}),
    FormlyBootstrapModule,
    RouterModule.forChild(routes),
    StoreModule.forRoot(
      {},
      {
        runtimeChecks: {
          strictStateImmutability: false,
          strictActionImmutability: false,
        },
      }
    ),
    EffectsModule.forRoot([]),
    SharedAuthModule,
    StoreDevtoolsModule.instrument({
      maxAge: 25, // Retains last 25 states
      logOnly: !isDevMode(), // Restrict extension to log-only mode
      autoPause: true, // Pauses recording actions and state changes when the extension window is not open
      //  trace: false, //  If set to true, will include stack trace for every dispatched action, so you can see it in trace tab jumping directly to that part of code
      //  traceLimit: 75, // maximum stack trace frames to be stored (in case trace option was provided as true)
    }),
    HttpClientModule,
    LeftMenuLibModule,
    MenuHeaderLibModule,
    AgGridSharedModule,
    HttpCommonModule.forRoot(environment),
    SharedToastModule,
    ToastComponent,
    ToastrModule.forRoot({
      positionClass: 'toast-bottom-right',
      closeButton: true,
      progressBar: true,
      timeOut: 4000,
    }),
    NgxSpinnerModule
  ],
})
export class AppModule { }
