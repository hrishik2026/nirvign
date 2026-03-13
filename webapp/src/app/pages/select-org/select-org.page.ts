import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { OrgService } from '../../services/org.service';
import { Organization, Membership } from '../../models/interfaces';
import { Subscription, firstValueFrom, combineLatest, of } from 'rxjs';
import { switchMap, map, filter, catchError } from 'rxjs/operators';
import { ParsedAddress } from '../../shared/directives/places-autocomplete.directive';
import { isValidEmail, isValidIndianPhone, formatIndianPhone } from '../../shared/validators';

@Component({
  selector: 'app-select-org',
  templateUrl: './select-org.page.html',
  styleUrls: ['./select-org.page.scss'],
  standalone: false
})
export class SelectOrgPage implements OnInit, OnDestroy {
  private firestore = inject(Firestore);
  orgs: { membership: Membership; org?: Organization }[] = [];
  showCreateOrg = false;
  isSwitchMode = false;
  canCreateOrg = false;
  private currentUserId = '';
  private subs: Subscription[] = [];
  private autoSelectDone = false;
  loading = true;

  // Create org wizard fields
  orgStep = 1;
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
  loggingOut = false;
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
    this.isSwitchMode = this.route.snapshot.queryParamMap.get('switch') === '1';

    // Check if user is allowed to create orgs
    const allowedDoc = doc(this.firestore, 'app_config', 'allowed_users');
    this.subs.push(
      combineLatest([
        this.authService.user$.pipe(filter(u => !!u)),
        docData(allowedDoc).pipe(catchError(() => of({ emails: [] })))
      ]).subscribe(([user, config]: [any, any]) => {
        const emails: string[] = config?.emails || [];
        this.canCreateOrg = emails.includes(user.email);
      })
    );

    // Real-time org list: user$ -> memberships -> org details (all reactive)
    this.subs.push(
      this.authService.user$.pipe(
        filter(user => !!user),
        switchMap(user => {
          this.currentUserId = user!.id;
          // Auto-accept invitations (fire-and-forget)
          this.acceptPendingInvitations(user!.email, user!.id);
          return this.orgService.getUserOrganizations(user!.id);
        }),
        switchMap(memberships => {
          if (memberships.length === 0) return [[]];
          // For each membership, get a live org observable
          const orgStreams = memberships.map(m =>
            this.orgService.getOrganization(m.organization_id).pipe(
              map(org => ({ membership: m, org }))
            )
          );
          return combineLatest(orgStreams);
        })
      ).subscribe(orgs => {
        this.loading = false;
        // Filter out deleted orgs entirely; show suspended as non-accessible
        this.orgs = orgs.filter(o => o.org?.status !== 'deleted');
        // Auto-select once if exactly one active org
        if (!this.isSwitchMode && !this.autoSelectDone) {
          const activeOrgs = this.orgs.filter(o => o.org?.status === 'active');
          if (activeOrgs.length === 1 && activeOrgs[0].org) {
            this.autoSelectDone = true;
            this.selectOrg(activeOrgs[0].org);
          }
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private async acceptPendingInvitations(email: string, userId: string) {
    const invitations = await firstValueFrom(this.orgService.getPendingInvitations(email));
    await Promise.all(invitations.map(inv => this.orgService.acceptInvitation(inv, userId)));
  }

  async selectOrg(org: Organization) {
    if (org.status === 'suspended') {
      const toast = await this.toastCtrl.create({ message: 'This organization has been suspended by the administrator', duration: 3000, position: 'top', color: 'warning' });
      toast.present();
      return;
    }
    if (org.status !== 'active') {
      const toast = await this.toastCtrl.create({ message: 'This organization is not active', duration: 3000, position: 'top', color: 'danger' });
      toast.present();
      return;
    }
    // Verify membership before navigating
    const membership = await firstValueFrom(this.orgService.getUserMembership(this.currentUserId, org.id));
    if (!membership) {
      const toast = await this.toastCtrl.create({ message: 'You no longer have access to this organization', duration: 3000, color: 'danger' });
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
      case 'deleted': return 'danger';
      default: return 'medium';
    }
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
      const toast = await this.toastCtrl.create({ message: 'Name, email, phone, and address are required', duration: 3000, color: 'danger' });
      toast.present();
      return;
    }
    if (!isValidEmail(this.orgEmail)) {
      const toast = await this.toastCtrl.create({ message: 'Please enter a valid email address', duration: 3000, color: 'danger' });
      toast.present();
      return;
    }
    if (!isValidIndianPhone(this.orgPhone)) {
      const toast = await this.toastCtrl.create({ message: 'Please enter a valid Indian phone number (+91 XXXXX XXXXX)', duration: 3000, color: 'danger' });
      toast.present();
      return;
    }
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
    this.router.navigate(['/organization']);
  }

  goBack() {
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
}
