import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Firestore, collectionData, collection, doc, docData, setDoc, updateDoc, arrayUnion, arrayRemove } from '@angular/fire/firestore';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

  constructor(
    private router: Router,
    private toastCtrl: ToastController
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

  goBack() { this.router.navigate(['/dashboard']); }
}
