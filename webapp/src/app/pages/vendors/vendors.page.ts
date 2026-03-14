import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DataService } from '../../services/data.service';
import { OrgService } from '../../services/org.service';
import { Vendor } from '../../models/interfaces';

@Component({
  selector: 'app-vendors',
  templateUrl: './vendors.page.html',
  styleUrls: ['./vendors.page.scss'],
  standalone: false
})
export class VendorsPage implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  vendors: Vendor[] = [];
  filteredVendors: Vendor[] = [];
  searchTerm = '';
  showForm = false;
  editingId: string | null = null;

  name = '';
  accountNumber = '';
  email = '';
  phone = '';
  contactPerson = '';
  paymentTerms = '';
  city = '';
  state = '';

  deleteTarget: Vendor | null = null;

  get trainingMode(): boolean { return !!this.orgService.currentOrg?.training_mode; }

  constructor(
    private dataService: DataService,
    private orgService: OrgService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.subs.push(
      this.orgService.orgReady$.pipe(
        switchMap(org => this.dataService.getVendors(org.id))
      ).subscribe(vendors => {
        this.vendors = vendors;
        this.filterVendors();
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  filterVendors() {
    const term = this.searchTerm.toLowerCase();
    this.filteredVendors = this.vendors.filter(v =>
      v.name.toLowerCase().includes(term) ||
      v.account_number?.toLowerCase().includes(term) ||
      v.email?.toLowerCase().includes(term) ||
      v.city?.toLowerCase().includes(term)
    );
  }

  openForm() {
    this.editingId = null;
    this.resetForm();
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.resetForm();
  }

  // Kept for backward compat
  toggleForm() {
    if (this.showForm) {
      this.closeForm();
    } else {
      this.openForm();
    }
  }

  resetForm() {
    this.editingId = null;
    this.name = ''; this.accountNumber = ''; this.email = ''; this.phone = '';
    this.contactPerson = ''; this.paymentTerms = ''; this.city = ''; this.state = '';
  }

  editVendor(v: Vendor) {
    this.editingId = v.id!;
    this.name = v.name || '';
    this.accountNumber = v.account_number || '';
    this.email = v.email || '';
    this.phone = v.phone || '';
    this.contactPerson = v.contact_person || '';
    this.paymentTerms = v.payment_terms || '';
    this.city = v.city || '';
    this.state = v.state || '';
    this.showForm = true;
  }

  async saveVendor() {
    if (!this.name) {
      const toast = await this.toastCtrl.create({ message: 'Name is required', duration: 3000, color: 'danger' });
      toast.present();
      return;
    }
    const org = this.orgService.currentOrg!;
    const data: any = {
      organization_id: org.id, name: this.name, account_number: this.accountNumber,
      email: this.email, phone: this.phone, contact_person: this.contactPerson,
      payment_terms: this.paymentTerms, city: this.city, state: this.state
    };

    try {
      if (this.editingId) {
        await this.dataService.updateVendor(org.id, this.editingId, data);
      } else {
        await this.dataService.addVendor(org.id, data);
      }
      this.showForm = false;
      this.resetForm();
      const toast = await this.toastCtrl.create({ message: this.editingId ? 'Vendor updated' : 'Vendor added', duration: 2000, color: 'success' });
      toast.present();
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: err.message, duration: 3000, color: 'danger' });
      toast.present();
    }
  }

  // --- Delete confirmation ---
  confirmDelete(v: Vendor) {
    this.deleteTarget = v;
  }

  cancelDelete() {
    this.deleteTarget = null;
  }

  async doDelete() {
    if (!this.deleteTarget) return;
    await this.dataService.deleteVendor(this.orgService.currentOrg!.id, this.deleteTarget.id!);
    const toast = await this.toastCtrl.create({ message: 'Vendor deleted', duration: 2000, color: 'warning' });
    toast.present();
    this.deleteTarget = null;
  }

  goBack() { this.router.navigate(['/dashboard']); }
}
