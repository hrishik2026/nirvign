import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { OrgService } from '../../services/org.service';
import { DataService } from '../../services/data.service';
import { GuidedFlowService, GuidedFlow } from '../../services/guided-flow.service';
import { Invoice, PurchaseOrder } from '../../models/interfaces';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  orgName = '';
  invoices: Invoice[] = [];
  purchaseOrders: PurchaseOrder[] = [];

  // Stats
  totalInvoices = 0;
  totalInvoiceAmount = 0;
  outstandingReceivables = 0;
  unpaidInvoiceCount = 0;
  totalPOs = 0;
  totalPOAmount = 0;
  outstandingPayables = 0;
  openPOCount = 0;

  // Status counts
  invoiceStatusCounts: { [key: string]: number } = {};
  poStatusCounts: { [key: string]: number } = {};

  // GST
  gstPayable = 0;
  gstCredit = 0;
  netGstPayable = 0;

  // Aging
  receivablesAging: { bucket: string; count: number; amount: number }[] = [];
  payablesAging: { bucket: string; count: number; amount: number }[] = [];

  // Recent activity
  recentActivity: any[] = [];

  loggingOut = false;
  private auth = inject(Auth);
  guidedFlowService = inject(GuidedFlowService);
  guidedFlow: GuidedFlow | null = null;
  private readonly ADMIN_EMAILS = ['hrishikeshb@gmail.com', 'rohitbhagwat@gmail.com'];
  isAppAdmin = this.ADMIN_EMAILS.includes(this.auth.currentUser?.email || '');

  menuItems = [
    { title: 'Dashboard', url: '/dashboard', icon: 'home-outline' },
    { title: 'Invoices', url: '/invoices', icon: 'document-text-outline' },
    { title: 'Purchase Orders', url: '/purchase-orders', icon: 'clipboard-outline' },
    { title: 'Customers', url: '/customers', icon: 'people-outline' },
    { title: 'Vendors', url: '/vendors', icon: 'cart-outline' },
    { title: 'Sellables', url: '/products', icon: 'pricetag-outline' },
    { title: 'Purchasables', url: '/products', icon: 'swap-horizontal-outline' },
    { title: 'Organization', url: '/organization', icon: 'business-outline' },
    { title: 'Help', url: '/help', icon: 'help-circle-outline' }
  ];

  constructor(
    private authService: AuthService,
    private orgService: OrgService,
    private dataService: DataService,
    private router: Router,
    private menuCtrl: MenuController
  ) {}

  ngOnInit() {
    const org$ = this.orgService.orgReady$;

    this.subs.push(
      this.guidedFlowService.guidedFlow$.subscribe(flow => {
        const wasNull = this.guidedFlow === null;
        this.guidedFlow = flow;
        if (flow && wasNull) {
          this.menuCtrl.open('sideMenu');
        }
      })
    );

    this.subs.push(
      org$.subscribe(org => this.orgName = org.name)
    );

    this.subs.push(
      org$.pipe(
        switchMap(org => this.dataService.getInvoices(org.id))
      ).subscribe(invoices => {
        this.invoices = invoices;
        this.calculateInvoiceStats();
        this.calculateGST();
        this.calculateReceivablesAging();
        this.buildRecentActivity();
      })
    );

    this.subs.push(
      org$.pipe(
        switchMap(org => this.dataService.getPurchaseOrders(org.id))
      ).subscribe(pos => {
        this.purchaseOrders = pos;
        this.calculatePOStats();
        this.calculateGST();
        this.calculatePayablesAging();
        this.buildRecentActivity();
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private calculateInvoiceStats() {
    this.totalInvoices = this.invoices.length;
    this.totalInvoiceAmount = this.invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
    const unpaid = this.invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');
    this.outstandingReceivables = unpaid.reduce((s, i) => s + (i.total_amount || 0), 0);
    this.unpaidInvoiceCount = unpaid.length;

    this.invoiceStatusCounts = {};
    for (const inv of this.invoices) {
      this.invoiceStatusCounts[inv.status] = (this.invoiceStatusCounts[inv.status] || 0) + 1;
    }
  }

  private calculatePOStats() {
    this.totalPOs = this.purchaseOrders.length;
    this.totalPOAmount = this.purchaseOrders.reduce((s, p) => s + (p.total_amount || 0), 0);
    const open = this.purchaseOrders.filter(p => p.status !== 'received' && p.status !== 'cancelled');
    this.outstandingPayables = open.reduce((s, p) => s + (p.total_amount || 0), 0);
    this.openPOCount = open.length;

    this.poStatusCounts = {};
    for (const po of this.purchaseOrders) {
      this.poStatusCounts[po.status] = (this.poStatusCounts[po.status] || 0) + 1;
    }
  }

  private calculateGST() {
    this.gstPayable = this.invoices
      .filter(i => i.status !== 'cancelled')
      .reduce((s, i) => s + (i.total_tax || 0), 0);
    this.gstCredit = this.purchaseOrders
      .filter(p => p.status !== 'cancelled')
      .reduce((s, p) => s + (p.total_tax || 0), 0);
    this.netGstPayable = this.gstPayable - this.gstCredit;
  }

  private calculateReceivablesAging() {
    const buckets = [
      { label: 'Current (Not Due)', min: -Infinity, max: 0 },
      { label: '1-30 Days Overdue', min: 1, max: 30 },
      { label: '31-60 Days Overdue', min: 31, max: 60 },
      { label: '60+ Days Overdue', min: 61, max: Infinity }
    ];
    const today = new Date();
    const unpaid = this.invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled');

    this.receivablesAging = buckets.map(b => {
      const matching = unpaid.filter(i => {
        const dueDate = new Date(i.due_date || i.invoice_date);
        const days = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return days >= b.min && days <= b.max;
      });
      return { bucket: b.label, count: matching.length, amount: matching.reduce((s, i) => s + (i.total_amount || 0), 0) };
    });
  }

  private calculatePayablesAging() {
    const buckets = [
      { label: 'Current (Not Due)', min: -Infinity, max: 0 },
      { label: '1-30 Days Overdue', min: 1, max: 30 },
      { label: '31-60 Days Overdue', min: 31, max: 60 },
      { label: '60+ Days Overdue', min: 61, max: Infinity }
    ];
    const today = new Date();
    const open = this.purchaseOrders.filter(p => p.status !== 'received' && p.status !== 'cancelled');

    this.payablesAging = buckets.map(b => {
      const matching = open.filter(p => {
        const dueDate = new Date(p.expected_delivery_date || p.po_date);
        const days = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return days >= b.min && days <= b.max;
      });
      return { bucket: b.label, count: matching.length, amount: matching.reduce((s, p) => s + (p.total_amount || 0), 0) };
    });
  }

  private buildRecentActivity() {
    const items: any[] = [];
    this.invoices.slice(0, 5).forEach(i => {
      items.push({ type: 'INV', number: i.invoice_number, party: i.customer_name, status: i.status, amount: i.total_amount, date: i.created_at });
    });
    this.purchaseOrders.slice(0, 5).forEach(p => {
      items.push({ type: 'PO', number: p.po_number, party: p.vendor_name, status: p.status, amount: p.total_amount, date: p.created_at });
    });
    items.sort((a, b) => {
      const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const db = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return db.getTime() - da.getTime();
    });
    this.recentActivity = items.slice(0, 5);
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      draft: 'medium', sent: 'primary', paid: 'success', overdue: 'danger', cancelled: 'dark',
      acknowledged: 'tertiary', partially_received: 'warning', received: 'success'
    };
    return colors[status] || 'medium';
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  navigate(url: string) {
    this.menuCtrl.close();
    this.router.navigate([url]);
  }

  navigateFlow(url: string) {
    this.guidedFlowService.setActiveStep(url);
    this.router.navigate([url]);
    setTimeout(() => this.menuCtrl.open('sideMenu'), 300);
  }

  exitFlow() {
    this.guidedFlowService.endFlow();
    this.menuCtrl.close();
  }

  async switchOrg() {
    this.orgService.setCurrentOrg(null);
    this.router.navigate(['/select-org'], { queryParams: { switch: '1' } });
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
