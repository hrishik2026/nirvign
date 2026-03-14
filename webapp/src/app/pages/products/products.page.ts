import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DataService } from '../../services/data.service';
import { OrgService } from '../../services/org.service';
import { Product, PricingVariant } from '../../models/interfaces';

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  standalone: false
})
export class ProductsPage implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm = '';
  showForm = false;
  editingId: string | null = null;

  name = '';
  classification: 'product' | 'service' = 'product';
  hsnSacCode = '';
  description = '';
  variants: PricingVariant[] = [];

  deleteTarget: Product | null = null;

  unitOptions = [
    { label: 'Pieces', options: ['pcs', 'nos', 'set', 'pair'] },
    { label: 'Weight', options: ['g', 'kg', 'quintal', 'ton'] },
    { label: 'Volume', options: ['ml', 'ltr', 'm3'] },
    { label: 'Length', options: ['cm', 'm', 'ft'] },
    { label: 'Area', options: ['sqft', 'sqm'] },
    { label: 'Time', options: ['min', 'hrs', 'days'] },
    { label: 'Other', options: ['monthly', 'annual', 'lumpsum'] }
  ];

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
        switchMap(org => this.dataService.getProducts(org.id))
      ).subscribe(products => {
        this.products = products;
        this.filterProducts();
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  filterProducts() {
    const term = this.searchTerm.toLowerCase();
    this.filteredProducts = this.products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.hsn_sac_code?.toLowerCase().includes(term) ||
      p.classification.toLowerCase().includes(term)
    );
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) this.resetForm();
  }

  resetForm() {
    this.editingId = null;
    this.name = ''; this.classification = 'product'; this.hsnSacCode = '';
    this.description = '';
    this.variants = [];
  }

  editProduct(p: Product) {
    this.editingId = p.id!;
    this.name = p.name;
    this.classification = this.mapClassification(p.classification);
    this.hsnSacCode = p.hsn_sac_code || '';
    this.description = p.description || '';
    this.variants = (p.pricing_variants || []).map(v => ({ ...v }));
    this.showForm = true;
  }

  /** Map old classification values (sellable_product, etc.) to new ones */
  private mapClassification(val: string): 'product' | 'service' {
    if (!val) return 'product';
    if (val === 'service' || val === 'sellable_service' || val === 'purchased_service') return 'service';
    return 'product';
  }

  async saveProduct() {
    if (!this.name) {
      const toast = await this.toastCtrl.create({ message: 'Name is required', duration: 3000, color: 'danger' });
      toast.present();
      return;
    }

    const validVariants = this.variants.filter(v => v.label && v.rate != null);
    if (validVariants.length === 0) {
      const toast = await this.toastCtrl.create({ message: 'Add at least one pricing variant', duration: 3000, color: 'danger' });
      toast.present();
      return;
    }

    const org = this.orgService.currentOrg!;
    const data: any = {
      organization_id: org.id,
      name: this.name,
      classification: this.classification,
      hsn_sac_code: this.hsnSacCode || '',
      description: this.description || '',
      pricing_variants: validVariants
    };

    try {
      if (this.editingId) {
        await this.dataService.updateProduct(org.id, this.editingId, data);
      } else {
        await this.dataService.addProduct(org.id, data);
      }
      this.showForm = false;
      this.resetForm();
      const toast = await this.toastCtrl.create({ message: 'Product saved', duration: 2000, color: 'success' });
      toast.present();
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: err.message, duration: 3000, color: 'danger' });
      toast.present();
    }
  }

  // --- Delete confirmation ---
  confirmDelete(p: Product) {
    this.deleteTarget = p;
  }

  cancelDelete() {
    this.deleteTarget = null;
  }

  async doDelete() {
    if (!this.deleteTarget) return;
    await this.dataService.deleteProduct(this.orgService.currentOrg!.id, this.deleteTarget.id!);
    const toast = await this.toastCtrl.create({ message: 'Product deleted', duration: 2000, color: 'warning' });
    toast.present();
    this.deleteTarget = null;
  }

  addVariant() {
    this.variants.push({ label: '', unit: 'pcs', rate: 0, gst_rate: 18 });
  }

  removeVariant(index: number) {
    this.variants.splice(index, 1);
  }

  isServiceType(classification: string): boolean {
    return classification === 'service' || classification === 'sellable_service' || classification === 'purchased_service';
  }

  formatClassification(classification: string): string {
    const labels: { [key: string]: string } = {
      product: 'Product', service: 'Service',
      sellable_product: 'Product', sellable_service: 'Service',
      raw_material: 'Raw Material', purchased_service: 'Service', asset: 'Asset'
    };
    return labels[classification] || classification;
  }

  goBack() { this.router.navigate(['/dashboard']); }
}
