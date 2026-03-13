import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { InvoicesPage } from './invoices.page';
import { PipesModule } from '../../pipes/pipes.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, PipesModule, RouterModule.forChild([{ path: '', component: InvoicesPage }])],
  declarations: [InvoicesPage]
})
export class InvoicesPageModule {}
