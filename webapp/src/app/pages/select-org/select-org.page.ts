import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { OrgService } from '../../services/org.service';
import { Organization, Membership } from '../../models/interfaces';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-select-org',
  templateUrl: './select-org.page.html',
  styleUrls: ['./select-org.page.scss'],
  standalone: false
})
export class SelectOrgPage implements OnInit {
  orgs: { membership: Membership; org?: Organization }[] = [];
  showCreateOrg = false;
  private isSwitchMode = false;

  // Create org wizard fields (same as register)
  orgStep = 1;
  orgName = '';
  orgGstin = '';
  orgEmail = '';
  orgPhone = '';
  orgWebsite = '';
  orgAddress1 = '';
  orgAddress2 = '';
  orgCity = '';
  orgState = '';
  orgPostalCode = '';
  orgCountry = 'INDIA';
  invoiceTypes = [
    { name: 'Tax Invoice', prefix: 'INV', startNumber: 1 },
    { name: 'Proforma Invoice', prefix: 'PI', startNumber: 1 },
    { name: 'Credit Note', prefix: 'CN', startNumber: 1 }
  ];
  poTypes = [
    { name: 'Purchase Order', prefix: 'PO', startNumber: 1 },
    { name: 'Work Order', prefix: 'WO', startNumber: 1 }
  ];
  inviteEmail = '';
  invitedMembers: { email: string; status: string }[] = [];
  private createdOrgId = '';

  constructor(
    private authService: AuthService,
    private orgService: OrgService,
    private router: Router,
    private route: ActivatedRoute,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    // If user clicked "Switch Org", don't auto-select
    this.isSwitchMode = this.route.snapshot.queryParamMap.get('switch') === '1';

    this.authService.user$.subscribe(async user => {
      if (user) {
        await this.loadOrgs(user.id);
      }
    });
  }

  private async loadOrgs(userId: string) {
    const memberships = await firstValueFrom(this.orgService.getUserOrganizations(userId));
    this.orgs = [];
    for (const m of memberships) {
      const org = await firstValueFrom(this.orgService.getOrganization(m.organization_id));
      this.orgs.push({ membership: m, org });
    }

    // Auto-select if exactly one active org, but NOT when user explicitly chose "Switch Org"
    if (!this.isSwitchMode) {
      const activeOrgs = this.orgs.filter(o => o.org?.status === 'active');
      if (activeOrgs.length === 1 && activeOrgs[0].org) {
        this.selectOrg(activeOrgs[0].org);
      }
    }
  }

  async selectOrg(org: Organization) {
    if (org.status !== 'active') {
      const toast = await this.toastCtrl.create({ message: 'This organization is not active', duration: 3000, position: 'top', color: 'danger' });
      toast.present();
      return;
    }
    this.orgService.setCurrentOrg(org);
    this.router.navigate(['/dashboard']);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'rolled_off': return 'danger';
      default: return 'medium';
    }
  }

  startCreateOrg() {
    this.showCreateOrg = true;
    this.orgStep = 1;
  }

  async createOrg() {
    if (!this.orgName) return;
    const loading = await this.loadingCtrl.create({ message: 'Creating organization...' });
    await loading.present();
    try {
      const user = this.authService.currentUser!;
      this.createdOrgId = await this.orgService.createOrganization({
        name: this.orgName, owner_email: user.email,
        gstin: this.orgGstin, email: this.orgEmail, phone: this.orgPhone,
        website: this.orgWebsite, address_line1: this.orgAddress1,
        address_line2: this.orgAddress2, city: this.orgCity, state: this.orgState,
        postal_code: this.orgPostalCode, country: this.orgCountry
      }, user.id);
      this.orgStep = 2;
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: err.message, duration: 3000, color: 'danger' });
      toast.present();
    } finally {
      loading.dismiss();
    }
  }

  addInvoiceType() { this.invoiceTypes.push({ name: '', prefix: '', startNumber: 1 }); }
  removeInvoiceType(i: number) { this.invoiceTypes.splice(i, 1); }
  addPoType() { this.poTypes.push({ name: '', prefix: '', startNumber: 1 }); }
  removePoType(i: number) { this.poTypes.splice(i, 1); }

  async saveDocTypes() {
    for (const t of this.invoiceTypes) {
      if (t.name && t.prefix) {
        await this.orgService.addDocumentType(this.createdOrgId, {
          category: 'invoice',
          name: t.name, prefix: t.prefix.toUpperCase(),
          start_number: t.startNumber || 1, current_number: (t.startNumber || 1) - 1
        });
      }
    }
    for (const t of this.poTypes) {
      if (t.name && t.prefix) {
        await this.orgService.addDocumentType(this.createdOrgId, {
          category: 'purchase_order',
          name: t.name, prefix: t.prefix.toUpperCase(),
          start_number: t.startNumber || 1, current_number: (t.startNumber || 1) - 1
        });
      }
    }
    this.orgStep = 3;
  }

  async inviteMember() {
    if (!this.inviteEmail) return;
    try {
      const result = await this.orgService.inviteMember(this.createdOrgId, this.inviteEmail, this.authService.currentUser!.id);
      this.invitedMembers.push({
        email: this.inviteEmail,
        status: result === 'added' ? 'Added' : 'Invitation sent'
      });
      this.inviteEmail = '';
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: err.message, duration: 3000, color: 'danger' });
      toast.present();
    }
  }

  async finishWizard() {
    const org = await firstValueFrom(this.orgService.getOrganization(this.createdOrgId));
    if (org) {
      this.orgService.setCurrentOrg(org);
    }
    this.router.navigate(['/dashboard']);
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
