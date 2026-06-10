import { Inject, Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom, Observable, Subscription, throwError } from 'rxjs';
import { catchError, map, take, tap, timeout } from 'rxjs/operators';
import { CookieService } from 'ngx-cookie-service';
import { SpinnerStateService } from './spinner-state.service';


interface MenuPermissions {
  readOperationAllowed_Menu_Bool: boolean;
  createOperationAllowed_Menu_Bool: boolean;
  updateOperationAllowed_Menu_Bool: boolean;
}

interface MenuItem {
  menuDisplayName_Menu_Text: string;
  menuAllowedOperations_Menu_Document: MenuPermissions;
  menuRoute_Menu_Text: string;
  menuGroupName: string;
  menuExposedModule: string;
  menuNgModuleName: string;
}

interface MenuCategory {
  icon: string;
  menus: MenuItem[];
}

// interface MenuData {
//   [key: string]: MenuCategory;
// }

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private logoutSubscription: Subscription | null = null;

  private menuSubject: BehaviorSubject<any>;
  public menu$ = this.getMenuObservable();

  private getMenuObservable(): Observable<any> {
    // We defer the creation of the observable so we can ensure menuSubject is initialized.
    // However, since we initialize in constructor, we can just return the subject as observable usually.
    // For safety in this pattern:
    return new Observable(observer => {
      this.menuSubject.subscribe(observer);
    });
  }

  public updateMenuData(data: any): void {
    this.menuSubject.next(data);
  }

  public getCurrentMenuData(): any {
    return this.menuSubject.value;
  }


  constructor(
    private http: HttpClient,
    private router: Router,
    private cookieService: CookieService,
    private spinnerStateService: SpinnerStateService,

    //private toastr: ToastrService,
    @Inject('env') public env: any,

  ) {
    // Initialize menuSubject from localStorage if available
    const storedRoutes = localStorage.getItem('Routes');
    this.menuSubject = new BehaviorSubject<any>(storedRoutes ? JSON.parse(storedRoutes) : null);

  }

  getResponseData(response: any) {
    return response;
  }

  login(credentials: { username: string; password: string }): Observable<any> {
    const data = {
      userEmail_AuthCommon_Text: credentials.username,
      userPassword_AuthCommon_Text: credentials.password,
    };

    return this.http.post(`${this.env.baseUrl}/authnauthz/authenticate`, data).pipe(
      take(1),
      map(this.getResponseData),
      tap((response: any) => {

        if (response.statusCode == 200 && response.type == "SUCCESS") {
          const responseData = response.responseData.data[0];
          this.updateTokens(responseData.accessToken, responseData.refreshToken);
          this.setCookies(responseData);
        } else {
          return response;
        }
      }),
      catchError(this.handleErrors)
    );
  }

  logout(): void {
    this.spinnerStateService.show();
    this.logoutSubscription = this.http
      .post(
        `${this.env.baseUrl}/authnauthz/revoke-session-tokens`,
        { refreshToken_AuthCommon_Text: this.getRefreshToken() },
        { observe: 'response' }
      )
      .pipe(
        timeout(10000),
        catchError(error => {
          this.handleLogoutError(error);
          return throwError(() => error);
        })
      )
      .subscribe({
        next: () => this.handleLogoutSuccess(),
        error: (error) => console.error('Logout error', error),
        complete: () => this.spinnerStateService.hide()
      });
  }

  rolesdata: any = [];
  private setCookies(responseData: any) {
    this.rolesdata = responseData;
    localStorage.setItem('rolesdata', responseData.roles);
  }

  private handleLogoutSuccess(): void {
    this.spinnerStateService.hide(); // Ensure complete Reset
    this.clearAuthData();
    this.router.navigate([`/login`]);
  }
  private handleLogoutError(error: any): void {
    this.spinnerStateService.hide(); // Ensure complete reset
    this.clearAuthData();
    this.router.navigate([`/login`]);
  }

  private clearAuthData(): void {
    this.clearAllCookies();
    localStorage.removeItem('Routes');
    localStorage.removeItem('rolesdata');
    sessionStorage.clear();
  }

  public clearSession(): void {
    this.clearAuthData();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  public getToken(): string | null {
    return this.cookieService.get(this.tokenKey);
  }

  private clearAllCookies(): void {
    const allCookies = this.cookieService.getAll();
    Object.keys(allCookies).forEach((cookie) =>
      this.cookieService.delete(cookie)
    );
  }

  private handleErrors(error: HttpErrorResponse): Observable<never> {
    const errorMessage =
      error.error instanceof ErrorEvent
        ? `Error: ${error.error.message}`
        : `Error Code: ${error.status}\nMessage: ${error.message}`;
    console.error(errorMessage);
    //this.toastr.error(errorMessage, 'Error');
    return throwError(() => new Error(errorMessage));
  }

  private base64UrlDecode(base64Url: string): string {
    // Replace non-url compatible chars with base64 standard chars
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    // Pad with trailing '=' if needed
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );
    // Decode the Base64 string
    return decodeURIComponent(
      atob(paddedBase64)
        .split('')
        .map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
  }

  decodeJwt(
    token: any
  ): { header: any; payload: any; signature: string } | null {
    try {
      const [header, payload, signature] = token.split('.');
      if (!header || !payload) {
        throw new Error('Invalid JWT');
      }

      const decodedHeader = JSON.parse(this.base64UrlDecode(header));
      const decodedPayload = JSON.parse(this.base64UrlDecode(payload));

      return {
        header: decodedHeader,
        payload: decodedPayload,
        signature: signature,
      };
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  private tokenKey = 'auth-token';
  private refreshTokenKey = 'refresh-token';

  private get isSecureContext(): boolean {
    return location.protocol === 'https:';
  }

  private setToken(token: string): void {
    this.cookieService.set(
      this.tokenKey,
      token,
      1,
      '/',
      undefined,
      this.isSecureContext,
      'Strict'
    );
  }

  setMenus(key: string, value: any): void {
    this.cookieService.set(
      key,
      value,
      1,
      '/',
      undefined,
      false,
      'Strict'
    );
  }



  private setRefreshToken(refreshToken: string): void {
    this.cookieService.set(
      this.refreshTokenKey,
      refreshToken,
      1,
      '/',
      undefined,
      this.isSecureContext,
      'Strict'
    );
  }

  private updateTokens(accessToken: string, refreshToken: string): void {
    this.setToken(accessToken);
    if (refreshToken !== '') {
      this.setRefreshToken(refreshToken);
    }
  }

  private getRefreshToken(): string | null {
    return this.cookieService.get(this.refreshTokenKey);
  }


  public async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    const REFRESH_HTTP_TIMEOUT_MS = 15_000;
    const res: any = await firstValueFrom(
      this.http.post(
        `${this.env.baseUrl}/authnauthz/refresh-access-token`,
        { refreshToken_AuthCommon_Text: refreshToken },
        { withCredentials: true }
      ).pipe(timeout(REFRESH_HTTP_TIMEOUT_MS))
    );

    if (res.statusCode !== 200 || res.type !== 'SUCCESS') {
      throw new Error(
        `Failed to refresh access token: ${res.responseData.message}`
      );
    }

    const data = res.responseData?.data?.[0];
    const newAccessToken = data?.accessToken;
    const newRefreshToken = data?.refreshToken ?? '';
    if (!newAccessToken) {
      throw new Error('Refresh response missing access token');
    }
    this.updateTokens(newAccessToken, newRefreshToken);
    return newAccessToken;
  }

  ngOnDestroy(): void {
    if (this.logoutSubscription) {
      this.logoutSubscription.unsubscribe();
    }
  }


  fetchMenuDetails(): Observable<any> {
    return this.http.get(`${this.env.baseUrl}/core/fetch-menu-mapped`).pipe(
      take(1),
      map(this.getResponseData)
    );
  }



  // UI-only permission check against the cached menu snapshot in localStorage.
  // Real authorization is enforced server-side on every API request via JWT.
  // checkUserHasPermissions(route: string) {
  //   if (route === '/kjusys') {
  //     if (localStorage.getItem("Routes") !== null) {
  //       return true;
  //     }
  //     return false;
  //   } else {
  //     const menuData = JSON.parse(localStorage.getItem("Routes") || '[]');
  //     try {
  //       for (const categoryKey in menuData[0]) {
  //         if (menuData[0].hasOwnProperty(categoryKey)) {
  //           const category: MenuCategory = menuData[0][categoryKey];

  //           const menus = category.menus;
  //           for (const menu of menus) {
  //             const routePath = menu.menuRoute_Menu_Text
  //             if (route.toLowerCase().includes(routePath.toLowerCase()) && menu.menuAllowedOperations_Menu_Document.readOperationAllowed_Menu_Bool) {
  //               return true;
  //             }
  //           }
  //         }
  //       }
  //       return false;
  //     } catch (error) {
  //       console.error(`Error checking permissions: ${error instanceof Error ? error.message : String(error)}`);
  //       return false;
  //     }
  //   }
  // }



}
