import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { OrgService } from '../services/org.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const authService = inject(AuthService);
  const orgService = inject(OrgService);
  const router = inject(Router);

  return authService.authReady$.pipe(
    filter(ready => ready),
    take(1),
    map(() => {
      if (!auth.currentUser) {
        router.navigate(['/login']);
        return false;
      }
      if (!orgService.currentOrg) {
        router.navigate(['/select-org']);
        return false;
      }
      return true;
    })
  );
};

export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const authService = inject(AuthService);
  const orgService = inject(OrgService);
  const router = inject(Router);

  return authService.authReady$.pipe(
    filter(ready => ready),
    take(1),
    map(() => {
      if (auth.currentUser) {
        if (orgService.currentOrg) {
          router.navigate(['/dashboard']);
        } else {
          router.navigate(['/select-org']);
        }
        return false;
      }
      return true;
    })
  );
};

const APP_ADMIN_EMAILS = ['hrishikeshb@gmail.com', 'rohit.bhagwat@gmail.com'];

export const appAdminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authReady$.pipe(
    filter(ready => ready),
    take(1),
    map(() => {
      if (!auth.currentUser || !APP_ADMIN_EMAILS.includes(auth.currentUser.email || '')) {
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    })
  );
};

export const orgSelectionGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const authService = inject(AuthService);
  const orgService = inject(OrgService);
  const router = inject(Router);

  return authService.authReady$.pipe(
    filter(ready => ready),
    take(1),
    map(() => {
      if (!auth.currentUser) {
        router.navigate(['/login']);
        return false;
      }
      if (orgService.currentOrg) {
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    })
  );
};
