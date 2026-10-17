import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';

import { PickingService } from '../../services/picking.service';
import { PendienteCompra } from '../../models/picking';

/**
 * Lo que falta comprar: todas las líneas faltantes o parciales de los pickings
 * abiertos, juntadas por código de pieza. Lo más viejo va primero.
 */
@Component({
  selector: 'app-pendientes-compra',
  standalone: true,
  imports: [
    CommonModule, DatePipe, MatIconModule, MatButtonModule,
    MatTooltipModule, MatSnackBarModule
  ],
  templateUrl: './pendientes-compra.component.html',
  styleUrls: ['./pendientes-compra.component.css']
})
export class PendientesCompraComponent implements OnInit {
  private pickingService = inject(PickingService);
  private snack = inject(MatSnackBar);

  pendientes = signal<PendienteCompra[]>([]);
  cargando = signal(true);
  /** Oculta lo que compras ya pidió. */
  soloSinPedir = signal(false);

  readonly visibles = computed(() =>
    this.soloSinPedir() ? this.pendientes().filter(p => !p.pedido) : this.pendientes());

  readonly sinPedir = computed(() => this.pendientes().filter(p => !p.pedido).length);

  ngOnInit(): void {
    this.cargar();
  }

  get puedeMarcar(): boolean {
    try {
      const data = localStorage.getItem('user');
      if (!data) return false;
      const u = JSON.parse(data);
      return (u?.permissions ?? []).includes('PICKING:ADMIN');
    } catch { return false; }
  }

  cargar(): void {
    this.cargando.set(true);
    this.pickingService.pendientesDeCompra().subscribe({
      next: p => { this.pendientes.set(p || []); this.cargando.set(false); },
      error: () => {
        this.pendientes.set([]);
        this.cargando.set(false);
        this.snack.open('No se pudieron cargar los pendientes', 'OK', { duration: 4000 });
      }
    });
  }

  alternarPedido(p: PendienteCompra): void {
    this.pickingService.marcarPedido(p.codigoPieza, !p.pedido).subscribe({
      next: () => {
        this.snack.open(
          !p.pedido
            ? `${p.codigoPieza} marcado como pedido`
            : `${p.codigoPieza} vuelve a quedar sin pedir`,
          'OK', { duration: 3000 });
        this.cargar();
      },
      error: err => this.snack.open(
        err?.error?.message || 'No se pudo marcar', 'OK', { duration: 5000 })
    });
  }

  /** Cuánto hace que se está esperando: es lo que define la urgencia. */
  urgencia(p: PendienteCompra): 'alta' | 'media' | 'baja' {
    if (p.diasEsperando >= 7) return 'alta';
    if (p.diasEsperando >= 3) return 'media';
    return 'baja';
  }

  textoAntiguedad(p: PendienteCompra): string {
    if (p.diasEsperando <= 0) return 'hoy';
    if (p.diasEsperando === 1) return 'hace 1 día';
    return `hace ${p.diasEsperando} días`;
  }

  async exportar(): Promise<void> {
    const datos = this.visibles();
    if (!datos.length) {
      this.snack.open('No hay pendientes para exportar', 'OK', { duration: 3000 });
      return;
    }

    const wb = new Workbook();
    const ws = wb.addWorksheet('Pendientes de compra');

    const encabezados = ['Código de pieza', 'Cód. proveedor', 'Descripción', 'UM', 'Cantidad faltante',
                         'Planes afectados', 'Líneas', 'Esperando desde', 'Días', 'Pedido'];
    const header = ws.addRow(encabezados);
    header.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    for (const p of datos) {
      ws.addRow([
        p.codigoPieza,
        p.codigoProveedor ?? '-',
        p.descripcion ?? '-',
        p.um ?? '-',
        p.cantidadFaltante,
        p.planes.join(', '),
        p.lineas,
        p.desde ? new Date(p.desde).toLocaleDateString('es-AR') : '-',
        p.diasEsperando,
        p.pedido ? 'SÍ' : 'NO'
      ]);
    }

    encabezados.forEach((titulo, i) => {
      const col = ws.getColumn(i + 1);
      let max = titulo.length;
      col.eachCell({ includeEmpty: false }, cell => {
        max = Math.max(max, String(cell.value ?? '').length);
      });
      col.width = Math.min(max + 4, 48);
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const f = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    saveAs(blob, `pendientes_compra_${f.getFullYear()}${pad(f.getMonth() + 1)}${pad(f.getDate())}.xlsx`);
  }
}
