# Nirvign - Invoice Pay

Angular 20 / Ionic 8 webapp with Firebase backend (project: `visma-77e9d`).

## Structure
- `webapp/` - Angular app (build output: `www/`)
- `documents/` - Specs, screenshots, artifacts
- `webapp/src/app/shared/` - Shared module, directives, validators

## Commands (run from `webapp/`)
- `npm start` - serve locally (port 4200)
- `npm run build` - production build
- `npm run lint` - lint check
- `firebase deploy --only hosting --project visma-77e9d` - deploy to Firebase Hosting (run from `webapp/`)
- `firebase deploy --only firestore:rules --project visma-77e9d` - deploy Firestore rules (run from `webapp/`)
- `firebase firestore:delete --all-collections --project visma-77e9d --force` - wipe all Firestore data

## Architecture
- NgModule-based with lazy-loaded feature modules (each page has its own `.module.ts`)
- Services use `inject()` pattern, not constructor injection
- State management via RxJS BehaviorSubjects
- Firebase services: Auth, Firestore, Storage (via @angular/fire)
- Route guards: `authGuard`, `noAuthGuard`, `orgSelectionGuard`
- Strict TypeScript enabled

### Real-time data (CRITICAL)
ALL Firestore data MUST be consumed as real-time Observables using `collectionData`/`docData` from @angular/fire. This is a core architectural requirement — Firestore supports real-time push via WebSockets, and we rely on it for instant cross-client updates (e.g., removing a member kicks them out immediately on their browser).

- **Never use `firstValueFrom` for data that should stay live on screen.** Only use it for one-shot decisions (e.g., login redirect, pre-navigation membership check).
- Pages should use `switchMap` + `combineLatest` to compose reactive pipelines from service Observables.
- The `OrgService.orgReady$` Observable is the standard entry point for org-scoped data — pipe off it with `switchMap`.
- `OrgService` has a membership watcher that monitors the current user's membership in real-time and redirects them to `/select-org` if their membership is removed.

### Unsaved Changes Guard
Any page with editable form data MUST implement a dirty check before navigation (back button, tab switch, route change). When the user has unsaved changes, show an alert with three options:
- **"Yes, Save"** (primary, rightmost) — save the data, then proceed with the navigation
- **"Don't Save"** (middle) — discard changes and proceed
- **"Cancel"** (leftmost) — stay on the current page

Alert message: `"You have unsaved changes. Do you want me to save changes before moving on?"`

Implementation pattern and edge cases:
1. **Snapshot**: `JSON.stringify` key form fields on load into `savedSnapshot`. Compare via a getter (e.g. `get isOrgDirty`).
2. **"Don't Save" must reset dirty state**: Call the load method (e.g. `loadOrgData()`) to reload from the source data and reset the snapshot. Otherwise the dirty flag persists and the dialog re-triggers on the next navigation.
3. **"Cancel" must revert segment/tab UI**: Ionic `ion-segment` updates visually on click before the async handler resolves. On cancel, force the segment back by briefly setting `activeTab = ''` then restoring via `setTimeout(() => activeTab = prevTab)`.
4. **"Yes, Save" must update snapshot**: After a successful save, update `savedSnapshot` to the current state so the form is no longer dirty.
5. **Alert styling**: Use `cssClass: 'unsaved-changes-alert'` on the alert + `cssClass: 'alert-button-primary'` on "Yes, Save". Global styles in `global.scss` ensure inline row layout and bold primary button.

See `OrganizationPage` for the full reference implementation.

### Validation
- Email: standard format validation via `isValidEmail()` in `shared/validators.ts`
- Phone: Indian format with +91 default, auto-formatting to `+91 XXXXX XXXXX`, validated via `isValidIndianPhone()`
- GSTIN: auto-uppercase on input
- Required fields for org: name, email, phone, address line 1

### Google Places Autocomplete
- `PlacesAutocompleteDirective` (standalone) in `shared/directives/` — attach to `ion-input` with `appPlacesAutocomplete`
- Emits `ParsedAddress` on `(placeChanged)` — auto-fills address, city, state, postal code, country
- Requires Maps JavaScript API + Places API enabled on GCP project
- API loaded via script tag in `index.html`

## Conventions
- Pages live in `webapp/src/app/pages/<name>/`
- Services in `webapp/src/app/services/` (providedIn: 'root')
- Interfaces in `webapp/src/app/models/interfaces.ts`
- Shared module in `webapp/src/app/shared/shared.module.ts` — import into page modules that need directives
- SCSS for styles; global theme in `src/theme/variables.scss`
- Firestore collections keyed by auth UID (e.g., `users/{uid}`)
- Org context stored in localStorage as `current_org`
- Firestore rules in `webapp/firestore.rules` — deploy after changes
- Firebase hosting config in `webapp/firebase.json`, project config in `webapp/.firebaserc`

## Firestore Collections
- `users/{uid}` — user profile (name, email, auth_provider)
- `organizations/{orgId}` — org profile, status, address, GSTIN
- `organizations/{orgId}/document_types/{typeId}` — invoice/PO type configs (subcollection)
- `organizations/{orgId}/counters/{typeId}` — auto-increment counters (subcollection)
- `memberships/{id}` — user↔org mappings (user_id, organization_id, role)
- `invitations/{id}` — pending email invitations (auto-accepted on login/register)
