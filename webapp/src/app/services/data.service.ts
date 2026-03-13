import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, writeBatch, collectionData, docData
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Customer, Vendor, Product, Invoice, PurchaseOrder } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class DataService {
  private firestore = inject(Firestore);

  // Customers (subcollection under organization)
  getCustomers(orgId: string): Observable<Customer[]> {
    return (collectionData(
      collection(this.firestore, `organizations/${orgId}/customers`),
      { idField: 'id' }
    ) as Observable<Customer[]>).pipe(
      map(customers => customers.sort((a, b) => a.name.localeCompare(b.name)))
    );
  }

  async addCustomer(orgId: string, customer: Omit<Customer, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(this.firestore, `organizations/${orgId}/customers`), customer);
    return docRef.id;
  }

  async updateCustomer(orgId: string, id: string, data: Partial<Customer>): Promise<void> {
    await updateDoc(doc(this.firestore, `organizations/${orgId}/customers`, id), data);
  }

  async deleteCustomer(orgId: string, id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `organizations/${orgId}/customers`, id));
  }

  async replaceAllCustomers(orgId: string, customers: Customer[]): Promise<void> {
    const colRef = collection(this.firestore, `organizations/${orgId}/customers`);
    const existing = await getDocs(colRef);
    const batch = writeBatch(this.firestore);
    existing.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    for (let i = 0; i < customers.length; i += 500) {
      const batchWrite = writeBatch(this.firestore);
      const chunk = customers.slice(i, i + 500);
      chunk.forEach(c => {
        const ref = doc(colRef);
        batchWrite.set(ref, c);
      });
      await batchWrite.commit();
    }
  }

  // Vendors (subcollection under organization)
  getVendors(orgId: string): Observable<Vendor[]> {
    return (collectionData(
      collection(this.firestore, `organizations/${orgId}/vendors`),
      { idField: 'id' }
    ) as Observable<Vendor[]>).pipe(
      map(vendors => vendors.sort((a, b) => a.name.localeCompare(b.name)))
    );
  }

  async addVendor(orgId: string, vendor: Omit<Vendor, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(this.firestore, `organizations/${orgId}/vendors`), vendor);
    return docRef.id;
  }

  async updateVendor(orgId: string, id: string, data: Partial<Vendor>): Promise<void> {
    await updateDoc(doc(this.firestore, `organizations/${orgId}/vendors`, id), data);
  }

  async deleteVendor(orgId: string, id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `organizations/${orgId}/vendors`, id));
  }

  async replaceAllVendors(orgId: string, vendors: Vendor[]): Promise<void> {
    const colRef = collection(this.firestore, `organizations/${orgId}/vendors`);
    const existing = await getDocs(colRef);
    const batch = writeBatch(this.firestore);
    existing.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    for (let i = 0; i < vendors.length; i += 500) {
      const batchWrite = writeBatch(this.firestore);
      const chunk = vendors.slice(i, i + 500);
      chunk.forEach(v => {
        const ref = doc(colRef);
        batchWrite.set(ref, v);
      });
      await batchWrite.commit();
    }
  }

  // Products (subcollection: products_services, matching old codebase)
  getProducts(orgId: string): Observable<Product[]> {
    return (collectionData(
      collection(this.firestore, `organizations/${orgId}/products_services`),
      { idField: 'id' }
    ) as Observable<Product[]>).pipe(
      map(products => products.sort((a, b) => a.name.localeCompare(b.name)))
    );
  }

  async addProduct(orgId: string, product: Omit<Product, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(this.firestore, `organizations/${orgId}/products_services`), product);
    return docRef.id;
  }

  async updateProduct(orgId: string, id: string, data: Partial<Product>): Promise<void> {
    // Strip undefined values — Firestore rejects them
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) clean[k] = v;
    }
    await updateDoc(doc(this.firestore, `organizations/${orgId}/products_services`, id), clean);
  }

  async deleteProduct(orgId: string, id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `organizations/${orgId}/products_services`, id));
  }

  // Invoices (subcollection under organization)
  getInvoices(orgId: string): Observable<Invoice[]> {
    return (collectionData(
      collection(this.firestore, `organizations/${orgId}/invoices`),
      { idField: 'id' }
    ) as Observable<Invoice[]>).pipe(
      map(invoices => invoices.sort((a, b) => {
        const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
        const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      }))
    );
  }

  getInvoice(orgId: string, id: string): Observable<Invoice | undefined> {
    return (docData(doc(this.firestore, `organizations/${orgId}/invoices`, id)) as Observable<Invoice | undefined>).pipe(
      map(inv => inv ? { ...inv, id } : undefined)
    );
  }

  async addInvoice(orgId: string, invoice: Invoice): Promise<string> {
    const docRef = await addDoc(collection(this.firestore, `organizations/${orgId}/invoices`), {
      ...invoice,
      created_at: new Date(),
      updated_at: new Date()
    });
    return docRef.id;
  }

  async updateInvoice(orgId: string, id: string, data: Partial<Invoice>): Promise<void> {
    await updateDoc(doc(this.firestore, `organizations/${orgId}/invoices`, id), {
      ...data,
      updated_at: new Date()
    });
  }

  async deleteInvoice(orgId: string, id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `organizations/${orgId}/invoices`, id));
  }

  getCustomerInvoices(orgId: string, customerId: string): Observable<Invoice[]> {
    const q = query(
      collection(this.firestore, `organizations/${orgId}/invoices`),
      where('customer_id', '==', customerId)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Invoice[]>;
  }

  // Purchase Orders (subcollection under organization)
  getPurchaseOrders(orgId: string): Observable<PurchaseOrder[]> {
    return (collectionData(
      collection(this.firestore, `organizations/${orgId}/purchase_orders`),
      { idField: 'id' }
    ) as Observable<PurchaseOrder[]>).pipe(
      map(pos => pos.sort((a, b) => {
        const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
        const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      }))
    );
  }

  getPurchaseOrder(orgId: string, id: string): Observable<PurchaseOrder | undefined> {
    return (docData(doc(this.firestore, `organizations/${orgId}/purchase_orders`, id)) as Observable<PurchaseOrder | undefined>).pipe(
      map(po => po ? { ...po, id } : undefined)
    );
  }

  async addPurchaseOrder(orgId: string, po: PurchaseOrder): Promise<string> {
    const docRef = await addDoc(collection(this.firestore, `organizations/${orgId}/purchase_orders`), {
      ...po,
      created_at: new Date(),
      updated_at: new Date()
    });
    return docRef.id;
  }

  async updatePurchaseOrder(orgId: string, id: string, data: Partial<PurchaseOrder>): Promise<void> {
    await updateDoc(doc(this.firestore, `organizations/${orgId}/purchase_orders`, id), {
      ...data,
      updated_at: new Date()
    });
  }

  async deletePurchaseOrder(orgId: string, id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `organizations/${orgId}/purchase_orders`, id));
  }

  getVendorPOs(orgId: string, vendorId: string): Observable<PurchaseOrder[]> {
    const q = query(
      collection(this.firestore, `organizations/${orgId}/purchase_orders`),
      where('vendor_id', '==', vendorId)
    );
    return collectionData(q, { idField: 'id' }) as Observable<PurchaseOrder[]>;
  }

  getAllPOLineItems(orgId: string): Observable<any[]> {
    return this.getPurchaseOrders(orgId).pipe(
      map(pos => {
        const items: any[] = [];
        pos.forEach(po => {
          po.line_items?.forEach(item => {
            items.push({
              ...item,
              po_date: po.po_date,
              po_number: po.po_number
            });
          });
        });
        return items;
      })
    );
  }
}
