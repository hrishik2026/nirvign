import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { Firestore, collectionData, collection, doc, docData, setDoc, updateDoc, arrayUnion, arrayRemove, getDocs, deleteDoc, writeBatch } from '@angular/fire/firestore';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrgService } from '../../services/org.service';
import { Organization } from '../../models/interfaces';

@Component({
  selector: 'app-app-admin',
  templateUrl: './app-admin.page.html',
  styleUrls: ['./app-admin.page.scss'],
  standalone: false
})
export class AppAdminPage implements OnInit, OnDestroy {
  private firestore = inject(Firestore);
  private subs: Subscription[] = [];

  activeTab = 'allowed';
  allowedEmails: string[] = [];
  organizations: Organization[] = [];
  newEmail = '';

  private orgService = inject(OrgService);

  deleting = false;

  constructor(
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    // Real-time allowed users list
    const allowedDoc = doc(this.firestore, 'app_config', 'allowed_users');
    this.subs.push(
      docData(allowedDoc).pipe(
        catchError(() => of(null))
      ).subscribe((data: any) => {
        this.allowedEmails = data?.emails || [];
      })
    );

    // Real-time all organizations
    const orgsCol = collection(this.firestore, 'organizations');
    this.subs.push(
      collectionData(orgsCol, { idField: 'id' }).subscribe((orgs: any[]) => {
        this.organizations = orgs as Organization[];
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  async addAllowedUser() {
    const email = this.newEmail.trim().toLowerCase();
    if (!email) return;
    if (this.allowedEmails.includes(email)) {
      const toast = await this.toastCtrl.create({ message: 'Email already in list', duration: 2000, color: 'warning' });
      toast.present();
      return;
    }

    const allowedDoc = doc(this.firestore, 'app_config', 'allowed_users');
    try {
      await setDoc(allowedDoc, { emails: arrayUnion(email) }, { merge: true });
      this.newEmail = '';
      const toast = await this.toastCtrl.create({ message: `${email} added`, duration: 2000, color: 'success' });
      toast.present();
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: err.message, duration: 3000, color: 'danger' });
      toast.present();
    }
  }

  async removeAllowedUser(email: string) {
    const allowedDoc = doc(this.firestore, 'app_config', 'allowed_users');
    try {
      await updateDoc(allowedDoc, { emails: arrayRemove(email) });
      const toast = await this.toastCtrl.create({ message: `${email} removed`, duration: 2000, color: 'warning' });
      toast.present();
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: err.message, duration: 3000, color: 'danger' });
      toast.present();
    }
  }

  async updateOrgStatus(org: Organization, newStatus: string) {
    const orgDoc = doc(this.firestore, 'organizations', org.id);
    try {
      await updateDoc(orgDoc, {
        status: newStatus,
        status_date: new Date().toISOString()
      });
      const toast = await this.toastCtrl.create({ message: `${org.name} set to ${newStatus}`, duration: 2000, color: 'success' });
      toast.present();
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: err.message, duration: 3000, color: 'danger' });
      toast.present();
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'deleted': return 'danger';
      default: return 'medium';
    }
  }

  async confirmDeleteAllData() {
    const alert = await this.alertCtrl.create({
      header: 'Delete All Data',
      message: 'This will permanently delete all organizations, users, memberships, invitations, and all org data (customers, vendors, invoices, etc.). Only app admin settings and allowed users will be preserved. This cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete Everything',
          role: 'destructive',
          cssClass: 'alert-button-danger',
          handler: () => this.deleteAllData()
        }
      ]
    });
    await alert.present();
  }

  async deleteAllData() {
    this.deleting = true;
    const ORG_SUBCOLLECTIONS = ['customers', 'vendors', 'products_services', 'invoices', 'purchase_orders', 'document_types', 'counters'];

    try {
      // Delete all org subcollections first
      const orgsSnap = await getDocs(collection(this.firestore, 'organizations'));
      for (const orgDoc of orgsSnap.docs) {
        for (const sub of ORG_SUBCOLLECTIONS) {
          const subSnap = await getDocs(collection(this.firestore, `organizations/${orgDoc.id}/${sub}`));
          const batch = writeBatch(this.firestore);
          subSnap.docs.forEach(d => batch.delete(d.ref));
          if (subSnap.docs.length > 0) await batch.commit();
        }
      }

      // Delete root collections (except app_config)
      const ROOT_COLLECTIONS = ['organizations', 'users', 'memberships', 'invitations'];
      for (const col of ROOT_COLLECTIONS) {
        const snap = await getDocs(collection(this.firestore, col));
        const batch = writeBatch(this.firestore);
        snap.docs.forEach(d => batch.delete(d.ref));
        if (snap.docs.length > 0) await batch.commit();
      }

      // Clear current org from localStorage and redirect
      localStorage.removeItem('current_org');
      const toast = await this.toastCtrl.create({ message: 'All data deleted', duration: 3000, color: 'warning' });
      toast.present();
      this.router.navigate(['/select-org']);
    } catch (err: any) {
      const toast = await this.toastCtrl.create({ message: `Error: ${err.message}`, duration: 3000, color: 'danger' });
      toast.present();
    } finally {
      this.deleting = false;
    }
  }

  goBack() {
    this.router.navigate([this.orgService.currentOrg ? '/dashboard' : '/select-org']);
  }
}
