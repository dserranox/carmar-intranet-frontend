import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';

import { CalidadService } from '../../services/calidad.service';
import { RegistroCalidad, ResumenCalidad, RutaCalidad } from '../../models/calidad';
import { OpcionBuscable, SelectBuscableComponent } from '../../shared/select-buscable.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { CriteriosComponent } from "./criterios.component";
import { NoConformidadesComponent } from "../no-conformidades/no-conformidades.component";

@Component({
  selector: 'app-calidad',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    MatTabsModule, MatTableModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatTooltipModule, MatSnackBarModule, MatDialogModule, SelectBuscableComponent,
    RouterLink, CriteriosComponent, NoConformidadesComponent
  ],
  templateUrl: './calidad.component.html',
  styleUrls: ['./calidad.component.css']
})
export class CalidadComponent implements OnInit {
  private calidadService = inject(CalidadService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  // --- Registros de los operarios ---
  resumen = signal<ResumenCalidad | null>(null);
  cargandoRegistros = signal(false);

  desde: Date | null = null;
  hasta: Date | null = null;
  filtroTipo = '';
  filtroResultado = '';
  filtroUsuario = '';
  filtroPlan = '';
  soloNoConformes = signal(false);

  opcionesTipo: OpcionBuscable[] = [
    { valor: 'LONGITUD', texto: 'Longitud' },
    { valor: 'TRACCION', texto: 'Tracción' }
  ];
  opcionesResultado: OpcionBuscable[] = [
    { valor: 'OK', texto: 'Conforme' },
    { valor: 'NO_OK', texto: 'No conforme' }
  ];
  opcionesUsuario: OpcionBuscable[] = [];
  opcionesPlan: OpcionBuscable[] = [];

  columnasRegistros = [
    'fecha', 'tipo', 'resultado', 'nroPlan', 'codigo', 'nroCorte',
    'extremo', 'seccion', 'terminal', 'nominal', 'medido', 'rango', 'usuario', 'observaciones'
  ];

  /** Lo que se ve en la tabla: el filtro de no conformes se aplica en el navegador. */
  registrosVisibles = computed(() => {
    const todos = this.resumen()?.registros ?? [];
    return this.soloNoConformes() ? todos.filter(r => r.resultado !== 'OK') : todos;
  });

  // --- Recorridas ---
  rutas = signal<RutaCalidad[]>([]);
  cargandoRutas = signal(false);
  rutaEnCurso = signal<RutaCalidad | null>(null);
  puedeControlar = false;
  puedeVerNoConformidades = false;

  columnasRutas = ['fecha', 'numero', 'responsable', 'estado', 'ordenes', 'ok', 'ko', 'minutos', 'acciones'];

  ngOnInit(): void {
    this.puedeControlar = this.tienePermiso('CALIDAD:WRITE');
    this.puedeVerNoConformidades = this.tienePermiso("NOCONFORMIDADES:READ");
    // Por defecto, el último mes.
    const hoy = new Date();
    this.hasta = hoy;
    this.desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate());
    this.cargarRegistros();
    this.cargarRutas();
    if (this.puedeControlar) this.cargarRutaEnCurso();
  }

  private tienePermiso(permiso: string): boolean {
    try {
      const data = localStorage.getItem('user');
      if (!data) return false;
      const perms = JSON.parse(data)?.permissions;
      return Array.isArray(perms) && perms.includes(permiso);
    } catch { return false; }
  }

  private aISO(fecha: Date | null): string | undefined {
    if (!fecha) return undefined;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
  }

  // ==================== Registros ====================

  cargarRegistros(): void {
    this.cargandoRegistros.set(true);
    this.calidadService.getRegistros({
      desde: this.aISO(this.desde),
      hasta: this.aISO(this.hasta),
      tipo: this.filtroTipo || undefined,
      resultado: this.filtroResultado || undefined,
      usuario: this.filtroUsuario || undefined
    }).subscribe({
      next: resumen => {
        this.cargandoRegistros.set(false);
        this.resumen.set(resumen);
        this.armarOpciones(resumen.registros);
      },
      error: () => {
        this.cargandoRegistros.set(false);
        this.snack.open('No se pudieron cargar los controles', 'OK', { duration: 4000 });
      }
    });
  }

  private armarOpciones(registros: RegistroCalidad[]): void {
    const unicos = (valores: (string | null)[]) =>
      [...new Set(valores.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b))
        .map(v => ({ valor: v, texto: v }));
    // Los operarios y planes se sacan del universo completo, no del filtrado.
    if (!this.filtroUsuario) this.opcionesUsuario = unicos(registros.map(r => r.usuario));
    this.opcionesPlan = unicos(registros.map(r => r.nroPlan));
  }

  limpiarFiltros(): void {
    const hoy = new Date();
    this.hasta = hoy;
    this.desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, hoy.getDate());
    this.filtroTipo = '';
    this.filtroResultado = '';
    this.filtroUsuario = '';
    this.soloNoConformes.set(false);
    this.cargarRegistros();
  }

  alternarNoConformes(): void {
    this.soloNoConformes.set(!this.soloNoConformes());
  }

  rango(r: RegistroCalidad): string {
    if (r.valorMin == null && r.valorMax == null) return '—';
    if (r.tipo === 'TRACCION') return `≥ ${r.valorMin}`;
    return `${r.valorMin} – ${r.valorMax}`;
  }

  unidad(tipo: string): string {
    return tipo === 'TRACCION' ? 'N' : 'mm';
  }

  async exportarRegistros(): Promise<void> {
    const datos = this.registrosVisibles();
    if (!datos.length) {
      this.snack.open('No hay controles para exportar', 'OK', { duration: 2500 });
      return;
    }
    const encabezados = [
      'Fecha', 'Tipo', 'Resultado', 'Sábana', 'Nro. Plan', 'Código', 'Nro. Corte', 'Nro. Cable',
      'Color', 'Extremo', 'Sección (mm²)', 'Terminal', 'Nominal', 'Medido', 'Desvío',
      'Mínimo', 'Máximo', 'Unidad', 'Operario', 'Observaciones'
    ];
    const filas = datos.map(r => [
      this.fechaHora(r.fecha), r.tipo, r.resultado === 'OK' ? 'CONFORME' : 'NO CONFORME',
      r.sabana ?? '-', r.nroPlan ?? '-', r.codigo ?? '-', r.nroCorte ?? '-', r.nroCable ?? '-',
      r.color ?? '-', r.extremo ?? '-', r.seccion ?? '-', r.terminal ?? '-',
      r.valorNominal ?? '-', r.valorMedido ?? '-', r.desvio ?? '-',
      r.valorMin ?? '-', r.valorMax ?? '-', this.unidad(r.tipo), r.usuario, r.observaciones ?? '-'
    ]);
    await this.bajarExcel('Controles', encabezados, filas, 'controles_calidad');
  }

  // ==================== Recorridas ====================

  cargarRutas(): void {
    this.cargandoRutas.set(true);
    this.calidadService.getRutas(this.aISO(this.desde), this.aISO(this.hasta)).subscribe({
      next: rutas => { this.cargandoRutas.set(false); this.rutas.set(rutas); },
      error: () => {
        this.cargandoRutas.set(false);
        this.snack.open('No se pudieron cargar las recorridas', 'OK', { duration: 4000 });
      }
    });
  }

  private cargarRutaEnCurso(): void {
    this.calidadService.getRutaEnCurso().subscribe({
      next: ruta => this.rutaEnCurso.set(ruta),
      error: () => this.rutaEnCurso.set(null)
    });
  }

  /**
   * Arranca una recorrida y lleva derecho a la pantalla de control. El número lo
   * pone el servidor según cuántas van ese día: algunos días se hacen dos y otros
   * tres, así que no hay una cantidad fija.
   */
  iniciarRuta(): void {
    this.calidadService.iniciarRuta(this.aISO(new Date())).subscribe({
      next: ruta => this.router.navigate(['/calidad/ruta', ruta.rcaId]),
      error: err => this.snack.open(err?.error?.message || 'No se pudo iniciar la recorrida', 'OK',
        { duration: 6000 })
    });
  }

  abrirRuta(ruta: RutaCalidad): void {
    this.router.navigate(['/calidad/ruta', ruta.rcaId]);
  }

  /** Las recorridas que se hicieron hoy, en el orden en que salieron. */
  rutasDeHoy(): RutaCalidad[] {
    const hoy = this.aISO(new Date());
    return this.rutas()
      .filter(r => r.fecha === hoy)
      .sort((a, b) => a.numero - b.numero);
  }

  /** Sólo se sigue la propia: la de otro responsable se mira y nada más. */
  puedeSeguir(ruta: RutaCalidad): boolean {
    return ruta.estado === 'EN_CURSO' && ruta.responsable === this.usuarioActual();
  }

  etiquetaEstado(ruta: RutaCalidad): string {
    switch (ruta.estado) {
      case 'CERRADA': return 'Hecha';
      case 'SUSPENDIDA': return 'Suspendida';
      default: return 'En curso';
    }
  }

  async exportarRutas(): Promise<void> {
    const rutas = this.rutas();
    if (!rutas.length) {
      this.snack.open('No hay recorridas para exportar', 'OK', { duration: 2500 });
      return;
    }
    // Se baja el detalle punto por punto: es lo que sirve para analizar después.
    const detalles = await Promise.all(rutas.map(r => this.calidadService.getRuta(r.rcaId).toPromise()));
    const encabezados = [
      'Fecha', 'Recorrida', 'Responsable', 'Estado', 'Nro. Plan', 'Código', 'Producto', 'Cliente',
      'Puesto', 'Operario', 'Resultado de la orden', 'Punto de control', 'Resultado', 'Observaciones'
    ];
    const filas: (string | number)[][] = [];
    for (const ruta of detalles) {
      if (!ruta) continue;
      for (const control of ruta.controles ?? []) {
        for (const item of control.items) {
          filas.push([
            ruta.fecha, ruta.numero, ruta.responsable, ruta.estado,
            control.nroPlan, control.productoCodigo ?? '-', control.productoDescripcion ?? '-',
            control.clienteRazonSocial ?? '-', control.puesto ?? '-', control.operario ?? '-',
            control.resultado, item.punto ?? '-', item.resultado, item.observaciones ?? '-'
          ]);
        }
      }
    }
    if (!filas.length) {
      this.snack.open('Las recorridas no tienen controles cargados', 'OK', { duration: 3000 });
      return;
    }
    await this.bajarExcel('Recorridas', encabezados, filas, 'rutas_calidad');
  }

  // ==================== Auxiliares ====================

  private fechaHora(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private async bajarExcel(hoja: string, encabezados: string[],
                           filas: (string | number)[][], prefijo: string): Promise<void> {
    const wb = new Workbook();
    const ws = wb.addWorksheet(hoja);
    const cabecera = ws.addRow(encabezados);
    cabecera.font = { bold: true };
    cabecera.eachCell(celda => {
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2F1' } };
    });
    filas.forEach(f => ws.addRow(f));

    encabezados.forEach((titulo, i) => {
      const col = ws.getColumn(i + 1);
      let ancho = titulo.length;
      col.eachCell({ includeEmpty: false }, celda => {
        const largo = String(celda.value ?? '').length;
        if (largo > ancho) ancho = largo;
      });
      col.width = Math.min(ancho + 4, 45);
    });
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const f = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    saveAs(blob, `${prefijo}_${f.getFullYear()}${pad(f.getMonth() + 1)}${pad(f.getDate())}_${pad(f.getHours())}${pad(f.getMinutes())}.xlsx`);
  }

  confirmarYAbrir(ruta: RutaCalidad): void {
    if (ruta.estado === 'EN_CURSO' && ruta.responsable !== this.usuarioActual()) {
      this.dialog.open(ConfirmDialogComponent, {
        data: {
          titulo: 'Recorrida de otro responsable',
          mensaje: `La recorrida ${ruta.numero} del ${ruta.fecha} la está haciendo ${ruta.responsable}. La vas a ver, pero no la podés modificar.`,
          botonConfirmar: 'Ver igual',
          botonCancelar: 'Volver'
        }
      }).afterClosed().subscribe(ok => { if (ok) this.abrirRuta(ruta); });
      return;
    }
    this.abrirRuta(ruta);
  }

  usuarioActual(): string {
    try {
      const data = localStorage.getItem('user');
      return data ? (JSON.parse(data)?.username ?? '') : '';
    } catch { return ''; }
  }
}
