import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { Subscription, firstValueFrom } from 'rxjs';
import { DataService } from '../../services/data.service';
import { OrgService } from '../../services/org.service';
import { Vendor, LineItem, PurchaseOrder, DocumentType } from '../../models/interfaces';

@Component({
  selector: 'app-create-po',
  templateUrl: './create-po.page.html',
  styleUrls: ['./create-po.page.scss'],
  standalone: false
})
export class CreatePoPage implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  step = 1;
  isEditing = false;
  editId = '';

  poTypes: DocumentType[] = [];
  selectedTypeId = '';
  poDate = new Date().toISOString().split('T')[0];
  expectedDeliveryDate = '';
  vendors: Vendor[] = [];
  selectedVendorId = '';
  vendorGstin = '';
  placeOfSupply = '';
  billingAddress = '';
  shippingAddress = '';
  paymentTerms = '';

  lineItems: LineItem[] = [];
  pastLineItems: any[] = [];
  suggestions: any[] = [];
  activeSuggestionIndex = -1;

  subtotal = 0;
  cgst = 0;
  sgst = 0;
  igst = 0;
  totalTax = 0;
  grandTotal = 0;
  notes = '';

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

    this.subs.push(this.dataService.getVendors(org.id).subscribe(v => this.vendors = v));
    this.subs.push(this.orgService.getDocumentTypes(org.id, 'purchase_order').subscribe(types => {
      this.poTypes = types;
      if (types.length > 0 && !this.selectedTypeId) this.selectedTypeId = types[0].id!;
    }));

    // Load past PO line items for autocomplete
    this.subs.push(this.dataService.getAllPOLineItems(org.id).subscribe(items => this.pastLineItems = items));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing = true;
      this.editId = id;
      const po = await firstValueFrom(this.dataService.getPurchaseOrder(org.id, id));
      if (po) this.loadPO(po);
    }
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private loadPO(po: PurchaseOrder) {
    this.poDate = po.po_date;
    this.expectedDeliveryDate = po.expected_delivery_date || '';
    this.selectedVendorId = po.vendor_id;
    this.vendorGstin = po.vendor_gstin || '';
    this.placeOfSupply = po.place_of_supply || '';
    this.billingAddress = po.billing_address || '';
    this.shippingAddress = po.shipping_address || '';
    this.paymentTerms = po.payment_terms || '';
    this.lineItems = [...po.line_items];
    this.notes = po.notes || '';
    this.recalculate();
  }

  onVendorChange() {
    const vendor = this.vendors.find(v => v.id === this.selectedVendorId);
    if (vendor) {
      this.vendorGstin = vendor.tax_id || '';
      this.placeOfSupply = vendor.state || '';
      this.paymentTerms = vendor.payment_terms || '';
      const addr = [vendor.address_line1, vendor.address_line2, vendor.city, vendor.state, vendor.postal_code].filter(Boolean).join(', ');
      this.billingAddress = addr;
      this.shippingAddress = addr;
    }
  }

  addLineItem() {
    this.lineItems.push({
      product_service_name: '', hsn_sac_code: '', description: '',
      quantity: 1, unit: '', rate: 0, gst_rate: 0, amount: 0
    });
  }

  removeLineItem(index: number) {
    this.lineItems.splice(index, 1);
    this.recalculate();
  }

  onItemNameInput(item: LineItem, index: number) {
    const term = item.product_service_name.toLowerCase();
    if (term.length < 2) {
      this.suggestions = [];
      this.activeSuggestionIndex = -1;
      return;
    }
    this.activeSuggestionIndex = index;
    const seen = new Set<string>();
    this.suggestions = this.pastLineItems
      .filter(p => p.product_service_name?.toLowerCase().includes(term))
      .filter(p => {
        if (seen.has(p.product_service_name)) return false;
        seen.add(p.product_service_name);
        return true;
      })
      .slice(0, 5);
  }

  selectSuggestion(item: LineItem, suggestion: any) {
    item.product_service_name = suggestion.product_service_name;
    item.hsn_sac_code = suggestion.hsn_sac_code || '';
    item.unit = suggestion.unit || '';
    item.rate = suggestion.rate || 0;
    item.gst_rate = suggestion.gst_rate || 0;
    this.suggestions = [];
    this.activeSuggestionIndex = -1;
    this.calculateLineItem(item);
  }

  calculateLineItem(item: LineItem) {
    item.amount = item.quantity * item.rate;
    this.recalculate();
  }

  recalculate() {
    this.subtotal = this.lineItems.reduce((s, i) => s + i.amount, 0);
    this.totalTax = 0;
    for (const item of this.lineItems) {
      this.totalTax += item.amount * ((item.gst_rate || 0) / 100);
    }
    this.cgst = this.totalTax / 2;
    this.sgst = this.totalTax / 2;
    this.igst = 0;
    this.grandTotal = this.subtotal + this.totalTax;
  }

  goToReview() {
    this.errors = {};
    if (!this.selectedVendorId) this.errors['vendor'] = true;
    if (this.lineItems.length === 0) this.errors['items'] = true;
    for (const item of this.lineItems) {
      if (!item.product_service_name) this.errors['items'] = true;
    }
    if (Object.keys(this.errors).length > 0) {
      this.showToast('Please fix validation errors');
      return;
    }
    this.recalculate();
    this.step = 2;
  }

  async savePO() {
    const loading = await this.loadingCtrl.create({ message: 'Saving purchase order...' });
    await loading.present();
    try {
      const org = this.orgService.currentOrg!;
      const vendor = this.vendors.find(v => v.id === this.selectedVendorId);

      const poData: any = {
        organization_id: org.id,
        po_type: this.poTypes.find(t => t.id === this.selectedTypeId)?.name || 'Purchase Order',
        po_date: this.poDate,
        expected_delivery_date: this.expectedDeliveryDate,
        vendor_id: this.selectedVendorId,
        vendor_name: vendor?.name || '',
        vendor_gstin: this.vendorGstin,
        billing_address: this.billingAddress,
        shipping_address: this.shippingAddress,
        place_of_supply: this.placeOfSupply,
        payment_terms: this.paymentTerms,
        line_items: this.lineItems,
        subtotal: this.subtotal,
        cgst: this.cgst, sgst: this.sgst, igst: this.igst,
        total_tax: this.totalTax,
        total_amount: this.grandTotal,
        notes: this.notes,
        status: 'draft'
      };

      if (this.isEditing) {
        await this.dataService.updatePurchaseOrder(org.id, this.editId, poData);
      } else {
        const docNumber = await this.orgService.getNextDocumentNumber(org.id, this.selectedTypeId);
        poData.po_number = docNumber;
        await this.dataService.addPurchaseOrder(org.id, poData);
      }

      this.router.navigate(['/purchase-orders']);
    } catch (err: any) {
      this.showToast(err.message || 'Failed to save PO');
    } finally {
      loading.dismiss();
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 3000, color: 'danger', position: 'top' });
    toast.present();
  }

  goBack() {
    if (this.step === 2) { this.step = 1; } else { this.router.navigate(['/purchase-orders']); }
  }
}
