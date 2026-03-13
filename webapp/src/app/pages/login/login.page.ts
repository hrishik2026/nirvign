import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { OrgService } from '../../services/org.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  email = '';
  password = '';

  constructor(
    private authService: AuthService,
    private orgService: OrgService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  async login() {
    if (!this.email || !this.password) {
      this.showToast('Please enter email and password');
      return;
    }
    const loading = await this.loadingCtrl.create({ message: 'Signing in...' });
    await loading.present();
    try {
      const credential = await this.authService.login(this.email, this.password);
      await this.navigateAfterLogin(credential.user!.uid);
    } catch (err: any) {
      this.showToast(err.message || 'Login failed');
    } finally {
      loading.dismiss();
    }
  }

  async googleSignIn() {
    const loading = await this.loadingCtrl.create({ message: 'Signing in with Google...' });
    await loading.present();
    try {
      const credential = await this.authService.googleSignIn();
      await this.navigateAfterLogin(credential.user!.uid);
    } catch (err: any) {
      this.showToast(err.message || 'Google sign-in failed');
    } finally {
      loading.dismiss();
    }
  }

  private async navigateAfterLogin(userId: string) {
    const memberships = await firstValueFrom(this.orgService.getUserOrganizations(userId));
    if (memberships.length === 1) {
      const org = await firstValueFrom(this.orgService.getOrganization(memberships[0].organization_id));
      if (org && org.status === 'active') {
        this.orgService.setCurrentOrg(org);
        this.router.navigate(['/dashboard']);
        return;
      }
    }
    this.router.navigate(['/select-org']);
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 3000, position: 'top', color: 'danger' });
    toast.present();
  }
}
