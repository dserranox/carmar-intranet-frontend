import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { NoConformidadesService } from '../../services/no-conformidades.service';
import { ClientesService } from '../../services/clientes.service';
import { ProductosService } from '../../services/productos.service';
import { UsuarioService } from '../../services/usuario.service';
import {
  AdjuntoNC, NoConformidad, ORIGENES_EXTERNOS, ORIGENES_INTERNOS
} from '../../models/no-conformidad';
import { Producto } from '../../models/producto';
import { OpcionBuscable, SelectBuscableComponent } from '../../shared/select-buscable.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

/**
 * Alta y edición de una no conformidad, con los mismos puntos del FQ-02.
 * Mientras está abierta se edita; al cerrarla queda el formulario para bajar.
 */
@Component({
  selector: 'app-no-conformidad-form',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatTooltipModule, MatSnackBarModule,
    MatDialogModule, SelectBuscableComponent
  ],
  templateUrl: './no-conformidad-form.component.html',
  styleUrls: ['./no-conformidad-form.component.css']
})
export class NoConformidadFormComponent implements OnInit {
  private servicio = inject(NoConformidadesService);
  private clientesService = inject(ClientesService);
  private productosService = inject(ProductosService);
  private usuarioService = inject(UsuarioService);
  private ruta = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  nc = signal<NoConformidad>(this.vacia());
  guardando = signal(false);
  subiendo = signal(false);
  cargando = signal(false);
  puedeEscribir = false;

  /** Las fotos ya subidas, con su URL local para mostrarlas. */
  vistas = signal<Record<number, string>>({});

  opcionesTipo: OpcionBuscable[] = [
    { valor: 'INTERNA', texto: 'Interna' },
    { valor: 'EXTERNA', texto: 'Externa' }
  ];
  opcionesEmitidaA: OpcionBuscable[] = [
    { valor: 'PRODUCCION', texto: 'Producción' },
    { valor: 'OTRO', texto: 'Otro' }
  ];
  opcionesEmite: OpcionBuscable[] = [
    { valor: 'CALIDAD', texto: 'Calidad' },
    { valor: 'CLIENTE', texto: 'Cliente' },
    { valor: 'OTRO', texto: 'Otro' }
  ];
  opcionesEjecucion: OpcionBuscable[] = [
    { valor: 'PENDIENTE', texto: 'Pendiente' },
    { valor: 'EJECUTADA', texto: 'Ejecutada' },
    { valor: 'NO_EJECUTADA', texto: 'No ejecutada' }
  ];
  opcionesCliente: OpcionBuscable[] = [];
  opcionesProducto: OpcionBuscable[] = [];
  private productos: Producto[] = [];
  opcionesUsuario: OpcionBuscable[] = [];

  /** El origen depende de si es interna o externa. */
  opcionesOrigen = computed<OpcionBuscable[]>(() => {
    const lista = this.nc().tipo === 'EXTERNA' ? ORIGENES_EXTERNOS : ORIGENES_INTERNOS;
    return lista.map(o => ({ valor: o.valor, texto: o.texto }));
  });

  esNueva = computed(() => !this.nc().ncfId);
  cerrada = computed(() => this.nc().estado === 'CERRADA');
  soloLectura = computed(() => this.cerrada() || !this.puedeEscribir);
  /** Si nació de un KO, el producto y el lote son la prueba del hecho: no se tocan. */
  vieneDeUnControl = computed(() => !!(this.nc().rccId || this.nc().ccaId));
  trazabilidadEditable = computed(() => !this.soloLectura() && !this.vieneDeUnControl());
  hayTrazabilidad = computed(() => !!(this.nc().nroPlan || this.nc().productoCodigo
    || this.nc().lote || this.nc().puesto || this.nc().operario));
  pideOrigenOtro = computed(() => (this.nc().origen ?? '').startsWith('OTRO'));
  primerResponsable = computed(() => (this.nc().responsables ?? [])[0] ?? '');

  ngOnInit(): void {
    this.puedeEscribir = this.tienePermiso('NOCONFORMIDADES:WRITE');
    this.cargarListas();

    const id = this.ruta.snapshot.paramMap.get('ncfId');
    if (id && id !== 'nueva') {
      this.cargar(Number(id));
      return;
    }
    // Si viene de un KO, se trae el borrador precargado.
    const rccId = this.ruta.snapshot.queryParamMap.get('rccId');
    if (rccId) this.cargarBorrador(Number(rccId));
  }

  private vacia(): NoConformidad {
    return {
      tipo: 'INTERNA',
      emitidaA: 'PRODUCCION',
      emite: 'CALIDAD',
      origen: 'MURO_CALIDAD',
      descripcion: '',
      ejecucion: 'PENDIENTE',
      responsables: []
    };
  }

  private tienePermiso(permiso: string): boolean {
    try {
      const data = localStorage.getItem('user');
      if (!data) return false;
      const perms = JSON.parse(data)?.permissions;
      return Array.isArray(perms) && perms.includes(permiso);
    } catch { return false; }
  }

  private cargarListas(): void {
    this.clientesService.getNombres().subscribe({
      next: cs => this.opcionesCliente = cs
        .map(c => ({ valor: c.id, texto: c.razonSocial }))
        .sort((a, b) => a.texto.localeCompare(b.texto)),
      error: () => { /* si no puede listar clientes, el campo queda vacío */ }
    });
    this.productosService.getAll().subscribe({
      next: ps => {
        this.productos = ps;
        this.opcionesProducto = ps
          .map(p => ({ valor: p.codigo, texto: `${p.codigo} — ${p.descripcion}` }))
          .sort((a, b) => a.texto.localeCompare(b.texto));
      },
      error: () => { /* si no puede listar productos, el campo queda vacío */ }
    });
    this.usuarioService.getUsuariosActivos().subscribe({
      next: us => this.opcionesUsuario = us
        .map((u: any) => ({ valor: u.username, texto: u.username }))
        .sort((a: OpcionBuscable, b: OpcionBuscable) => a.texto.localeCompare(b.texto)),
      error: () => { /* si no puede listar usuarios, escribe el responsable a mano */ }
    });
  }

  private cargar(ncfId: number): void {
    this.cargando.set(true);
    this.servicio.get(ncfId).subscribe({
      next: nc => {
        this.cargando.set(false);
        this.nc.set({ ...nc, responsables: nc.responsables ?? [] });
        (nc.adjuntos ?? []).forEach(a => this.cargarVista(a));
      },
      error: err => {
        this.cargando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo abrir la no conformidad', 'OK', { duration: 5000 });
        this.router.navigate(['/no-conformidades']);
      }
    });
  }

  private cargarBorrador(rccId: number): void {
    this.servicio.borradorDeKo(rccId).subscribe({
      next: b => {
        if (b.ncfExistente) {
          this.snack.open(`Ese KO ya tiene la no conformidad N° ${b.numeroExistente}`, 'OK', { duration: 5000 });
          this.router.navigate(['/no-conformidades', b.ncfExistente]);
          return;
        }
        this.nc.set({
          tipo: b.tipo, emitidaA: b.emitidaA, emite: b.emite, origen: b.origen,
          descripcion: b.descripcion, ordenId: b.ordenId, nroPlan: b.nroPlan,
          productoCodigo: b.productoCodigo, productoDescripcion: b.productoDescripcion,
          operario: b.operario, puesto: b.puesto,
          ejecucion: 'PENDIENTE', responsables: []
        });
      },
      error: err => this.snack.open(err?.error?.message || 'No se pudo preparar la no conformidad',
        'OK', { duration: 5000 })
    });
  }

  // ==================== edición ====================

  actualizar(campo: keyof NoConformidad, valor: any): void {
    this.nc.set({ ...this.nc(), [campo]: valor });
  }

  /** Al elegir el producto se guarda el código y, de paso, su descripción. */
  elegirProducto(codigo: any): void {
    const producto = this.productos.find(p => p.codigo === codigo);
    this.nc.set({
      ...this.nc(),
      productoCodigo: codigo || null,
      productoDescripcion: producto?.descripcion ?? null
    });
  }

  /** Al cambiar el tipo hay que reencauzar el origen, porque las listas son distintas. */
  cambiarTipo(tipo: any): void {
    const origen = tipo === 'EXTERNA' ? 'DETECTADA_CLIENTE' : 'MURO_CALIDAD';
    this.nc.set({ ...this.nc(), tipo, origen });
  }

  guardar(): void {
    if (!this.nc().descripcion?.trim()) {
      this.snack.open('Contá qué pasó en la descripción del desvío', 'OK', { duration: 4000 });
      return;
    }
    this.guardando.set(true);
    this.servicio.guardar(this.nc()).subscribe({
      next: guardada => {
        this.guardando.set(false);
        const eraNueva = this.esNueva();
        this.nc.set({ ...guardada, responsables: guardada.responsables ?? [] });
        this.snack.open(eraNueva ? `No conformidad N° ${guardada.numero} abierta` : 'Cambios guardados',
          'OK', { duration: 3000 });
        if (eraNueva) {
          this.router.navigate(['/no-conformidades', guardada.ncfId], { replaceUrl: true });
        }
      },
      error: err => {
        this.guardando.set(false);
        this.snack.open(err?.error?.message || 'No se pudo guardar', 'OK', { duration: 7000 });
      }
    });
  }

  cerrar(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        titulo: 'Cerrar la no conformidad',
        mensaje: `Al cerrar la N° ${this.nc().numero} deja de poder editarse y queda el formulario FQ-02 para descargar.`,
        botonConfirmar: 'Cerrar',
        botonCancelar: 'Volver'
      }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.servicio.cerrar(this.nc().ncfId!).subscribe({
        next: cerrada => {
          this.nc.set({ ...cerrada, responsables: cerrada.responsables ?? [] });
          this.snack.open('No conformidad cerrada', 'OK', { duration: 3000 });
        },
        error: err => this.snack.open(err?.error?.message || 'No se pudo cerrar', 'OK', { duration: 8000 })
      });
    });
  }

  reabrir(): void {
    const motivo = prompt('¿Por qué se reabre la no conformidad?');
    if (!motivo?.trim()) return;
    this.servicio.reabrir(this.nc().ncfId!, motivo.trim()).subscribe({
      next: abierta => {
        this.nc.set({ ...abierta, responsables: abierta.responsables ?? [] });
        this.snack.open('No conformidad reabierta', 'OK', { duration: 3000 });
      },
      error: err => this.snack.open(err?.error?.message || 'No se pudo reabrir', 'OK', { duration: 6000 })
    });
  }

  descargar(): void {
    this.servicio.descargarFormulario(this.nc().ncfId!).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FQ-02 NO CONFORMIDAD N${this.nc().numero} ${this.nc().tipo === 'INTERNA' ? 'Interna' : 'Externa'}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: err => this.snack.open(err?.error?.message || 'No se pudo generar el formulario',
        'OK', { duration: 6000 })
    });
  }

  volver(): void {
    this.router.navigate(['/no-conformidades']);
  }

  // ==================== fotos ====================

  /** Llega desde la cámara de la tablet o desde un archivo. */
  alElegirFoto(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    if (this.esNueva()) {
      this.snack.open('Guardá primero la no conformidad y después sumá las fotos', 'OK', { duration: 5000 });
      return;
    }

    this.subiendo.set(true);
    this.servicio.subirAdjunto(this.nc().ncfId!, archivo).subscribe({
      next: adjunto => {
        this.subiendo.set(false);
        this.nc.set({ ...this.nc(), adjuntos: [...(this.nc().adjuntos ?? []), adjunto] });
        this.cargarVista(adjunto);
      },
      error: err => {
        this.subiendo.set(false);
        this.snack.open(err?.error?.message || 'No se pudo subir la foto', 'OK', { duration: 7000 });
      }
    });
  }

  private cargarVista(adjunto: AdjuntoNC): void {
    if (!adjunto.tipo?.startsWith('image/')) return;
    this.servicio.verAdjunto(adjunto.ncaId).subscribe({
      next: blob => this.vistas.set({ ...this.vistas(), [adjunto.ncaId]: URL.createObjectURL(blob) }),
      error: () => { /* si no se puede mostrar, queda el nombre del archivo */ }
    });
  }

  vistaDe(adjunto: AdjuntoNC): string | null {
    return this.vistas()[adjunto.ncaId] ?? null;
  }

  borrarFoto(adjunto: AdjuntoNC): void {
    this.servicio.borrarAdjunto(adjunto.ncaId).subscribe({
      next: () => this.nc.set({
        ...this.nc(),
        adjuntos: (this.nc().adjuntos ?? []).filter(a => a.ncaId !== adjunto.ncaId)
      }),
      error: err => this.snack.open(err?.error?.message || 'No se pudo borrar', 'OK', { duration: 5000 })
    });
  }

  tamanio(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
