import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  add, addCircleOutline, arrowBack, arrowForward, businessOutline,
  cartOutline, checkmark, checkmarkCircle, chevronForwardOutline,
  clipboardOutline, closeOutline, createOutline, documentOutline,
  documentTextOutline, logInOutline, logOutOutline, logoGoogle,
  peopleOutline, personAddOutline, personOutline, pricetagOutline,
  swapHorizontalOutline, trashOutline, trendingUpOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor() {
    addIcons({
      add, addCircleOutline, arrowBack, arrowForward, businessOutline,
      cartOutline, checkmark, checkmarkCircle, chevronForwardOutline,
      clipboardOutline, closeOutline, createOutline, documentOutline,
      documentTextOutline, logInOutline, logOutOutline, logoGoogle,
      peopleOutline, personAddOutline, personOutline, pricetagOutline,
      swapHorizontalOutline, trashOutline, trendingUpOutline
    });
  }
}
