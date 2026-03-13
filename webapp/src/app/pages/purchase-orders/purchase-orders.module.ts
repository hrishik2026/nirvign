import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { PurchaseOrdersPage } from './purchase-orders.page';
import { PipesModule } from '../../pipes/pipes.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, PipesModule, RouterModule.forChild([{ path: '', component: PurchaseOrdersPage }])],
  declarations: [PurchaseOrdersPage]
})
export class PurchaseOrdersPageModule {}
