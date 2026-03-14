export interface User {
  id: string;
  email: string;
  name: string;
  auth_provider: 'local' | 'google';
}

export interface Organization {
  id: string;
  name: string;
  owner_email: string;
  status: 'active' | 'suspended' | 'deleted';
  status_date?: string;
  gstin?: string;
  email?: string;
  phone?: string;
  fax?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  default_currency?: string;
  logo_url?: string;
  training_mode?: boolean;
}

export interface Membership {
  id?: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'member';
}

export interface Invitation {
  id?: string;
  email: string;
  organization_id: string;
  role: 'owner' | 'member';
  invited_by: string;
  status: 'pending' | 'accepted';
  created_at: any;
}

export interface Customer {
  id?: string;
  organization_id: string;
  name: string;
  account_number: string;
  gstin?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  notes?: string;
}

export interface Vendor {
  id?: string;
  organization_id: string;
  name: string;
  account_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  payment_terms?: string;
  tax_id?: string;
  bank_name?: string;
  bank_account?: string;
  bank_routing?: string;
  notes?: string;
}

export interface PricingVariant {
  label: string;
  unit: string;
  rate: number;
  gst_rate: number;
  quantity?: number;
}

export interface Product {
  id?: string;
  organization_id: string;
  name: string;
  description?: string;
  classification: 'product' | 'service';
  hsn_sac_code?: string;
  pricing_variants: PricingVariant[];
}

export interface LineItem {
  product_service_id?: string;
  product_service_name: string;
  hsn_sac_code?: string;
  description?: string;
  quantity: number;
  unit?: string;
  rate: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  gst_rate?: number;
  amount: number;
  selected_variant?: string;
}

export interface Invoice {
  id?: string;
  organization_id: string;
  invoice_number: string;
  invoice_type: string;
  invoice_date: string;
  due_date?: string;
  customer_id: string;
  customer_name: string;
  customer_gstin?: string;
  billing_address?: string;
  shipping_address?: string;
  place_of_supply?: string;
  line_items: LineItem[];
  subtotal: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
  total_amount: number;
  notes?: string;
  terms_and_conditions?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  created_at: any;
  updated_at: any;
}

export interface PurchaseOrder {
  id?: string;
  organization_id: string;
  po_number: string;
  po_type: string;
  po_date: string;
  expected_delivery_date?: string;
  vendor_id: string;
  vendor_name: string;
  vendor_gstin?: string;
  billing_address?: string;
  shipping_address?: string;
  place_of_supply?: string;
  line_items: LineItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_tax: number;
  total_amount: number;
  payment_terms?: string;
  notes?: string;
  terms_and_conditions?: string;
  status: 'draft' | 'sent' | 'acknowledged' | 'partially_received' | 'received' | 'cancelled';
  created_at: any;
  updated_at: any;
}

export interface DocumentType {
  id?: string;
  organization_id: string;
  category: 'invoice' | 'purchase_order';
  name: string;
  prefix: string;
  start_number: number;
  current_number: number;
}
