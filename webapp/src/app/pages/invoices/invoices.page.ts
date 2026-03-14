import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DataService } from '../../services/data.service';
import { OrgService } from '../../services/org.service';
import { Invoice } from '../../models/interfaces';

@Component({
  selector: 'app-invoices',
  templateUrl: './invoices.page.html',
  styleUrls: ['./invoices.page.scss'],
  standalone: false
})
export class InvoicesPage implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  searchTerm = '';
  statusFilter = '';

  statusEdit: {
    item: Invoice;
    newStatus: string;
    date: string;
    x: number;
    y: number;
  } | null = null;

  deleteTarget: Invoice | null = null;

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
        switchMap(org => this.dataService.getInvoices(org.id))
      ).subscribe(invoices => {
        this.invoices = invoices;
        this.filterInvoices();
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  filterInvoices() {
    const term = this.searchTerm.toLowerCase();
    this.filteredInvoices = this.invoices.filter(i => {
      const matchesSearch = !term ||
        i.invoice_number?.toLowerCase().includes(term) ||
        i.customer_name?.toLowerCase().includes(term);
      const matchesStatus = !this.statusFilter || i.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      draft: 'medium', sent: 'primary', paid: 'success', overdue: 'danger', cancelled: 'dark'
    };
    return colors[status] || 'medium';
  }

  // --- Status popup ---
  openStatusEdit(inv: Invoice, event: MouseEvent) {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.statusEdit = {
      item: inv,
      newStatus: inv.status,
      date: new Date().toISOString().split('T')[0],
      x: Math.min(rect.left, window.innerWidth - 250),
      y: rect.bottom + 4
    };
  }

  closeStatusEdit() {
    this.statusEdit = null;
  }

  async saveStatusEdit() {
    if (!this.statusEdit) return;
    const { item, newStatus, date } = this.statusEdit;
    if (newStatus !== item.status) {
      await this.dataService.updateInvoice(this.orgService.currentOrg!.id, item.id!, {
        status: newStatus as any,
        updated_at: date || new Date().toISOString().split('T')[0]
      });
      const toast = await this.toastCtrl.create({ message: 'Status updated', duration: 2000, color: 'success' });
      toast.present();
    }
    this.closeStatusEdit();
  }

  // --- Delete confirmation ---
  confirmDelete(inv: Invoice) {
    this.deleteTarget = inv;
  }

  cancelDelete() {
    this.deleteTarget = null;
  }

  async doDelete() {
    if (!this.deleteTarget) return;
    await this.dataService.deleteInvoice(this.orgService.currentOrg!.id, this.deleteTarget.id!);
    const toast = await this.toastCtrl.create({ message: 'Invoice deleted', duration: 2000, color: 'warning' });
    toast.present();
    this.deleteTarget = null;
  }

  editInvoice(inv: Invoice) {
    this.router.navigate(['/create-invoice', inv.id]);
  }

  createInvoice() {
    this.router.navigate(['/create-invoice']);
  }

  goBack() { this.router.navigate(['/dashboard']); }
}
