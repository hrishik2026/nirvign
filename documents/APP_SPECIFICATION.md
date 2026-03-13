# Invoice Pay - Application Specification

This document provides a complete business description of the **Invoice Pay** application, page by page. It covers all fields, validations, behaviors, and business logic present in the application. This is a multi-tenant invoicing and purchase order management application built for Indian businesses with GST support.

---

## Application Overview

**Invoice Pay** is a business finance application that allows organizations to:
- Manage customers and vendors
- Create and track invoices (sales)
- Create and track purchase orders (procurement)
- Manage a catalog of sellable products and services (for invoices)
- View a dashboard with financial summaries and aging reports
- Manage organization settings, document types, and team members

The application is multi-tenant: each user can belong to multiple organizations, and all data (customers, vendors, invoices, purchase orders, products) is scoped to the selected organization.

All monetary amounts are displayed in Indian Rupees (INR) using Indian numbering format (e.g., 1,00,000 instead of 100,000).

---

## Data Model Summary

Before describing each page, here is a summary of the core data entities:

### User
- **id**: Unique identifier
- **email**: User's email address
- **name**: Full name
- **auth_provider**: Either `local` (email/password) or `google`

### Organization
- **id**: Unique identifier
- **name**: Organization name (required)
- **owner_email**: Email of the organization owner
- **status**: `active`, `suspended`, or `rolled_off`
- **gstin**: GST Identification Number (optional)
- **address_line1**, **address_line2**, **city**, **state**, **postal_code**, **country**: Address fields (all optional)
- **phone**, **email**, **website**: Contact details (all optional)
- **logo_url**: URL to uploaded organization logo (optional)

### Document Type
- **id**: Unique identifier
- **name**: Display name (e.g., "Tax Invoice", "Purchase Order")
- **category**: Either `invoice` or `purchase_order`
- **prefix**: Up to 3 characters used in document numbering (e.g., "INV", "PO")
- **start_number**: The number from which auto-numbering begins

### Membership
- **user_id**: Reference to a user
- **organization_id**: Reference to an organization
- **role**: Either `owner` or `member`

### Invitation
- **email**: Email of the invitee
- **organization_id**: Target organization
- **role**: Role to assign upon acceptance
- **invited_by**: User ID of the person who sent the invitation
- **status**: `pending` or `accepted`
- **created_at**: Timestamp

### Customer
- **name**: Customer name (required)
- **account_number**: Customer account number (required)
- **gstin**: GST Identification Number (optional)
- **address_line1**, **address_line2**, **city**, **state**, **postal_code**, **country**: Address fields (all optional)
- **email**, **phone**: Contact details (optional)
- **contact_person**: Name of primary contact (optional)
- **notes**: Free-text notes (optional)

### Vendor
- **name**: Vendor name (required)
- **account_number**: Vendor account number (optional)
- **address_line1**, **address_line2**, **city**, **state**, **postal_code**, **country**: Address fields (all optional)
- **email**, **phone**: Contact details (optional)
- **contact_person**: Name of primary contact (optional)
- **payment_terms**: e.g., "Net 30" (optional)
- **tax_id**: Tax identification number (optional)
- **bank_name**, **bank_account**, **bank_routing**: Banking details (all optional)
- **notes**: Free-text notes (optional)

### Product / Service (Sellable Catalog)
This catalog contains only items that the organization **sells** — i.e., products and services that appear on invoices. Purchased items (raw materials, assets, etc.) are **not** maintained in a catalog; they are entered as free text on purchase orders.

- **name**: Product or service name (required)
- **description**: Optional description
- **classification**: Either `product` or `service` (required)
- **hsn_sac_code**: HSN code for goods or SAC code for services (optional)
- **unit**: Unit of measure, e.g., `pcs`, `kg`, `hrs`, `nos` (required)
- **default_rate**: Default selling price per unit (optional)
- **gst_rate**: GST percentage, e.g., 5, 12, 18, 28 (optional)
- **category**: Grouping category (optional)
- **notes**: Free-text notes (optional)

### Line Item (used in Invoices and Purchase Orders)
Line items on invoices and purchase orders share a common structure but behave differently:
- On **invoices**, line items are selected from the product/service catalog (dropdown). Fields auto-fill from the catalog and rate is read-only.
- On **purchase orders**, line items are entered as free text. The system suggests matches from past PO history as the user types, and auto-fills remaining fields from the most recent matching entry. All fields are editable.

**Fields:**
- **product_service_id**: Reference to a product/service from the catalog (invoices only; not used for POs)
- **product_service_name**: Name of the item (required). On invoices, populated from catalog. On POs, typed by user with autocomplete suggestions.
- **hsn_sac_code**: HSN/SAC code (optional)
- **description**: Line item description (optional)
- **quantity**: Number of units (required)
- **unit**: Unit of measure (optional)
- **rate**: Price per unit (required)
- **discount_type**: `percentage` or `fixed` (optional, invoices only)
- **discount_value**: Discount amount or percentage (optional, invoices only)
- **gst_rate**: GST percentage for this item (optional)
- **amount**: Computed value = (quantity x rate) - discount (invoices) or (quantity x rate) (POs)

### Invoice
- **invoice_number**: Auto-generated document number (e.g., "INV-001")
- **invoice_date**: Date of the invoice (required)
- **due_date**: Payment due date (optional)
- **customer_id** / **customer_name**: Customer reference (customer is required)
- **customer_gstin**: Customer's GST number (optional)
- **billing_address**, **shipping_address**: Addresses (optional)
- **place_of_supply**: State code for GST determination (optional)
- **line_items**: Array of line items (at least one required)
- **subtotal**: Sum of all line item amounts (computed)
- **discount_type** / **discount_value**: Overall invoice discount (optional)
- **cgst**, **sgst**, **igst**: GST components (computed)
- **total_tax**: Total GST amount (computed)
- **total_amount**: Grand total = discounted subtotal + total tax (computed)
- **amount_in_words**: Total in words (optional)
- **status**: `draft`, `sent`, `paid`, `overdue`, or `cancelled`
- **notes**, **terms_and_conditions**: Free-text fields (optional)
- **created_at**, **updated_at**: Timestamps

### Purchase Order
- **po_number**: Auto-generated document number (e.g., "PO-001")
- **po_date**: Date of the PO (required)
- **expected_delivery_date**: Expected delivery (optional)
- **vendor_id** / **vendor_name**: Vendor reference (vendor is required)
- **vendor_gstin**: Vendor's GST number (optional)
- **billing_address**, **shipping_address**: Addresses (optional)
- **place_of_supply**: State code for GST determination (optional)
- **line_items**: Array of line items (at least one required)
- **subtotal**: Sum of all line item amounts (computed)
- **cgst**, **sgst**, **igst**: GST components (computed)
- **total_tax**: Total GST amount (computed)
- **total_amount**: Grand total = subtotal + total tax (computed)
- **status**: `draft`, `sent`, `acknowledged`, `partially_received`, `received`, or `cancelled`
- **payment_terms**: Payment terms (optional)
- **notes**, **terms_and_conditions**: Free-text fields (optional)
- **created_at**, **updated_at**: Timestamps

---

## Page-by-Page Description

---

### 1. Login Page (`/login`)

**Purpose:** Allows existing users to sign in to the application.

**Access:** Only accessible to unauthenticated users. Authenticated users are automatically redirected to the Dashboard (or Select Organization page if no organization is set).

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Email | Email input | Yes | User's email address |
| Password | Password input | Yes | User's password |

**Validations:**
- Both email and password must be provided before submission
- Displays error message if login fails (e.g., wrong credentials)

**Behaviors:**
- **Login button**: Submits email/password credentials. Shows a loading spinner while processing.
- **Sign in with Google button**: Initiates Google OAuth popup sign-in flow.
- **Register link**: Navigates to the Register page.
- After successful login:
  - If the user belongs to exactly one active organization, they are automatically taken to the Dashboard.
  - If the user belongs to multiple organizations (or none), they are taken to the Select Organization page.

---

### 2. Register Page (`/register`) — Two-Step Flow

**Purpose:** Allows new users to create an account and set up their organization context. This is a two-step wizard. The user account is fully created after Step 1 — if the user leaves or closes the browser at that point, they are already a registered user and will use the Login page on their next visit.

**Access:** Only accessible to unauthenticated users.

---

#### Step 1: Create Account

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Full Name | Text input | Yes | User's full name |
| Email | Email input | Yes | User's email address |
| Password | Password input | Yes | Must be at least 6 characters |
| Confirm Password | Password input | Yes | Must match the Password field |

**Validations:**
- Full name, email, and password are all required
- Password must be at least 6 characters
- Password and Confirm Password must match

**Behaviors:**
- **Register button**: Creates the user account (Firebase Auth + Firestore user document). Shows loading spinner while processing.
- **Sign up with Google button**: Initiates Google OAuth popup sign-up flow. If the user is new, creates their Firestore user document automatically (using their Google display name and email).
- **Login link**: Navigates to the Login page for existing users.
- On successful account creation, the user is now fully registered and authenticated. The system checks for pending invitations and existing memberships, then advances to Step 2.

**Important — account is created at this point:** The user now exists in the system with valid credentials. If they abandon the flow here (close the browser, navigate away, etc.), they will **not** return to the Register page. On their next visit they will use the **Login page** to sign in, and will be routed to the **Select Organization page** to choose or create an organization.

---

#### Step 2: Choose or Create Organization

After the account is created, the system checks whether the user's email has any pending invitations or existing organization memberships. The user is presented with the appropriate options:

**Scenario A — Pending invitation exists:**
- The invitation is automatically accepted: the user is added to the inviting organization with the role specified in the invitation.
- The user sees that they have been added to the organization, along with the option to select it and proceed to the Dashboard.

**Scenario B — User already belongs to one or more organizations (e.g., was pre-added by an owner):**
- A list of the user's organizations is displayed, each showing:
  - Organization name
  - User's role (owner or member)
  - Organization status as a colored chip: green for `active`, yellow for `suspended`, red for `rolled_off`
- The user can click an organization to select it and proceed to the Dashboard.
- Only `active` organizations can be selected. Attempting to select a non-active organization shows an error.

**Scenario C — No existing organizations or invitations:**
- The user is shown the Create New Organization flow (see below).

**In all scenarios, the "Create New Organization" option is always available**, allowing the user to set up a brand new organization even if they already belong to one. Clicking it launches the **Create Organization Wizard** (described in the next section).

**Header Actions:**
- **Logout button**: Signs the user out and returns to the Login page.

**Step 2 is optional during registration.** If the user does not complete this step, they simply have an account with no organization selected. The next time they visit the application, they will log in normally via the Login page. Since they have no organization selected, the system will route them to the Select Organization page where they can choose or create an organization at that point.

---

### 3. Select Organization Page (`/select-org`)

**Purpose:** Allows authenticated users to choose which organization to work with or create a new one. This page is used in two scenarios:
1. **After login** — when a user has no organization selected (either because they belong to multiple organizations, or because they registered previously without completing Step 2 of registration, or because they have no organizations at all).
2. **Switching organizations** — when a user clicks the "Switch Org" button on the Dashboard sidebar.

**Access:** Only accessible to authenticated users who have not yet selected an organization for the current session. If the user already has an organization selected, they are redirected to the Dashboard.

**Sections:**

#### Your Organizations
- Displays a list of all organizations the user is a member of.
- Each organization shows:
  - Organization name
  - User's role (owner or member)
  - Organization status as a colored chip: green for `active`, yellow for `suspended`, red for `rolled_off`
- Clicking an organization selects it and navigates to the Dashboard.
- Only `active` organizations can be selected. Attempting to select a non-active organization shows an error.

#### Create New Organization
- Clicking this launches the **Create Organization Wizard** (see next section).

**Header Actions:**
- **Logout button**: Signs the user out and returns to the Login page.

---

### 3a. Create Organization Wizard

**Purpose:** A multi-step guided setup flow for creating a new organization. This wizard is used both from the Register page (Step 2) and from the Select Organization page. It walks the user through setting up their business profile, configuring document types, and optionally inviting team members.

The wizard has **3 steps**. Only Step 1 is required — Steps 2 and 3 are optional and can be skipped.

---

#### Step 1: Organization Profile (Required)

This is where the user provides their business details. The organization is created when the user completes this step.

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Organization Name | Text | Yes | Your business or company name |
| GSTIN | Text | No | GST Identification Number (e.g., 22AAAAA0000A1Z5). Required for generating GST-compliant invoices. |
| Email | Email | No | Organization's contact email (may differ from the user's personal email) |
| Phone | Tel | No | Business phone number |
| Website | URL | No | Company website |
| Address Line 1 | Text | No | Street address |
| Address Line 2 | Text | No | Suite, building, floor, etc. |
| City | Text | No | City |
| State | Text | No | State. Also used as the default "Place of Supply" for GST purposes on invoices and purchase orders. |
| Postal Code | Text | No | PIN code |
| Country | Text | No | Country (defaults to India) |
| Logo | Image upload | No | Company logo. Displayed on invoices and purchase orders. Accepts image files (JPG, PNG, etc.). |

**Validations:**
- Organization Name is required
- All other fields are optional but recommended for complete invoice/PO generation

**Behavior:**
- **Next button**: Saves the organization, assigns the current user as owner, and advances to Step 2.
- The organization is created and persisted at this point. If the user abandons the wizard after this step, the organization still exists and can be managed later from the Organization settings page.

---

#### Step 2: Document Types (Optional)

**Introductory explanation shown to the user:**

> *"Document types control how your invoices and purchase orders are numbered. For example, you might use 'INV' for regular tax invoices and 'PI' for proforma invoices — each with its own running number sequence. This keeps your documents organized and ensures unique, sequential numbering (e.g., INV-001, INV-002, PI-001, PI-002).*
>
> *You can set this up now or configure it later from Organization settings. If you skip this step, the system will use sensible defaults."*

**Default document types (pre-populated if user doesn't customize):**
- **Invoice types**: Tax Invoice (prefix: INV), Proforma Invoice (prefix: PI), Credit Note (prefix: CN)
- **PO types**: Purchase Order (prefix: PO), Work Order (prefix: WO)

**Two sections: Invoice Types and Purchase Order Types**

Each section allows adding one or more document types. For each type:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Type Name | Text | Yes | A descriptive name, e.g., "Tax Invoice", "Export Invoice", "Purchase Order" |
| Prefix | Text | Yes | 1–3 uppercase characters used in the document number, e.g., "INV", "PO". Auto-uppercased as the user types. |
| Start Number | Number | Yes | The number from which the sequence begins. Default: 1. The first document will be numbered PREFIX-001 (or PREFIX-NNN depending on start). |

**Validations:**
- Name and Prefix are required for each type added
- Prefix cannot exceed 3 characters

**Behaviors:**
- Shows a live preview of the first document number for each type (e.g., "First document will be numbered: INV-001")
- **Add** button to add additional types within each section
- **Remove** button (trash icon) on each type to delete it
- **Next button**: Saves any configured types and advances to Step 3
- **Skip button**: Advances to Step 3 without configuring types; system defaults will be used

---

#### Step 3: Invite Team Members (Optional)

**Introductory explanation shown to the user:**

> *"Invite colleagues to collaborate on your organization's invoices and purchase orders. Team members can create and manage documents, customers, vendors, and products. You can always invite more people later from the Organization settings page."*

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Email Address | Email input | No | Email of the person to invite |

**Behaviors:**
- **Invite button**: Sends the invitation.
  - If the email belongs to an existing user in the system, they are immediately added to the organization as a `member`.
  - If the email does not match any existing user, a pending invitation is created. The person will be automatically added when they register with that email.
  - Cannot invite someone who is already a member (shows error: "This user is already a member of the organization").
- After each successful invite, the email field clears and a success message is shown. The invited email appears in a list below.
- The user can invite multiple people one at a time.
- **Invited members list**: Shows all invitations sent during this step, each displaying the email and status ("Added" for existing users, "Invitation sent — awaiting sign-up" for new users).
- **Finish button**: Completes the wizard, selects the newly created organization, and navigates to the Dashboard.
- **Skip button**: Same as Finish — goes directly to the Dashboard without inviting anyone.

---

#### Wizard Navigation
- A step indicator at the top shows progress through the 3 steps (Organization Profile → Document Types → Invite Members).
- Users can click on completed step indicators to go back and edit previous steps.
- Only Step 1 (Organization Profile) is required. Steps 2 and 3 have explicit "Skip" options.
- The Back button on Steps 2 and 3 returns to the previous step without losing entered data.

---

### 4. Dashboard Page (`/dashboard`)

**Purpose:** Main landing page showing a financial overview of the selected organization.

**Access:** Requires authentication and an active organization.

**Layout:**
- **Side menu** (collapsible) with navigation links to: Dashboard, Invoices, Purchase Orders, Customers, Vendors, Products, Organization
- **Footer of side menu**: "Switch Org" button (goes to Select Organization page) and "Logout" button
- **Header**: Shows the organization name, hamburger menu toggle, and logout button

**Quick Actions Bar:**
- **Create Invoice** button: Navigates to the Create Invoice page
- **Create Purchase Order** button: Navigates to the Create Purchase Order page

**Statistics Cards (4 cards in a grid):**

| Card | Data Shown |
|------|-----------|
| Total Invoices | Count of all invoices + total amount in INR. Clickable, navigates to Invoices page. |
| Outstanding Receivables | Total amount of unpaid invoices (excluding `paid` and `cancelled`). Shows count of unpaid invoices. |
| Total Purchase Orders | Count of all POs + total amount in INR. Clickable, navigates to Purchase Orders page. |
| Outstanding Payables | Total amount of open POs (excluding `received` and `cancelled`). Shows count of open POs. |

**Status Breakdown Section (2 cards side by side):**

| Card | Content |
|------|---------|
| Invoice Status | Shows colored badges with counts for each invoice status (Draft, Sent, Paid, Overdue, Cancelled). Links to Invoices page via "View All". |
| PO Status | Shows colored badges with counts for each PO status (Draft, Sent, Acknowledged, Partially Received, Received, Cancelled). Links to Purchase Orders page via "View All". |

**Aging Summary Section (2 cards side by side):**

| Card | Content |
|------|---------|
| Receivables Aging | Table showing unpaid invoices grouped by aging buckets: Current (Not Due), 1-30 Days Overdue, 31-60 Days Overdue, 60+ Days Overdue. Each bucket shows count and total amount. Based on invoice due date (or invoice date if no due date). |
| Payables Aging | Table showing open POs grouped by aging buckets (same buckets). Based on expected delivery date (or PO date if no delivery date). |

**Recent Activity Section:**
- Shows the 5 most recent documents (invoices and POs combined), sorted by creation date descending.
- Columns: Type (INV/PO badge), Document Number, Party (Customer/Vendor name), Status (colored badge), Amount.

---

### 5. Customers Page (`/customers`)

**Purpose:** Manage the organization's customer list.

**Header Actions:**
- **Back button**: Returns to Dashboard
- **Add (+) button**: Opens the inline create customer form
- **Upload button**: Opens file picker for Excel upload
- **Search bar**: Filters customers by name, account number, email, or city

**Create Customer Form (inline, expandable):**

| Field | Type | Required |
|-------|------|----------|
| Name | Text | Yes |
| Account Number | Text | Yes |
| Email | Email | No |
| Phone | Tel | No |
| GSTIN | Text | No |
| Contact Person | Text | No |
| City | Text | No |
| State | Text | No |

**Validations:**
- Name and Account Number are required for saving

**Excel Upload:**
- Accepts `.xlsx` and `.xls` files
- **Warning: Uploading replaces ALL existing customers** (destructive operation)
- Parses the first sheet of the Excel file
- Maps columns by header name (supports multiple naming conventions, e.g., "Name", "name", "Customer Name")
- Expected columns: Name, Account Number, Address Line 1, Address Line 2, City, State, Postal Code, Country, Email, Phone, Contact Person, Notes
- Validates that each row has a name and account number (warns if missing)
- Processes in batches of 500
- Shows success message with count of imported records and any warnings

**Customer List:**
- Shows total count in a badge
- Each customer displays: Name, Account Number, Email (if present), City/State (if present)
- **Invoice statistics**: For each customer, shows the count of invoices and total revenue (if any invoices exist for that customer)
- **View Invoices button**: Navigates to the Invoices page

**Other Features:**
- Pull-to-refresh support

---

### 6. Vendors Page (`/vendors`)

**Purpose:** Manage the organization's vendor list.

**Header Actions:**
- **Back button**: Returns to Dashboard
- **Add (+) button**: Opens the inline create vendor form
- **Upload button**: Opens file picker for Excel upload
- **Search bar**: Filters vendors by name, account number, email, or city

**Create Vendor Form (inline, expandable):**

| Field | Type | Required |
|-------|------|----------|
| Name | Text | Yes |
| Account Number | Text | No |
| Email | Email | No |
| Phone | Tel | No |
| Contact Person | Text | No |
| Payment Terms | Text | No |
| City | Text | No |
| State | Text | No |

**Validations:**
- Name is required for saving

**Excel Upload:**
- Same behavior as Customer upload: accepts `.xlsx`/`.xls`, **replaces all existing vendors**
- Expected columns: Name, Account Number, Address Line 1, Address Line 2, City, State, Postal Code, Country, Email, Phone, Contact Person, Payment Terms, Tax ID, Bank Name, Bank Account, Bank Routing, Notes
- Validates that each row has a name (warns if missing)

**Vendor List:**
- Shows total count in a badge
- Each vendor displays: Name, Account Number (if present), Email (if present), Payment Terms (if present), City/State (if present)
- **PO statistics**: For each vendor, shows the count of purchase orders and total amount (if any POs exist for that vendor)
- **View POs button**: Navigates to the Purchase Orders page

**Other Features:**
- Pull-to-refresh support

---

### 7. Products & Services Page (`/products`)

**Purpose:** Manage the organization's catalog of sellable products and services. These are the items your business sells to customers. Items in this catalog appear in the product dropdown when creating invoices.

**Note:** This page is only for **sellable** items (what you put on invoices). Purchased items on purchase orders are entered as free text and are not part of this catalog — see the Create Purchase Order page for details.

**Header:**
- **Back button**: Returns to Dashboard
- **Search bar**: Filters products by name, HSN/SAC code, or classification
- **Create Product button**: Opens the add/edit form

**Add/Edit Product Form:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | Text | Yes | Product or service name |
| Classification | Dropdown | Yes | Options: Product, Service |
| HSN/SAC Code | Text | No | HSN code for goods, SAC code for services |
| Unit | Dropdown | Yes | Grouped options: **Pieces** (pcs, nos, set, pair), **Weight** (g, kg, quintal, ton), **Volume** (ml, ltr, m3), **Length** (cm, m, ft), **Area** (sqft, sqm), **Time** (min, hrs, days). Default: pcs |
| Default Rate | Number | No | Default selling price per unit |
| GST Rate (%) | Number | No | Default: 18 |
| Description | Textarea | No | Optional description |

**Validations:**
- Name is required

**Product List:**
- Shows total count in a badge
- Each product displays:
  - Icon (cube for products, wrench for services)
  - Name
  - Classification badge (color-coded: Primary for Product, Secondary for Service)
  - HSN/SAC code (if present)
  - Default rate in INR (if present)
  - GST rate (if present)
  - Unit (if present)
  - Usage count (how many times this product appears in invoices)
- **Edit button**: Opens the form pre-filled with the product's data
- **Delete button**: Deletes the product (no confirmation dialog)

---

### 8. Invoices Page (`/invoices`)

**Purpose:** View, filter, and manage all invoices for the organization.

**Header:**
- **Back button**: Returns to Dashboard
- **Total count badge**: Shows the number of invoices
- **Search bar**: Searches by invoice number or customer name
- **Status filter dropdown**: Filters by status (All Statuses, Draft, Sent, Paid, Overdue, Cancelled)
- **Create Invoice button**: Navigates to Create Invoice page

**Invoice List (table layout):**

| Column | Description |
|--------|-------------|
| Invoice # | The auto-generated invoice number |
| Date | Invoice date |
| Customer | Customer name |
| Amount | Total amount in INR |
| Status | Clickable colored badge showing current status |
| Actions | Edit button (only for `draft` invoices), Delete button |

**Status Colors:**
- Draft: Grey
- Sent: Blue
- Paid: Green
- Overdue: Red
- Cancelled: Dark

**Status Update Popup:**
- Clicking a status badge opens a small popup positioned near the badge
- Fields: Status dropdown (all 5 statuses), Date (optional, defaults to today)
- Saves the new status and update date

**Delete Confirmation:**
- Clicking delete shows a centered confirmation dialog with a warning icon
- Displays: "Delete Invoice? Are you sure you want to delete invoice [number] for [customer]? This action cannot be undone."
- Cancel and Delete buttons

**Responsive behavior:**
- On mobile (< 768px), the table header is hidden and rows reflow to a stacked card-like layout

---

### 9. Purchase Orders Page (`/purchase-orders`)

**Purpose:** View, filter, and manage all purchase orders for the organization.

**Header:**
- **Back button**: Returns to Dashboard
- **Total count badge**: Shows the number of purchase orders
- **Search bar**: Searches by PO number or vendor name
- **Status filter dropdown**: Filters by status (All Statuses, Draft, Sent, Acknowledged, Partially Received, Received, Cancelled)
- **Create Purchase Order button**: Navigates to Create PO page

**PO List (table layout):**

| Column | Description |
|--------|-------------|
| PO # | The auto-generated PO number |
| Date | PO date |
| Vendor | Vendor name |
| Amount | Total amount in INR |
| Status | Clickable colored badge showing current status |
| Actions | Edit button (only for `draft` POs), Delete button |

**Status Colors:**
- Draft: Grey
- Sent: Blue
- Acknowledged: Tertiary/Purple
- Partially Received: Yellow/Warning
- Received: Green
- Cancelled: Dark

**Status Update Popup:**
- Same behavior as invoices: click status badge to open popup with status dropdown and optional date field

**Delete Confirmation:**
- Same pattern as invoices with a centered confirmation dialog

**Responsive behavior:**
- Same mobile-responsive stacked layout as invoices

---

### 10. Create Invoice Page (`/create-invoice` and `/create-invoice/:id`)

**Purpose:** Create a new invoice or edit an existing draft invoice. Uses a 2-step wizard flow.

**Access:** When accessed with an `:id` parameter, loads the existing invoice for editing (only if status is `draft`).

#### Step 1: Details & Items

**Invoice Details Section:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Invoice Type | Dropdown | Yes | Default options: Tax Invoice, Proforma Invoice, Credit Note. If custom document types are configured in Organization settings, those are used instead. |
| Invoice Date | Date picker | Yes | Defaults to today |
| Due Date | Date picker | No | |
| Customer | Dropdown | Yes | Lists all customers. Validation error highlighted if missing. |
| Customer GSTIN | Text | No | Auto-filled when customer is selected (from customer record) |
| Place of Supply | Text | No | Auto-filled with customer's state |
| Billing Address | Textarea | No | Auto-filled from customer's address |
| Shipping Address | Textarea | No | Auto-filled from customer's address (same as billing) |

**Auto-fill behavior when customer is selected:**
- Customer name, GSTIN, billing address, shipping address, and place of supply are all auto-populated from the customer record.

**Line Items Section:**
- **Add Item button**: Adds a new empty line item card
- Each line item card contains:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Product / Service | Dropdown | Yes | Shows all items from the Products & Services catalog. These are the organization's sellable products and services. |
| HSN/SAC | Read-only | - | Auto-filled from selected product |
| Unit | Read-only | - | Auto-filled from selected product |
| Quantity | Number | Yes | Default: 1 |
| Rate | Read-only | - | Auto-filled from product's default rate |
| GST | Read-only | - | Auto-filled from product's GST rate |
| Discount | Number | No | Discount amount |
| Discount Type | Dropdown | No | "Fixed" or "%" (percentage) |
| Amount | Read-only | - | Computed: (qty x rate) - discount |

- **Remove button** on each item card (trash icon)
- **Running subtotal** displayed below all items

**Auto-fill behavior when product is selected:**
- Product name, HSN/SAC code, unit, rate, and GST rate are all populated from the catalog record.

**Calculation logic:**
- Line item amount = (quantity x rate) - discount
  - If discount type is "percentage": discount = line total x (discount_value / 100)
  - If discount type is "fixed": discount = discount_value
  - Amount cannot go below 0
- Subtotal = sum of all line item amounts

#### Step 2: Review

**Review Section:**
- Invoice Info: Type, Date, Due Date, Customer, GSTIN, Place of Supply
- Items: Each item with quantity x rate = amount

**Totals Section:**
- Subtotal
- Overall Discount (with type selector: Fixed or %, and input field)
- CGST (half of total GST)
- SGST (half of total GST)
- IGST (always 0 in current implementation)
- **Grand Total** = discounted subtotal + total tax

**GST Calculation:**
- After applying overall discount, GST is calculated proportionally per line item based on each item's GST rate
- Total GST is split equally between CGST and SGST

**Notes field:** Free-text textarea

**Email Invoice button:** Stub/placeholder - displays "Email functionality coming soon"

**Validations (at save time):**
- Customer must be selected
- At least one line item must exist
- All line items must have a product selected from the catalog
- If validation fails, user is returned to Step 1 with errors highlighted

**Save behavior:**
- For new invoices: auto-generates the invoice number using the selected type's prefix and a sequential counter (e.g., "INV-001"), then creates the invoice with status `draft`
- For editing: updates the existing invoice, sets `updated_at` timestamp
- After save, navigates to the Invoices list

**Step navigation:** Users can freely navigate between steps by clicking the step indicators or using the Back/Review buttons.

---

### 11. Create Purchase Order Page (`/create-po` and `/create-po/:id`)

**Purpose:** Create a new purchase order or edit an existing draft PO. Uses a 2-step wizard flow (same structure as Create Invoice).

**Access:** When accessed with an `:id` parameter, loads the existing PO for editing (only if status is `draft`).

#### Step 1: Details & Items

**PO Details Section:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| PO Type | Dropdown | Yes | Default options: Purchase Order, Work Order. If custom document types are configured, those are used instead. |
| PO Date | Date picker | Yes | Defaults to today |
| Expected Delivery Date | Date picker | No | |
| Vendor | Dropdown | Yes | Lists all vendors. Validation error highlighted if missing. |
| Vendor GSTIN | Text | No | Auto-filled from vendor's tax_id when vendor is selected |
| Place of Supply | Text | No | Auto-filled with vendor's state |
| Billing Address | Textarea | No | Auto-filled from vendor's address |
| Shipping Address | Textarea | No | Auto-filled from vendor's address |
| Payment Terms | Text | No | Auto-filled from vendor's payment terms |

**Auto-fill behavior when vendor is selected:**
- Vendor name, GSTIN (from tax_id), billing address, shipping address, place of supply, and payment terms are all auto-populated from the vendor record.

**Line Items Section:**

Unlike invoices (which select from a pre-configured catalog), purchase order line items are **free-text entry**. You can purchase anything — raw materials, office supplies, one-off services, assets — so there is no fixed catalog to pick from. Instead, the system helps by suggesting items from the organization's past purchase orders as the user types.

- **Add Item button**: Adds a new empty line item card
- Each line item card contains:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Item Name | Text with autocomplete | Yes | Free-text input. As the user types, the system searches across all line items from previous purchase orders and shows matching suggestions in a dropdown. Matching is currently based on text (name contains the typed text). **Future enhancement:** cosine similarity matching for smarter suggestions. |
| HSN/SAC | Text | No | Editable. Auto-filled if a suggestion is selected. |
| Unit | Text or Dropdown | No | Editable. Auto-filled if a suggestion is selected. |
| Quantity | Number | Yes | Default: 1 |
| Rate | Number | Yes | Editable. Auto-filled if a suggestion is selected (uses the rate from the most recent PO containing that item). |
| GST (%) | Number | No | Editable. Auto-filled if a suggestion is selected. |
| Amount | Read-only | - | Computed: quantity x rate |

- **Remove button** on each item card (trash icon)
- **Running subtotal** displayed below all items
- No discount fields on PO line items (unlike invoices)

**Autocomplete / suggestion behavior:**
1. As the user types in the Item Name field, the system searches line items across all of the organization's past purchase orders for names that contain the typed text.
2. Matching items are shown in a dropdown list below the field. Each suggestion shows the item name and the most recent rate used.
3. When the user selects a suggestion, the remaining fields (HSN/SAC, Unit, Rate, GST) are auto-filled using the data from the **most recent** purchase order that contained that item.
4. **All auto-filled fields are fully editable.** The user can override any value — for example, if the price has changed since the last order.
5. If the user does not select a suggestion and types a completely new item name, they simply fill in all the fields manually. The item will then become available as a suggestion for future purchase orders.

**Calculation logic:**
- Line item amount = quantity x rate (no discount on PO items)
- Subtotal = sum of all line item amounts

#### Step 2: Review

**Review Section:**
- PO Info: Type, Date, Expected Delivery, Vendor, GSTIN, Place of Supply, Payment Terms
- Items: Each item with quantity x rate = amount

**Totals Section:**
- Subtotal
- CGST (half of total GST)
- SGST (half of total GST)
- **Grand Total** = subtotal + total tax
- Note: No overall discount feature on purchase orders (unlike invoices)

**Notes field:** Free-text textarea

**Email PO button:** Stub/placeholder - displays "Email functionality coming soon"

**Validations (at save time):**
- Vendor must be selected
- At least one line item must exist
- Each line item must have an Item Name filled in

**Save behavior:**
- For new POs: auto-generates the PO number using the selected type's prefix and a sequential counter (e.g., "PO-001"), then creates the PO with status `draft`
- For editing: updates the existing PO, sets `updated_at` timestamp
- After save, navigates to the Purchase Orders list

---

### 12. Organization Page (`/organization`)

**Purpose:** Manage organization settings, document types, and team members. Organized into 3 tabs.

**Header:**
- **Back button**: Returns to Dashboard
- **Segment/Tab bar**: Organization | Documents | Users

---

#### Tab 1: Organization

**Organization Profile Form:**

| Field | Type | Required | Editable By | Notes |
|-------|------|----------|-------------|-------|
| Logo | Image upload | No | Owner only | Upload, change, or remove logo. Accepts image files. Stored in Firebase Storage. |
| Organization Name | Text | Yes | Owner only | |
| GSTIN | Text | No | Owner only | GST Identification Number, placeholder: "22AAAAA0000A1Z5" |
| Email | Email | No | Owner only | Contact email |
| Phone | Tel | No | Owner only | Contact phone |
| Website | URL | No | Owner only | Company website |
| Address Line 1 | Text | No | Owner only | |
| Address Line 2 | Text | No | Owner only | |
| City | Text | No | Owner only | |
| State | Text | No | Owner only | |
| Postal Code | Text | No | Owner only | |
| Country | Text | No | Owner only | |

- **Save Changes button** (owner only): Saves all profile changes
- Shows success/error messages after save
- All fields are **read-only for non-owner members**

**Danger Zone (owner only):**
- **Delete Organization** button
- When clicked, shows a confirmation box requiring the user to type the exact organization name
- Delete button is only enabled when the typed name matches exactly
- Deleting an organization removes all memberships and the organization document
- After deletion, the user is redirected to the Select Organization page

---

#### Tab 2: Documents

**Purpose:** Configure document types (invoice types and PO types) that control the naming/numbering of invoices and purchase orders.

**Invoice Types Section:**
- Shows a list of configured invoice types with a count badge
- Each type shows: Name, Prefix, Starting number (e.g., "Tax Invoice - Prefix: INV - Starts at: INV-001")
- **Add button** (owner only): Opens inline form
- **Edit button** (owner only): Opens inline form pre-filled with existing values
- **Delete button** (owner only): Confirms deletion with a browser dialog

**Purchase Order Types Section:**
- Same layout as Invoice Types
- Shows a list of configured PO types

**Add/Edit Document Type Form:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Type Name | Text | Yes | e.g., "Tax Invoice" |
| Prefix | Text | Yes | Maximum 3 characters, auto-uppercased. e.g., "INV" |
| Start Number | Number | Yes | Default: 1. Disabled when editing (cannot change start number after creation). |

**Validations:**
- Name and Prefix are required
- Prefix cannot exceed 3 characters
- Shows a preview of the first document number: e.g., "First document will be numbered: INV-001"

**Default behavior when no types are configured:**
- Invoices default to: Tax Invoice (INV), Proforma Invoice (PI), Credit Note (CN)
- POs default to: Purchase Order (PO), Work Order (WO)

**Auto-numbering system:**
- When a document type is created, a counter is initialized at (start_number - 1)
- Each time a document is saved, the counter is incremented atomically (using Firestore transactions) and the number is formatted as `PREFIX-NNN` (zero-padded to 3 digits)

---

#### Tab 3: Users

**Invite Team Member (owner only):**
- **Email Address** field (email input, required)
- **Invite button**: Sends an invitation

**Invitation behavior:**
- If the email belongs to an existing user in the system, they are immediately added to the organization as a `member`
- If the email does not match any existing user, a pending invitation is created. The user will be automatically added to the organization when they register with that email.
- Cannot invite someone who is already a member (shows error)

**Pending Invitations (owner only):**
- Shows list of pending invitations with email, invited role, and "Awaiting sign-up" status
- **Cancel button**: Removes the invitation (with confirmation)

**Team Members:**
- Shows all current members with:
  - Name
  - Email
  - Role badge (colored: Primary for owner, Medium/grey for member)
- **Remove button** (owner only, not shown for owners): Removes the member from the organization with a confirmation dialog

---

## Authentication & Authorization

### Authentication Methods
1. **Email/Password**: Standard registration and login with email and password
2. **Google OAuth**: Sign in with Google popup flow

### Route Guards
- **authGuard**: Requires authentication AND an active organization. Redirects to `/login` if not authenticated, or to `/select-org` if no organization is selected.
- **noAuthGuard**: Prevents authenticated users from accessing login/register pages. Redirects to `/dashboard` or `/select-org`.
- **orgSelectionGuard**: Requires authentication but NO organization selected. Redirects to `/login` if not authenticated, or to `/dashboard` if an organization is already selected.

### Organization Persistence
- The selected organization is stored in `localStorage` under the key `current_org`
- On app reload, the stored organization is verified (checks that the user still has a valid membership)
- Logging out clears all stored data

### Permissions
- **Owners** can: edit organization profile, manage document types, invite/remove members, delete the organization, upload logo
- **Members** can: view organization profile (read-only), view members, and perform all other operations (create/edit invoices, POs, customers, vendors, products)

---

## Currency & Formatting

- All monetary values are displayed in Indian Rupees (INR)
- The custom `InrPipe` formats numbers using the Indian numbering system:
  - Last 3 digits grouped normally, then groups of 2
  - Example: 1,23,45,678.00
- The Rupee symbol (₹) is displayed alongside amounts
