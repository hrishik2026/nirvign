import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'inr',
  standalone: false
})
export class InrPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value === null || value === undefined) return '₹0';
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const parts = absValue.toFixed(2).split('.');
    let intPart = parts[0];
    const decPart = parts[1];

    // Indian numbering: last 3 digits, then groups of 2
    let result = '';
    if (intPart.length > 3) {
      result = ',' + intPart.slice(-3);
      intPart = intPart.slice(0, -3);
      while (intPart.length > 2) {
        result = ',' + intPart.slice(-2) + result;
        intPart = intPart.slice(0, -2);
      }
      result = intPart + result;
    } else {
      result = intPart;
    }

    return (isNegative ? '-' : '') + '₹' + result + '.' + decPart;
  }
}
