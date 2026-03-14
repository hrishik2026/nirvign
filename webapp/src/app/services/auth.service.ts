import { Injectable, inject } from '@angular/core';
import {
  Auth, signInWithPopup, signInWithRedirect, getRedirectResult,
  GoogleAuthProvider, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, onAuthStateChanged, UserCredential
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { User } from '../models/interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private authReadySubject = new BehaviorSubject<boolean>(false);

  user$: Observable<User | null> = this.currentUserSubject.asObservable();
  authReady$ = this.authReadySubject.asObservable();

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    // Handle Google redirect result first (for mobile browsers where popup is blocked)
    // Must complete before we signal auth ready, so the user doc exists
    try {
      const credential = await getRedirectResult(this.auth);
      if (credential?.user) {
        await this.ensureUserDoc(credential.user);
      }
    } catch {}

    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User doc may have just been created by ensureUserDoc above — retry once if missing
        let userDoc = await getDoc(doc(this.firestore, 'users', firebaseUser.uid));
        if (!userDoc.exists()) {
          await this.ensureUserDoc(firebaseUser);
          userDoc = await getDoc(doc(this.firestore, 'users', firebaseUser.uid));
        }
        if (userDoc.exists()) {
          this.currentUserSubject.next({ ...userDoc.data(), id: firebaseUser.uid } as User);
        } else {
          this.currentUserSubject.next(null);
        }
      } else {
        this.currentUserSubject.next(null);
      }
      this.authReadySubject.next(true);
    });
  }

  private async ensureUserDoc(user: any): Promise<void> {
    const userDoc = await getDoc(doc(this.firestore, 'users', user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(this.firestore, 'users', user.uid), {
        id: user.uid,
        email: user.email,
        name: user.displayName || 'User',
        auth_provider: 'google'
      });
    }
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get currentOrg(): any {
    const stored = localStorage.getItem('current_org');
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  }

  async login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async register(name: string, email: string, password: string): Promise<UserCredential> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    if (credential.user) {
      await setDoc(doc(this.firestore, 'users', credential.user.uid), {
        id: credential.user.uid,
        email,
        name,
        auth_provider: 'local'
      });
    }
    return credential;
  }

  async googleSignIn(): Promise<UserCredential | null> {
    const provider = new GoogleAuthProvider();
    try {
      const credential = await signInWithPopup(this.auth, provider);
      if (credential.user) {
        await this.ensureUserDoc(credential.user);
      }
      return credential;
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        // Mobile browsers block popups — fall back to redirect
        await signInWithRedirect(this.auth, provider);
        return null;
      }
      throw err;
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem('current_org');
    return signOut(this.auth);
  }

  async getUser(userId: string): Promise<User | null> {
    const userDoc = await getDoc(doc(this.firestore, 'users', userId));
    if (userDoc.exists()) {
      return { ...userDoc.data(), id: userDoc.id } as User;
    }
    return null;
  }
}
