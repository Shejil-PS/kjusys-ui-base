import { AfterViewInit, Component, ElementRef, Inject, InjectionToken, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';

import { filter, Subscription } from 'rxjs';
import { AuthService } from './services/authService.service';
import { SharedToastService } from './toast/shared-toast.service';
import { SpinnerService } from './services/spinner.service';
import { NgxSpinnerService } from 'ngx-spinner';

export const MFE_COMMON_SERVICE = new InjectionToken<any>('MfeCommonService');
export const VERSION_CHECK_SERVICE = new InjectionToken<any>('VersionCheckService');

declare var lottie: any;


interface LoginData {
  username: string;
  password: string;
}


/**
 * Domain validator kept inside the same TS file.
 * - Accepts a single domain string (e.g. 'kristujayanti.com') or array of allowed domains.
 * - Case-insensitive.
 * - Exact domain match by default (no subdomains). To allow subdomains, set allowSubdomains = true.
 */
export function domainValidator(
  allowedDomain: string | string[],
  allowSubdomains = false
): ValidatorFn {
  const allowed = Array.isArray(allowedDomain)
    ? allowedDomain.map(d => d.toLowerCase())
    : [allowedDomain.toLowerCase()];

  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value || '').trim();
    if (!value) return null; // leave required/email validation to other validators

    const atIndex = value.lastIndexOf('@');
    if (atIndex === -1) {
      // Not an email format — let Validators.email handle this error.
      return null;
    }

    const domainPart = value.slice(atIndex + 1).toLowerCase();

    const matches = allowed.some(a =>
      allowSubdomains ? domainPart === a || domainPart.endsWith('.' + a) : domainPart === a
    );

    return matches ? null : { domain: { allowed, actual: domainPart } };
  };
}


@Component({
  selector: 'lib-shared-auth',
  templateUrl: './shared-auth.component.html',
  styleUrls: ['./shared-auth.component.css'],
})

export class SharedAuthComponent implements OnInit, OnDestroy, AfterViewInit {
  loginForm!: FormGroup;
  showPassword: boolean = false;
  loginFailed = false; // Variable to control the alert visibility
  hasCapitalAndSmall: boolean = false;
  hasMinLength: boolean = false;
  hasSpecialChars: boolean = false;
  hasNumeric: boolean = false;
  responseMenus: any;
  menuDetails: any;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthService,
    private fb: FormBuilder,
    private toastService: SharedToastService,
    private spinnerService: SpinnerService,
    private spinner: NgxSpinnerService,
    // private spinnerStateService: SpinnerStateService,

    @Optional() @Inject(MFE_COMMON_SERVICE) private mfeCommonService?: any,
    @Optional() @Inject(VERSION_CHECK_SERVICE) private versionCheckService?: any

  ) {
    this.loginForm = this.fb.group({
      login_Email: [
        '',
        [
          Validators.required,
          Validators.email,
          domainValidator('kristujayanti.com', false) // allow only kristujayanti.com (exact)
        ]
      ],
      login_Password: ['', [Validators.required]]
    });

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event) => {
        })
    );
  }

  @ViewChild('navLottieContainer') navLottieContainer!: ElementRef;
  private animationInstance: any;

  ngAfterViewInit(): void {
    if (this.navLottieContainer && typeof lottie !== 'undefined') {
      this.animationInstance = lottie.loadAnimation({
        container: this.navLottieContainer.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'assets/Loading.json'
      });
    }
  }


  ngOnInit() {
    // this.spinnerStateService.forceHide();
    this.alreadyLoggedInCheck(); // Check if user is already logged in
  }

  alreadyLoggedInCheck() {
    if (this.authService.getToken() != null && this.authService.getToken() != '') {
      this.fetchMenuDetails();// Fetch menu details if already logged in
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
  login() {
    if (this.loginForm.valid) {
      this.spinner.show();
      const requestBody: LoginData = {
        username: this.loginForm.get('login_Email')!.value || '',
        password: this.loginForm.get('login_Password')!.value || '',
      };

      this.subscriptions.add(
        this.authService.login(requestBody).subscribe({
          next: (result) => {
            if (result && result.responseData && result.responseData.data.length > 0) {

              this.fetchMenuDetails();

            } else {
              this.spinner.hide();
              this.toastService.showToast(result.responseData.message, 'error');
            }
          },
          error: (error: any) => {
            this.loginFailed = true;
            this.spinner.hide();
            this.toastService.showToast(error, 'error');
            setTimeout(() => {
              this.loginFailed = false;
            }, 5000);
          },
        })
      );
    }
  }
  fetchMenuDetails() {
    this.authService.fetchMenuDetails().subscribe({
      next: (response: any) => {
        this.responseMenus = response;

        if (this.responseMenus?.statusCode === 200 && this.responseMenus?.type === "SUCCESS") {
          this.menuDetails = this.responseMenus.responseData?.data || [];

          try {
            localStorage.setItem("Routes", JSON.stringify(this.menuDetails));
            this.authService.updateMenuData(this.menuDetails);
          } catch (error) {
            console.warn("Failed to save menu details in localStorage:", error);
          }

          this.toastService.showToast('Login Successful.', 'success');
          this.spinner.hide(); // Hide spinner before navigation

          // Check for new version before navigation (handles stale bundles after deployment)
          // this.checkVersionAndNavigate();

        } else {
          this.spinner.hide();
        }
      },
      error: (err) => {
        this.spinner.hide();
        console.error("Error occurred when fetching menu details:", err);
      }
    });
  }


  isMobileScreen(): boolean {
    return window.innerWidth < 840;
  }

  /**
   * Check if a new version has been deployed and handle navigation accordingly.
   * If new version detected, reload to get fresh bundles.
   * Otherwise, navigate normally.
   */
  // private async checkVersionAndNavigate(): Promise<void> {
  //   try {
  //     // Check if version check service is available and if new version is deployed
  //     if (this.versionCheckService?.hasNewVersionDeployed) {
  //       const hasNewVersion = await this.versionCheckService.hasNewVersionDeployed();

  //       if (hasNewVersion) {
  //         console.log('🔄 New version detected after login, reloading...');
  //         // Clear cached state
  //         sessionStorage.clear();
  //         // Navigate using location to ensure fresh bundles are loaded
  //         window.location.href = '/#/kjusys';
  //         window.location.reload();
  //         return;
  //       }
  //     }
  //   } catch (error) {
  //     console.warn('Version check failed, proceeding with normal navigation:', error);
  //   }

  //   // No new version or check not available - proceed with normal navigation
  //   // Preload MFE modules in the background
  //   setTimeout(() => this.mfeCommonService?.preloadNonCriticalModules(), 1000);

  //   this.router.navigateByUrl('/kjusys').then(() => {
  //     window.history.replaceState({}, '', '/#/kjusys');
  //   }).catch(err => {
  //     console.error("Navigation error:", err);
  //     window.location.reload();
  //   });
  // }


}
