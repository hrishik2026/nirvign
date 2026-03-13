import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FlowStep {
  title: string;
  url: string;
  icon: string;
}

export interface GuidedFlow {
  type: 'selling' | 'purchasing';
  label: string;
  steps: FlowStep[];
  activeStepUrl: string;
}

const SELLING_STEPS: FlowStep[] = [
  { title: 'Organization', url: '/organization', icon: 'business-outline' },
  { title: 'Sellables', url: '/products', icon: 'pricetag-outline' },
  { title: 'Customers', url: '/customers', icon: 'people-outline' },
  { title: 'Create Invoice', url: '/create-invoice', icon: 'document-text-outline' }
];

const PURCHASING_STEPS: FlowStep[] = [
  { title: 'Organization', url: '/organization', icon: 'business-outline' },
  { title: 'Purchasables', url: '/products', icon: 'swap-horizontal-outline' },
  { title: 'Vendors', url: '/vendors', icon: 'cart-outline' },
  { title: 'Create PO', url: '/create-po', icon: 'clipboard-outline' }
];

@Injectable({ providedIn: 'root' })
export class GuidedFlowService {
  private activeFlow$ = new BehaviorSubject<GuidedFlow | null>(null);
  guidedFlow$ = this.activeFlow$.asObservable();

  startFlow(type: 'selling' | 'purchasing', activeStepUrl: string) {
    const steps = type === 'selling' ? SELLING_STEPS : PURCHASING_STEPS;
    const label = type === 'selling' ? 'Selling Flow' : 'Purchasing Flow';
    this.activeFlow$.next({ type, label, steps, activeStepUrl });
  }

  setActiveStep(url: string) {
    const current = this.activeFlow$.value;
    if (current) {
      this.activeFlow$.next({ ...current, activeStepUrl: url });
    }
  }

  endFlow() {
    this.activeFlow$.next(null);
  }

  get isActive(): boolean {
    return this.activeFlow$.value !== null;
  }
}
