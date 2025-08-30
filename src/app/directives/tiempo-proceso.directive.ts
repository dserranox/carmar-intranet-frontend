import { Directive, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';

type DateInput = string | number | Date | null | undefined;
type RangeInput = { start?: DateInput; end?: DateInput };

@Directive({
  selector: '[appTiempoProceso]',
  standalone: true,
})
export class TiempoProcesoDirective implements OnChanges {
  @Input() start?: DateInput;
  @Input() end?: DateInput;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnChanges(_: SimpleChanges): void {
    const start = this.pickDate(this.start);
    const end   = this.pickDate(this.end);

    const text = (start && end) ? this.formatDiff(end.getTime() - start.getTime()) : '—';
    this.el.nativeElement.textContent = text;
  }

  private pickDate(v?: DateInput): Date | null {
    if (v == null) return null;
    const d = (v instanceof Date) ? v : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  private formatDiff(ms: number): string {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    // const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
  }
}
