# Nirvign - Invoice Pay

Angular 20 / Ionic 8 webapp with Firebase backend (project: `visma-77e9d`).

## Structure
- `webapp/` - Angular app (build output: `www/`)
- `documents/` - Specs, screenshots, artifacts

## Commands (run from `webapp/`)
- `npm start` - serve locally (port 4200)
- `npm run build` - production build
- `npm run lint` - lint check

## Architecture
- NgModule-based with lazy-loaded feature modules (each page has its own `.module.ts`)
- Services use `inject()` pattern, not constructor injection
- State management via RxJS BehaviorSubjects
- Firebase services: Auth, Firestore, Storage (via @angular/fire)
- Route guards: `authGuard`, `noAuthGuard`, `orgSelectionGuard`
- Strict TypeScript enabled

## Conventions
- Pages live in `webapp/src/app/pages/<name>/`
- Services in `webapp/src/app/services/` (providedIn: 'root')
- Interfaces in `webapp/src/app/models/interfaces.ts`
- SCSS for styles; global theme in `src/theme/variables.scss`
- Firestore collections keyed by auth UID (e.g., `users/{uid}`)
- Org context stored in localStorage as `current_org`
