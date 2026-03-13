import { NgModule } from '@angular/core';
import { PlacesAutocompleteDirective } from './directives/places-autocomplete.directive';

@NgModule({
  imports: [PlacesAutocompleteDirective],
  exports: [PlacesAutocompleteDirective]
})
export class SharedModule {}
