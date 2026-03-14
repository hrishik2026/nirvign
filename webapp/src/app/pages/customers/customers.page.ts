import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DataService } from '../../services/data.service';
import { OrgService } from '../../services/org.service';
import { Customer } from '../../models/interfaces';

@Component({
  selector: 'app-customers',
  templateUrl: './customers.page.html',
  styleUrls: ['./customers.page.scss'],
  standalone: false
})
export class CustomersPage implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  searchTerm = '';
  showForm = false;
  editingId: string | null = null;

  // Form fields
  name = '';
  accountNumber = '';
  email = '';
  phone = '';
  gstin = '';
  contactPerson = '';
  city = '';
  state = '';

  deleteTarget: Customer | null = null;

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
        switchMap(org => this.dataService.getCustomers(org.id))
      ).subscribe(customers => {
        this.customers = customers;
        this.filterCustomers();
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  filterCustomers() {
    const term = this.searchTerm.toLowerCase();
    this.filteredCustomers = this.customers.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.account_number?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.city?.toLowerCase().includes(term)
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

  toggleForm() {
    if (this.showForm) {
      this.closeForm();
    } else {
      this.openForm();
    }
  }

  resetForm() {
    this.editingId = null;
    this.name = '';
    this.accountNumber = '';
    this.email = '';
    this.phone = '';
    this.gstin = '';
    this.contactPerson = '';
    this.city = '';
    this.state = '';
  }

  editCustomer(c: Customer) {
    this.editingId = c.id!;
    this.name = c.name || '';
    this.accountNumber = c.account_number || '';
    this.email = c.email || '';
    this.phone = c.phone || '';
    this.gstin = c.gstin || '';
    this.contactPerson = c.contact_person || '';
    this.city = c.city || '';
    this.state = c.state || '';
    this.showForm = true;
  }

  async saveCustomer() {
    if (!this.name || !this.accountNumber) {
      const toast = await this.toastCtrl.create({ message: 'Name and Account Number are required', duration: 3000, color: 'danger' });
      toast.present();
      return;
    }
    const org = this.orgService.currentOrg!;
    const data: any = {
      organization_id: org.id,
      name: this.name,
      account_number: this.accountNumber,
      email: this.email,
      phone: this.phone,
      gstin: this.gstin,
      contact_person: this.contactPerson,
      city: this.city,
      state: this.state
    };

    try {
      if (this.editingId) {
        await this.dataService.updateCustomer(org.id, this.editingId, data);
      } else {
        await this.dataService.addCustomer(org.id, data);
      }
      this.showForm = false;
      this.resetForm();
      const toast = await this.toastCtrl.create({ message: this.editingId ? 'Customer updated' : 'Customer added', duration: 2000, color: 'success' });
      toast.present();
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: err.message, duration: 3000, color: 'danger' });
      toast.present();
    }
  }

  // --- Delete confirmation ---
  confirmDelete(c: Customer) {
    this.deleteTarget = c;
  }

  cancelDelete() {
    this.deleteTarget = null;
  }

  async doDelete() {
    if (!this.deleteTarget) return;
    await this.dataService.deleteCustomer(this.orgService.currentOrg!.id, this.deleteTarget.id!);
    const toast = await this.toastCtrl.create({ message: 'Customer deleted', duration: 2000, color: 'warning' });
    toast.present();
    this.deleteTarget = null;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
