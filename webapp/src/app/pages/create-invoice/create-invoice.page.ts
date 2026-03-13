import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { Subscription, firstValueFrom } from 'rxjs';
import { DataService } from '../../services/data.service';
import { OrgService } from '../../services/org.service';
import { Customer, Product, PricingVariant, LineItem, Invoice, DocumentType } from '../../models/interfaces';

@Component({
  selector: 'app-create-invoice',
  templateUrl: './create-invoice.page.html',
  styleUrls: ['./create-invoice.page.scss'],
  standalone: false
})
export class CreateInvoicePage implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  step = 1;
  isEditing = false;
  editId = '';

  // Invoice details
  invoiceTypes: DocumentType[] = [];
  selectedTypeId = '';
  invoiceDate = new Date().toISOString().split('T')[0];
  dueDate = '';
  customers: Customer[] = [];
  selectedCustomerId = '';
  customerGstin = '';
  placeOfSupply = '';
  billingAddress = '';
  shippingAddress = '';

  // Line items
  products: Product[] = [];
  lineItems: LineItem[] = [];

  // Review / totals
  subtotal = 0;
  overallDiscountType: 'percentage' | 'fixed' = 'fixed';
  overallDiscountValue = 0;
  discountedSubtotal = 0;
  cgst = 0;
  sgst = 0;
  igst = 0;
  totalTax = 0;
  grandTotal = 0;
  notes = '';

  // Validation
  errors: { [key: string]: boolean } = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private orgService: OrgService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    const org = this.orgService.currentOrg;
    if (!org) return;

    // Load customers and products
    this.subs.push(this.dataService.getCustomers(org.id).subscribe(c => this.customers = c));
    this.subs.push(this.dataService.getProducts(org.id).subscribe(p => this.products = p));

    // Load invoice types
    this.subs.push(this.orgService.getDocumentTypes(org.id, 'invoice').subscribe(types => {
      this.invoiceTypes = types;
      if (types.length > 0 && !this.selectedTypeId) {
        this.selectedTypeId = types[0].id!;
      }
    }));

    // Check if editing
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing = true;
      this.editId = id;
      const inv = await firstValueFrom(this.dataService.getInvoice(org.id, id));
      if (inv) {
        this.loadInvoice(inv);
      }
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private loadInvoice(inv: Invoice) {
    this.invoiceDate = inv.invoice_date;
    this.dueDate = inv.due_date || '';
    this.selectedCustomerId = inv.customer_id;
    this.customerGstin = inv.customer_gstin || '';
    this.placeOfSupply = inv.place_of_supply || '';
    this.billingAddress = inv.billing_address || '';
    this.shippingAddress = inv.shipping_address || '';
    this.lineItems = [...inv.line_items];
    this.overallDiscountType = inv.discount_type || 'fixed';
    this.overallDiscountValue = inv.discount_value || 0;
    this.notes = inv.notes || '';
    this.recalculate();
  }

  onCustomerChange() {
    const customer = this.customers.find(c => c.id === this.selectedCustomerId);
    if (customer) {
      this.customerGstin = customer.gstin || '';
      this.placeOfSupply = customer.state || '';
      const addr = [customer.address_line1, customer.address_line2, customer.city, customer.state, customer.postal_code].filter(Boolean).join(', ');
      this.billingAddress = addr;
      this.shippingAddress = addr;
    }
  }

  addLineItem() {
    this.lineItems.push({
      product_service_id: '',
      product_service_name: '',
      hsn_sac_code: '',
      description: '',
      quantity: 1,
      unit: '',
      rate: 0,
      discount_type: 'fixed',
      discount_value: 0,
      gst_rate: 0,
      amount: 0
    });
  }

  removeLineItem(index: number) {
    this.lineItems.splice(index, 1);
    this.recalculate();
  }

  onProductSelect(item: LineItem) {
    const product = this.products.find(p => p.id === item.product_service_id);
    if (product) {
      item.product_service_name = product.name;
      item.hsn_sac_code = product.hsn_sac_code || '';

      const variants = product.pricing_variants || [];
      if (variants.length > 0) {
        item.selected_variant = variants[0].label;
        item.rate = variants[0].rate;
        item.unit = variants[0].unit;
        item.gst_rate = variants[0].gst_rate;
      }
      this.calculateLineItem(item);
    }
  }

  getVariants(item: LineItem): PricingVariant[] {
    if (!item.product_service_id) return [];
    const product = this.products.find(p => p.id === item.product_service_id);
    return product?.pricing_variants || [];
  }

  onVariantSelect(item: LineItem) {
    const variants = this.getVariants(item);
    const selected = variants.find(v => v.label === item.selected_variant);
    if (selected) {
      item.rate = selected.rate;
      item.unit = selected.unit;
      item.gst_rate = selected.gst_rate;
      this.calculateLineItem(item);
    }
  }

  calculateLineItem(item: LineItem) {
    let lineTotal = item.quantity * item.rate;
    if (item.discount_value) {
      if (item.discount_type === 'percentage') {
        lineTotal -= lineTotal * (item.discount_value / 100);
      } else {
        lineTotal -= item.discount_value;
      }
    }
    item.amount = Math.max(0, lineTotal);
    this.recalculate();
  }

  recalculate() {
    this.subtotal = this.lineItems.reduce((s, i) => s + i.amount, 0);

    // Overall discount
    let disc = 0;
    if (this.overallDiscountValue) {
      if (this.overallDiscountType === 'percentage') {
        disc = this.subtotal * (this.overallDiscountValue / 100);
      } else {
        disc = this.overallDiscountValue;
      }
    }
    this.discountedSubtotal = Math.max(0, this.subtotal - disc);

    // GST calculation (proportional per line item)
    this.totalTax = 0;
    if (this.subtotal > 0) {
      for (const item of this.lineItems) {
        const proportion = item.amount / this.subtotal;
        const itemDiscounted = this.discountedSubtotal * proportion;
        const itemTax = itemDiscounted * ((item.gst_rate || 0) / 100);
        this.totalTax += itemTax;
      }
    }
    this.cgst = this.totalTax / 2;
    this.sgst = this.totalTax / 2;
    this.igst = 0;
    this.grandTotal = this.discountedSubtotal + this.totalTax;
  }

  goToReview() {
    this.errors = {};
    if (!this.selectedCustomerId) this.errors['customer'] = true;
    if (this.lineItems.length === 0) this.errors['items'] = true;
    for (const item of this.lineItems) {
      if (!item.product_service_id) this.errors['items'] = true;
    }
    if (Object.keys(this.errors).length > 0) {
      this.showToast('Please fix validation errors');
      return;
    }
    this.recalculate();
    this.step = 2;
  }

  async saveInvoice() {
    const loading = await this.loadingCtrl.create({ message: 'Saving invoice...' });
    await loading.present();
    try {
      const org = this.orgService.currentOrg!;
      const customer = this.customers.find(c => c.id === this.selectedCustomerId);

      const invoiceData: any = {
        organization_id: org.id,
        invoice_type: this.invoiceTypes.find(t => t.id === this.selectedTypeId)?.name || 'Invoice',
        invoice_date: this.invoiceDate,
        due_date: this.dueDate,
        customer_id: this.selectedCustomerId,
        customer_name: customer?.name || '',
        customer_gstin: this.customerGstin,
        billing_address: this.billingAddress,
        shipping_address: this.shippingAddress,
        place_of_supply: this.placeOfSupply,
        line_items: this.lineItems,
        subtotal: this.subtotal,
        discount_type: this.overallDiscountType,
        discount_value: this.overallDiscountValue,
        cgst: this.cgst,
        sgst: this.sgst,
        igst: this.igst,
        total_tax: this.totalTax,
        total_amount: this.grandTotal,
        notes: this.notes,
        status: 'draft'
      };

      if (this.isEditing) {
        await this.dataService.updateInvoice(org.id, this.editId, invoiceData);
      } else {
        const docNumber = await this.orgService.getNextDocumentNumber(org.id, this.selectedTypeId);
        invoiceData.invoice_number = docNumber;
        await this.dataService.addInvoice(org.id, invoiceData);
      }

      this.router.navigate(['/invoices']);
    } catch (err: any) {
      this.showToast(err.message || 'Failed to save invoice');
    } finally {
      loading.dismiss();
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 3000, color: 'danger', position: 'top' });
    toast.present();
  }

  goBack() {
    if (this.step === 2) {
      this.step = 1;
    } else {
      this.router.navigate(['/invoices']);
    }
  }
}
