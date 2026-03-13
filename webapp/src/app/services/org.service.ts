import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  deleteDoc, query, where, writeBatch, collectionData, docData, runTransaction
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { Organization, Membership, Invitation, DocumentType } from '../models/interfaces';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class OrgService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private currentOrgSubject = new BehaviorSubject<Organization | null>(null);
  currentOrg$ = this.currentOrgSubject.asObservable();

  /** Waits for auth to be ready, then emits current org reactively. */
  orgReady$: Observable<Organization> = this.authService.authReady$.pipe(
    filter(ready => ready),
    take(1),
    switchMap(() => this.currentOrgSubject.pipe(
      filter((org): org is Organization => !!org)
    ))
  );

  constructor() {
    const stored = localStorage.getItem('current_org');
    if (stored) {
      try {
        this.currentOrgSubject.next(JSON.parse(stored));
      } catch {}
    }
  }

  get currentOrg(): Organization | null {
    return this.currentOrgSubject.value;
  }

  setCurrentOrg(org: Organization | null) {
    this.currentOrgSubject.next(org);
    if (org) {
      localStorage.setItem('current_org', JSON.stringify(org));
    } else {
      localStorage.removeItem('current_org');
    }
  }

  getUserOrganizations(userId: string): Observable<Membership[]> {
    const q = query(
      collection(this.firestore, 'memberships'),
      where('user_id', '==', userId)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Membership[]>;
  }

  getOrganization(orgId: string): Observable<Organization | undefined> {
    return (docData(doc(this.firestore, 'organizations', orgId), { idField: 'id' }) as Observable<Organization | undefined>).pipe(
      map(org => org ? { ...org, id: orgId } : undefined)
    );
  }

  async createOrganization(org: Partial<Organization>, userId: string): Promise<string> {
    const newDocRef = doc(collection(this.firestore, 'organizations'));
    const orgData: Organization = {
      id: newDocRef.id,
      name: org.name || '',
      owner_email: org.owner_email || '',
      status: 'active',
      gstin: org.gstin || '',
      email: org.email || '',
      phone: org.phone || '',
      website: org.website || '',
      address_line1: org.address_line1 || '',
      address_line2: org.address_line2 || '',
      city: org.city || '',
      state: org.state || '',
      postal_code: org.postal_code || '',
      country: org.country || 'INDIA',
      default_currency: 'INR',
      ...org
    };
    orgData.id = newDocRef.id;
    await setDoc(newDocRef, orgData);

    await addDoc(collection(this.firestore, 'memberships'), {
      user_id: userId,
      organization_id: newDocRef.id,
      role: 'owner'
    });

    return newDocRef.id;
  }

  async updateOrganization(orgId: string, data: Partial<Organization>): Promise<void> {
    await updateDoc(doc(this.firestore, 'organizations', orgId), data);
    if (this.currentOrg?.id === orgId) {
      this.setCurrentOrg({ ...this.currentOrg, ...data } as Organization);
    }
  }

  async deleteOrganization(orgId: string): Promise<void> {
    const q = query(
      collection(this.firestore, 'memberships'),
      where('organization_id', '==', orgId)
    );
    const memberships = await getDocs(q);
    const batch = writeBatch(this.firestore);
    memberships.docs.forEach(d => batch.delete(d.ref));
    batch.delete(doc(this.firestore, 'organizations', orgId));
    await batch.commit();
    if (this.currentOrg?.id === orgId) {
      this.setCurrentOrg(null);
    }
  }

  getUserMembership(userId: string, orgId: string): Observable<Membership | undefined> {
    const q = query(
      collection(this.firestore, 'memberships'),
      where('user_id', '==', userId),
      where('organization_id', '==', orgId)
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Membership[]>).pipe(
      map(memberships => memberships[0])
    );
  }

  getMembers(orgId: string): Observable<Membership[]> {
    const q = query(
      collection(this.firestore, 'memberships'),
      where('organization_id', '==', orgId)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Membership[]>;
  }

  async removeMember(membershipId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'memberships', membershipId));
  }

  getPendingInvitations(email: string): Observable<Invitation[]> {
    const q = query(
      collection(this.firestore, 'invitations'),
      where('email', '==', email),
      where('status', '==', 'pending')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Invitation[]>;
  }

  getOrgInvitations(orgId: string): Observable<Invitation[]> {
    const q = query(
      collection(this.firestore, 'invitations'),
      where('organization_id', '==', orgId),
      where('status', '==', 'pending')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Invitation[]>;
  }

  async inviteMember(orgId: string, email: string, invitedBy: string): Promise<string> {
    const usersQuery = query(
      collection(this.firestore, 'users'),
      where('email', '==', email)
    );
    const users = await getDocs(usersQuery);

    if (!users.empty) {
      const userId = users.docs[0].id;
      const existingQuery = query(
        collection(this.firestore, 'memberships'),
        where('organization_id', '==', orgId),
        where('user_id', '==', userId)
      );
      const existingMembers = await getDocs(existingQuery);
      if (!existingMembers.empty) {
        throw new Error('This user is already a member of the organization');
      }
      await addDoc(collection(this.firestore, 'memberships'), {
        user_id: userId,
        organization_id: orgId,
        role: 'member'
      });
      return 'added';
    } else {
      await addDoc(collection(this.firestore, 'invitations'), {
        email,
        organization_id: orgId,
        role: 'member',
        invited_by: invitedBy,
        status: 'pending',
        created_at: new Date()
      });
      return 'invited';
    }
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'invitations', invitationId));
  }

  async acceptInvitation(invitation: Invitation, userId: string): Promise<void> {
    await addDoc(collection(this.firestore, 'memberships'), {
      user_id: userId,
      organization_id: invitation.organization_id,
      role: invitation.role
    });
    if (invitation.id) {
      await updateDoc(doc(this.firestore, 'invitations', invitation.id), { status: 'accepted' });
    }
  }

  getDocumentTypes(orgId: string, category: 'invoice' | 'purchase_order'): Observable<DocumentType[]> {
    const q = query(
      collection(this.firestore, `organizations/${orgId}/document_types`),
      where('category', '==', category)
    );
    return collectionData(q, { idField: 'id' }) as Observable<DocumentType[]>;
  }

  async addDocumentType(orgId: string, docType: Omit<DocumentType, 'id' | 'organization_id'>): Promise<string> {
    const docRef = await addDoc(collection(this.firestore, `organizations/${orgId}/document_types`), {
      ...docType,
      current_number: docType.start_number - 1
    });
    return docRef.id;
  }

  async updateDocumentType(orgId: string, id: string, data: Partial<DocumentType>): Promise<void> {
    await updateDoc(doc(this.firestore, `organizations/${orgId}/document_types`, id), data);
  }

  async deleteDocumentType(orgId: string, id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `organizations/${orgId}/document_types`, id));
  }

  async getNextDocumentNumber(orgId: string, docTypeId: string): Promise<string> {
    const counterRef = doc(this.firestore, `organizations/${orgId}/counters`, docTypeId);
    const dtRef = doc(this.firestore, `organizations/${orgId}/document_types`, docTypeId);
    return runTransaction(this.firestore, async transaction => {
      const counterSnap = await transaction.get(counterRef);
      const dtSnap = await transaction.get(dtRef);
      const dtData = dtSnap.data() as DocumentType;
      let lastNumber = 0;
      if (counterSnap.exists()) {
        lastNumber = counterSnap.data()['last_number'] || 0;
      }
      const nextNumber = lastNumber + 1;
      transaction.set(counterRef, { last_number: nextNumber }, { merge: true });
      return `${dtData.prefix}-${String(nextNumber).padStart(3, '0')}`;
    });
  }
}
