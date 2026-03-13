import { Injectable, inject } from '@angular/core';
import {
  Auth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword,
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
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(this.firestore, 'users', firebaseUser.uid));
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

  async googleSignIn(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(this.auth, provider);
    if (credential.user) {
      const userDoc = await getDoc(doc(this.firestore, 'users', credential.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(this.firestore, 'users', credential.user.uid), {
          id: credential.user.uid,
          email: credential.user.email,
          name: credential.user.displayName || 'User',
          auth_provider: 'google'
        });
      }
    }
    return credential;
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
