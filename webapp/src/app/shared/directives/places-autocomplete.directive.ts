import { Directive, ElementRef, EventEmitter, Output, AfterViewInit, OnDestroy, NgZone } from '@angular/core';

declare var google: any;

export interface ParsedAddress {
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

@Directive({
  selector: '[appPlacesAutocomplete]',
  standalone: true
})
export class PlacesAutocompleteDirective implements AfterViewInit, OnDestroy {
  @Output() placeChanged = new EventEmitter<ParsedAddress>();

  private autocomplete: any = null;

  constructor(
    private el: ElementRef,
    private ngZone: NgZone
  ) {}

  async ngAfterViewInit() {
    if (typeof google === 'undefined' || !google.maps?.places) {
      console.warn('Google Maps Places API not loaded — autocomplete disabled');
      return;
    }

    const ionInput = this.el.nativeElement;
    const nativeInput = await ionInput.getInputElement();

    this.autocomplete = new google.maps.places.Autocomplete(nativeInput, {
      types: ['geocode'],
      fields: ['address_components', 'formatted_address']
    });

    this.autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = this.autocomplete.getPlace();
        if (!place?.address_components) return;

        const parsed: ParsedAddress = {};
        let streetNumber = '';
        let route = '';
        let sublocality = '';

        for (const c of place.address_components) {
          const t = c.types;
          if (t.includes('street_number')) streetNumber = c.long_name;
          else if (t.includes('route')) route = c.long_name;
          else if (t.includes('sublocality_level_1') || t.includes('sublocality')) sublocality = c.long_name;
          else if (t.includes('locality')) parsed.city = c.long_name;
          else if (t.includes('administrative_area_level_1')) parsed.state = c.long_name;
          else if (t.includes('postal_code')) parsed.postal_code = c.long_name;
          else if (t.includes('country')) parsed.country = c.long_name;
        }

        parsed.address_line1 = [streetNumber, route].filter(Boolean).join(' ') || place.formatted_address?.split(',')[0] || '';
        if (sublocality) parsed.address_line2 = sublocality;

        this.placeChanged.emit(parsed);
      });
    });
  }

  ngOnDestroy() {
    if (this.autocomplete && typeof google !== 'undefined') {
      google.maps.event.clearInstanceListeners(this.autocomplete);
    }
  }
}
