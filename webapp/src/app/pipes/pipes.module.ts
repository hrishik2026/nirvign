import { NgModule } from '@angular/core';
import { InrPipe } from './inr.pipe';

@NgModule({
  declarations: [InrPipe],
  exports: [InrPipe]
})
export class PipesModule {}
