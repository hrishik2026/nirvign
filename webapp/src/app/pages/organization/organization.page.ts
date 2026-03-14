import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { OrgService } from '../../services/org.service';
import { Organization, Membership, DocumentType, Invitation, User } from '../../models/interfaces';
import { ParsedAddress } from '../../shared/directives/places-autocomplete.directive';
import { isValidEmail, isValidIndianPhone, formatIndianPhone } from '../../shared/validators';

@Component({
  selector: 'app-organization',
  templateUrl: './organization.page.html',
  styleUrls: ['./organization.page.scss'],
  standalone: false
})
export class OrganizationPage implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  activeTab = 'org';
  isOwner = false;
  org: Organization | null = null;

  // Org form fields
  orgName = '';
  gstin = '';
  email = '';
  phone = '';
  fax = '';
  website = '';
  address1 = '';
  address2 = '';
  city = '';
  state = '';
  postalCode = '';
  country = '';
  defaultCurrency = 'INR';
  ownerEmail = '';
  logoUrl = '';

  // Documents tab
  invoiceTypes: DocumentType[] = [];
  poTypes: DocumentType[] = [];
  get hasDocTypes(): boolean { return this.invoiceTypes.length > 0 || this.poTypes.length > 0; }
  showDocForm = false;
  docFormCategory: 'invoice' | 'purchase_order' = 'invoice';
  docFormName = '';
  docFormPrefix = '';
  docFormStart = 1;
  editingDocId: string | null = null;

  // Members tab
  members: { membership: Membership; user?: User }[] = [];
  invitations: Invitation[] = [];
  inviteEmail = '';
  inviteRole = 'member';

  // Delete org
  deleteConfirmName = '';

  // Dirty tracking for org data
  private savedSnapshot = '';

  constructor(
    private authService: AuthService,
    private orgService: OrgService,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    const org$ = this.orgService.orgReady$;

    // Load org data when org changes
    this.subs.push(
      org$.subscribe(org => {
        this.org = org;
        this.loadOrgData();
        this.checkOwnership();
      })
    );

    // Doc types
    this.subs.push(
      org$.pipe(
        switchMap(org => this.orgService.getDocumentTypes(org.id, 'invoice'))
      ).subscribe(t => this.invoiceTypes = t)
    );
    this.subs.push(
      org$.pipe(
        switchMap(org => this.orgService.getDocumentTypes(org.id, 'purchase_order'))
      ).subscribe(t => this.poTypes = t)
    );

    // Members
    this.subs.push(
      org$.pipe(
        switchMap(org => this.orgService.getMembers(org.id))
      ).subscribe(async memberships => {
        const result: { membership: Membership; user?: User }[] = [];
        for (const m of memberships) {
          const userData = await this.authService.getUser(m.user_id);
          result.push({ membership: m, user: userData || undefined });
        }
        this.members = result;
      })
    );
    this.subs.push(
      org$.pipe(
        switchMap(org => this.orgService.getOrgInvitations(org.id))
      ).subscribe(inv => this.invitations = inv)
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private loadOrgData() {
    const o = this.org!;
    this.orgName = o.name;
    this.gstin = o.gstin || '';
    this.email = o.email || '';
    this.phone = o.phone || '+91 ';
    this.fax = o.fax || '';
    this.website = o.website || '';
    this.address1 = o.address_line1 || '';
    this.address2 = o.address_line2 || '';
    this.city = o.city || '';
    this.state = o.state || '';
    this.postalCode = o.postal_code || '';
    this.country = o.country || '';
    this.defaultCurrency = o.default_currency || 'INR';
    this.ownerEmail = o.owner_email || '';
    this.logoUrl = o.logo_url || '';
    this.savedSnapshot = this.getOrgSnapshot();
  }

  private getOrgSnapshot(): string {
    return JSON.stringify([
      this.orgName, this.gstin, this.email, this.phone, this.fax, this.website,
      this.address1, this.address2, this.city, this.state, this.postalCode,
      this.country, this.defaultCurrency
    ]);
  }

  get isOrgDirty(): boolean {
    return this.savedSnapshot !== '' && this.savedSnapshot !== this.getOrgSnapshot();
  }

  private checkOwnership() {
    const user = this.authService.currentUser;
    if (!user || !this.org) return;
    this.orgService.getUserMembership(user.id, this.org.id).subscribe(m => {
      this.isOwner = m?.role === 'owner';
    });
  }

  async switchTab(tab: string) {
    if (this.activeTab === 'org' && tab !== 'org' && this.isOrgDirty) {
      const prevTab = this.activeTab;
      const result = await this.confirmUnsavedChanges();
      if (result === 'cancel') {
        // Force segment back — briefly toggle to reset the visual state
        this.activeTab = '';
        setTimeout(() => this.activeTab = prevTab);
        return;
      }
      if (result === 'save') await this.saveOrgProfile();
      if (result === 'discard') this.loadOrgData();
    }
    this.activeTab = tab;
  }

  private confirmUnsavedChanges(): Promise<'save' | 'discard' | 'cancel'> {
    return new Promise(async resolve => {
      const alert = await this.alertCtrl.create({
        header: 'Unsaved Changes',
        message: 'You have unsaved changes. Do you want me to save changes before moving on?',
        backdropDismiss: false,
        cssClass: 'unsaved-changes-alert',
        buttons: [
          { text: 'Cancel', role: 'cancel', handler: () => resolve('cancel') },
          { text: "Don't Save", handler: () => resolve('discard') },
          { text: 'Yes, Save', cssClass: 'alert-button-primary', handler: () => resolve('save') }
        ]
      });
      await alert.present();
    });
  }

  onPlaceChanged(addr: ParsedAddress) {
    if (addr.address_line1) this.address1 = addr.address_line1;
    if (addr.address_line2) this.address2 = addr.address_line2;
    if (addr.city) this.city = addr.city;
    if (addr.state) this.state = addr.state;
    if (addr.postal_code) this.postalCode = addr.postal_code;
    if (addr.country) this.country = addr.country;
  }

  onPhoneInput() {
    this.phone = formatIndianPhone(this.phone);
  }

  async saveOrgProfile() {
    if (!this.email || !this.phone || !this.address1) {
      const toast = await this.toastCtrl.create({ message: 'Email, phone, and address are required', duration: 3000, color: 'danger' });
      toast.present();
      return;
    }
    if (!isValidEmail(this.email)) {
      const toast = await this.toastCtrl.create({ message: 'Please enter a valid email address', duration: 3000, color: 'danger' });
      toast.present();
      return;
    }
    if (!isValidIndianPhone(this.phone)) {
      const toast = await this.toastCtrl.create({ message: 'Please enter a valid Indian phone number (+91 XXXXX XXXXX)', duration: 3000, color: 'danger' });
      toast.present();
      return;
    }
    try {
      await this.orgService.updateOrganization(this.org!.id, {
        name: this.orgName,
        gstin: this.gstin,
        email: this.email,
        phone: this.phone,
        fax: this.fax,
        website: this.website,
        address_line1: this.address1,
        address_line2: this.address2,
        city: this.city,
        state: this.state,
        postal_code: this.postalCode,
        country: this.country,
        default_currency: this.defaultCurrency
      });
      this.savedSnapshot = this.getOrgSnapshot();
      const toast = await this.toastCtrl.create({ message: 'Changes saved', duration: 2000, color: 'success' });
      toast.present();
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: err.message, duration: 3000, color: 'danger' });
      toast.present();
    }
  }

  // Document types
  openDocForm(category: 'invoice' | 'purchase_order', existing?: DocumentType) {
    this.docFormCategory = category;
    if (existing) {
      this.editingDocId = existing.id!;
      this.docFormName = existing.name;
      this.docFormPrefix = existing.prefix;
      this.docFormStart = existing.start_number;
    } else {
      this.editingDocId = null;
      this.docFormName = '';
      this.docFormPrefix = '';
      this.docFormStart = 1;
    }
    this.showDocForm = true;
  }

  async saveDocType() {
    if (!this.docFormName || !this.docFormPrefix) {
      const toast = await this.toastCtrl.create({ message: 'Name and prefix required', duration: 3000, color: 'danger' });
      toast.present();
      return;
    }
    if (this.editingDocId) {
      await this.orgService.updateDocumentType(this.org!.id, this.editingDocId, {
        name: this.docFormName,
        prefix: this.docFormPrefix.toUpperCase()
      });
    } else {
      await this.orgService.addDocumentType(this.org!.id, {
        category: this.docFormCategory,
        name: this.docFormName,
        prefix: this.docFormPrefix.toUpperCase(),
        start_number: this.docFormStart,
        current_number: this.docFormStart - 1
      });
    }
    this.showDocForm = false;
    const toast = await this.toastCtrl.create({ message: 'Document type saved', duration: 2000, color: 'success' });
    toast.present();
  }

  async deleteDocType(id: string) {
    const alert = await this.alertCtrl.create({
      header: 'Delete document type?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', handler: async () => { await this.orgService.deleteDocumentType(this.org!.id, id); } }
      ]
    });
    await alert.present();
  }

  // Members
  async inviteMember() {
    if (!this.inviteEmail) return;
    try {
      const result = await this.orgService.inviteMember(this.org!.id, this.inviteEmail, this.authService.currentUser!.id);
      const msg = result === 'added' ? 'Member added' : 'Invitation sent';
      const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: 'success' });
      toast.present();
      this.inviteEmail = '';
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: err.message, duration: 3000, color: 'danger' });
      toast.present();
    }
  }

  async removeMember(membershipId: string) {
    const alert = await this.alertCtrl.create({
      header: 'Remove member?',
      message: 'This member will lose access to the organization.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Remove', cssClass: 'danger', handler: async () => { await this.orgService.removeMember(membershipId); } }
      ]
    });
    await alert.present();
  }

  async cancelInvitation(id: string) {
    await this.orgService.cancelInvitation(id);
  }

  async deleteOrganization() {
    if (this.deleteConfirmName !== this.orgName) return;
    await this.orgService.deleteOrganization(this.org!.id);
    this.router.navigate(['/select-org']);
  }

  async toggleTrainingMode(event: any) {
    const enabled = event.detail.checked;
    try {
      await this.orgService.updateOrganization(this.org!.id, { training_mode: enabled });
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: err.message, duration: 3000, color: 'danger' });
      toast.present();
    }
  }

  async goBack() {
    if (this.isOrgDirty) {
      const result = await this.confirmUnsavedChanges();
      if (result === 'cancel') return;
      if (result === 'save') await this.saveOrgProfile();
    }
    this.router.navigate(['/dashboard']);
  }
}
