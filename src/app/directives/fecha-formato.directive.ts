import { Directive, ElementRef, Input, OnChanges } from '@angular/core';

@Directive({
  selector: '[appFechaFormato]',
  standalone: true,
})
export class FechaFormatoDirective implements OnChanges {
  @Input('appFechaFormato') fecha: string | null | undefined;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnChanges(): void {
    this.el.nativeElement.textContent = this.formatear(this.fecha);
  }

  private formatear(valor: string | null | undefined): string {
    if (!valor) return '-';
    const d = new Date(valor);
    if (isNaN(d.getTime())) return '-';
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
}
