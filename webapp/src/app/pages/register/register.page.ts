import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { OrgService } from '../../services/org.service';
import { Organization, Invitation, Membership } from '../../models/interfaces';
import { firstValueFrom } from 'rxjs';
import { ParsedAddress } from '../../shared/directives/places-autocomplete.directive';
import { isValidEmail, isValidIndianPhone, formatIndianPhone } from '../../shared/validators';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage {
  step = 1;
  // Step 1 fields
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';

  // Step 2 fields
  userId = '';
  invitations: Invitation[] = [];
  existingOrgs: { membership: Membership; org?: Organization }[] = [];
  showCreateOrg = false;
  loggingOut = false;

  // Create org fields
  orgName = '';
  orgGstin = '';
  orgEmail = '';
  orgPhone = '+91 ';
  orgWebsite = '';
  orgAddress1 = '';
  orgAddress2 = '';
  orgCity = '';
  orgState = '';
  orgPostalCode = '';
  orgCountry = 'INDIA';

  // Wizard step for org creation
  orgStep = 1;

  // Doc types
  invoiceTypes: { name: string; prefix: string; startNumber: number }[] = [
    { name: 'Tax Invoice', prefix: 'INV', startNumber: 1 },
    { name: 'Proforma Invoice', prefix: 'PI', startNumber: 1 },
    { name: 'Credit Note', prefix: 'CN', startNumber: 1 }
  ];
  poTypes: { name: string; prefix: string; startNumber: number }[] = [
    { name: 'Purchase Order', prefix: 'PO', startNumber: 1 },
    { name: 'Work Order', prefix: 'WO', startNumber: 1 }
  ];

  // Invite
  inviteEmail = '';
  invitedMembers: { email: string; status: string }[] = [];

  constructor(
    private authService: AuthService,
    private orgService: OrgService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  async register() {
    if (!this.fullName || !this.email || !this.password) {
      this.showToast('Please fill in all required fields');
      return;
    }
    if (this.password.length < 6) {
      this.showToast('Password must be at least 6 characters');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.showToast('Passwords do not match');
      return;
    }

    const loading = await this.loadingCtrl.create({ message: 'Creating account...' });
    await loading.present();
    try {
      const credential = await this.authService.register(this.fullName, this.email, this.password);
      this.userId = credential.user!.uid;
      await this.checkExistingOrgsAndInvitations();
      this.step = 2;
    } catch (err: any) {
      this.showToast(err.message || 'Registration failed');
    } finally {
      loading.dismiss();
    }
  }

  async googleSignUp() {
    const loading = await this.loadingCtrl.create({ message: 'Signing up with Google...' });
    await loading.present();
    try {
      const credential = await this.authService.googleSignIn();
      this.userId = credential.user!.uid;
      this.email = credential.user!.email || '';
      this.fullName = credential.user!.displayName || '';
      await this.checkExistingOrgsAndInvitations();
      this.step = 2;
    } catch (err: any) {
      this.showToast(err.message || 'Google sign-up failed');
    } finally {
      loading.dismiss();
    }
  }

  private async checkExistingOrgsAndInvitations() {
    const invitations = await firstValueFrom(this.orgService.getPendingInvitations(this.email));
    this.invitations = invitations;

    // Auto-accept invitations
    for (const inv of invitations) {
      await this.orgService.acceptInvitation(inv, this.userId);
    }

    const memberships = await firstValueFrom(this.orgService.getUserOrganizations(this.userId));
    this.existingOrgs = [];
    for (const m of memberships) {
      const org = await firstValueFrom(this.orgService.getOrganization(m.organization_id));
      if (org && org.status !== 'deleted') {
        this.existingOrgs.push({ membership: m, org });
      }
    }

    if (this.existingOrgs.length === 0 && invitations.length === 0) {
      this.showCreateOrg = true;
    }
  }

  async selectOrg(org: Organization) {
    if (org.status === 'suspended') {
      this.showToast('This organization has been suspended by the administrator', 'warning');
      return;
    }
    if (org.status !== 'active') {
      this.showToast('This organization is not active');
      return;
    }
    this.orgService.setCurrentOrg(org);
    this.router.navigate(['/dashboard']);
  }

  startCreateOrg() {
    this.showCreateOrg = true;
    this.orgStep = 1;
  }

  onPlaceChanged(addr: ParsedAddress) {
    if (addr.address_line1) this.orgAddress1 = addr.address_line1;
    if (addr.address_line2) this.orgAddress2 = addr.address_line2;
    if (addr.city) this.orgCity = addr.city;
    if (addr.state) this.orgState = addr.state;
    if (addr.postal_code) this.orgPostalCode = addr.postal_code;
    if (addr.country) this.orgCountry = addr.country;
  }

  onPhoneInput() {
    this.orgPhone = formatIndianPhone(this.orgPhone);
  }

  async createOrg() {
    if (!this.orgName || !this.orgEmail || !this.orgPhone || !this.orgAddress1) {
      this.showToast('Name, email, phone, and address are required');
      return;
    }
    if (!isValidEmail(this.orgEmail)) {
      this.showToast('Please enter a valid email address');
      return;
    }
    if (!isValidIndianPhone(this.orgPhone)) {
      this.showToast('Please enter a valid Indian phone number (+91 XXXXX XXXXX)');
      return;
    }
    const loading = await this.loadingCtrl.create({ message: 'Creating organization...' });
    await loading.present();
    try {
      const orgId = await this.orgService.createOrganization({
        name: this.orgName,
        owner_email: this.email,
        gstin: this.orgGstin,
        email: this.orgEmail,
        phone: this.orgPhone,
        website: this.orgWebsite,
        address_line1: this.orgAddress1,
        address_line2: this.orgAddress2,
        city: this.orgCity,
        state: this.orgState,
        postal_code: this.orgPostalCode,
        country: this.orgCountry
      }, this.userId);

      this.orgStep = 2;
      // Store the orgId for doc type creation
      (this as any)._createdOrgId = orgId;
    } catch (err: any) {
      this.showToast(err.message || 'Failed to create organization');
    } finally {
      loading.dismiss();
    }
  }

  addInvoiceType() {
    this.invoiceTypes.push({ name: '', prefix: '', startNumber: 1 });
  }

  removeInvoiceType(i: number) {
    this.invoiceTypes.splice(i, 1);
  }

  addPoType() {
    this.poTypes.push({ name: '', prefix: '', startNumber: 1 });
  }

  removePoType(i: number) {
    this.poTypes.splice(i, 1);
  }

  async saveDocTypes() {
    const orgId = (this as any)._createdOrgId;
    for (const t of this.invoiceTypes) {
      if (t.name && t.prefix) {
        await this.orgService.addDocumentType(orgId, {
          category: 'invoice',
          name: t.name,
          prefix: t.prefix.toUpperCase(),
          start_number: t.startNumber || 1,
          current_number: (t.startNumber || 1) - 1
        });
      }
    }
    for (const t of this.poTypes) {
      if (t.name && t.prefix) {
        await this.orgService.addDocumentType(orgId, {
          category: 'purchase_order',
          name: t.name,
          prefix: t.prefix.toUpperCase(),
          start_number: t.startNumber || 1,
          current_number: (t.startNumber || 1) - 1
        });
      }
    }
    this.orgStep = 3;
  }

  async inviteMember() {
    if (!this.inviteEmail) return;
    const orgId = (this as any)._createdOrgId;
    try {
      const result = await this.orgService.inviteMember(orgId, this.inviteEmail, this.userId);
      this.invitedMembers.push({
        email: this.inviteEmail,
        status: result === 'added' ? 'Added' : 'Invitation sent — awaiting sign-up'
      });
      this.inviteEmail = '';
      this.showToast('Invitation sent!', 'success');
    } catch (err: any) {
      this.showToast(err.message || 'Failed to invite');
    }
  }

  async finishWizard() {
    const orgId = (this as any)._createdOrgId;
    if (orgId) {
      const org = await firstValueFrom(this.orgService.getOrganization(orgId));
      if (org) {
        this.orgService.setCurrentOrg(org);
      }
    }
    this.router.navigate(['/dashboard']);
  }

  async logout() {
    this.loggingOut = true;
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } finally {
      this.loggingOut = false;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'deleted': return 'danger';
      default: return 'medium';
    }
  }

  private async showToast(message: string, color = 'danger') {
    const toast = await this.toastCtrl.create({ message, duration: 3000, position: 'top', color });
    toast.present();
  }
}
