import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DataService } from '../../services/data.service';
import { OrgService } from '../../services/org.service';
import { PurchaseOrder } from '../../models/interfaces';

@Component({
  selector: 'app-purchase-orders',
  templateUrl: './purchase-orders.page.html',
  styleUrls: ['./purchase-orders.page.scss'],
  standalone: false
})
export class PurchaseOrdersPage implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  purchaseOrders: PurchaseOrder[] = [];
  filteredPOs: PurchaseOrder[] = [];
  searchTerm = '';
  statusFilter = '';

  statusEdit: {
    item: PurchaseOrder;
    newStatus: string;
    date: string;
    x: number;
    y: number;
  } | null = null;

  deleteTarget: PurchaseOrder | null = null;

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
        switchMap(org => this.dataService.getPurchaseOrders(org.id))
      ).subscribe(pos => {
        this.purchaseOrders = pos;
        this.filterPOs();
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  filterPOs() {
    const term = this.searchTerm.toLowerCase();
    this.filteredPOs = this.purchaseOrders.filter(p => {
      const matchesSearch = !term ||
        p.po_number?.toLowerCase().includes(term) ||
        p.vendor_name?.toLowerCase().includes(term);
      const matchesStatus = !this.statusFilter || p.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      draft: 'medium', sent: 'primary', acknowledged: 'tertiary',
      partially_received: 'warning', received: 'success', cancelled: 'dark'
    };
    return colors[status] || 'medium';
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // --- Status popup ---
  openStatusEdit(po: PurchaseOrder, event: MouseEvent) {
    event.stopPropagation();
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.statusEdit = {
      item: po,
      newStatus: po.status,
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
      await this.dataService.updatePurchaseOrder(this.orgService.currentOrg!.id, item.id!, {
        status: newStatus as any,
        updated_at: date || new Date().toISOString().split('T')[0]
      });
      const toast = await this.toastCtrl.create({ message: 'Status updated', duration: 2000, color: 'success' });
      toast.present();
    }
    this.closeStatusEdit();
  }

  // --- Delete confirmation ---
  confirmDelete(po: PurchaseOrder) {
    this.deleteTarget = po;
  }

  cancelDelete() {
    this.deleteTarget = null;
  }

  async doDelete() {
    if (!this.deleteTarget) return;
    await this.dataService.deletePurchaseOrder(this.orgService.currentOrg!.id, this.deleteTarget.id!);
    const toast = await this.toastCtrl.create({ message: 'PO deleted', duration: 2000, color: 'warning' });
    toast.present();
    this.deleteTarget = null;
  }

  editPO(po: PurchaseOrder) {
    this.router.navigate(['/create-po', po.id]);
  }

  createPO() { this.router.navigate(['/create-po']); }
  goBack() { this.router.navigate(['/dashboard']); }
}
