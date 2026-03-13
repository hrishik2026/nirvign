import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard, noAuthGuard, orgSelectionGuard, appAdminGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule),
    canActivate: [noAuthGuard]
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterPageModule),
    canActivate: [noAuthGuard]
  },
  {
    path: 'select-org',
    loadChildren: () => import('./pages/select-org/select-org.module').then(m => m.SelectOrgPageModule),
    canActivate: [orgSelectionGuard]
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'customers',
    loadChildren: () => import('./pages/customers/customers.module').then(m => m.CustomersPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'vendors',
    loadChildren: () => import('./pages/vendors/vendors.module').then(m => m.VendorsPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'products',
    loadChildren: () => import('./pages/products/products.module').then(m => m.ProductsPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'invoices',
    loadChildren: () => import('./pages/invoices/invoices.module').then(m => m.InvoicesPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'create-invoice',
    loadChildren: () => import('./pages/create-invoice/create-invoice.module').then(m => m.CreateInvoicePageModule),
    canActivate: [authGuard]
  },
  {
    path: 'create-invoice/:id',
    loadChildren: () => import('./pages/create-invoice/create-invoice.module').then(m => m.CreateInvoicePageModule),
    canActivate: [authGuard]
  },
  {
    path: 'purchase-orders',
    loadChildren: () => import('./pages/purchase-orders/purchase-orders.module').then(m => m.PurchaseOrdersPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'create-po',
    loadChildren: () => import('./pages/create-po/create-po.module').then(m => m.CreatePoPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'create-po/:id',
    loadChildren: () => import('./pages/create-po/create-po.module').then(m => m.CreatePoPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'organization',
    loadChildren: () => import('./pages/organization/organization.module').then(m => m.OrganizationPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'help',
    loadChildren: () => import('./pages/help/help.module').then(m => m.HelpPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'app-admin',
    loadChildren: () => import('./pages/app-admin/app-admin.module').then(m => m.AppAdminPageModule),
    canActivate: [appAdminGuard]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
