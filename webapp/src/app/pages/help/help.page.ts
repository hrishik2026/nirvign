import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GuidedFlowService } from '../../services/guided-flow.service';

@Component({
  selector: 'app-help',
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
  standalone: false
})
export class HelpPage {
  private guidedFlowService = inject(GuidedFlowService);

  constructor(private router: Router) {}

  goBack() { this.router.navigate(['/dashboard']); }

  navigate(url: string) { this.router.navigate([url]); }

  navigateWithFlow(url: string, flow: 'selling' | 'purchasing') {
    this.guidedFlowService.startFlow(flow, url);
    this.router.navigate([url]);
  }
}
