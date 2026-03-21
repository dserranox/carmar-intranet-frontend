
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface FinishTaskDialogData {
  tarea: any; // TareasDTO
}

export interface FinishTaskDialogResult {
  cantidad: number;
  observaciones: string | null;
  noConforme: number | null;
  perdidaRendimiento: number | null;
  perdidaMantenimiento: number | null;
  perdidaCalidad: number | null;
}

@Component({
  selector: 'app-finish-task-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './finish-task-dialog.component.html',
  styleUrls: ['./finish-task-dialog.component.scss']
})
export class FinishTaskDialogComponent {
  form: FormGroup;
  maxDemoraMinutos: number;

  constructor(
    private fb: FormBuilder,
    private ref: MatDialogRef<FinishTaskDialogComponent, FinishTaskDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: FinishTaskDialogData
  ) {
    const initialCantidad = data?.tarea?.ordCantidad ?? null;
    this.maxDemoraMinutos = data?.tarea?.fechaInicio
      ? Math.floor((Date.now() - new Date(data.tarea.fechaInicio).getTime()) / 60_000)
      : Infinity;

    this.form = this.fb.group({
      cantidad: [initialCantidad, [Validators.required, Validators.pattern(/^\d+$/), Validators.min(1)]],
      observaciones: [data?.tarea?.observaciones ?? null],
      noConforme: [null],
      perdidaRendimiento: [null],
      perdidaMantenimiento: [null],
      perdidaCalidad: [null]
    });

    // Revalidar noConforme cuando cambia cantidad o noConforme
    this.form.get('noConforme')?.valueChanges.subscribe(() => this.validateNoConforme());
    this.form.get('cantidad')?.valueChanges.subscribe(() => this.validateNoConforme());

    // Revalidar demora cuando cambia cualquiera de los tres campos
    ['perdidaRendimiento', 'perdidaMantenimiento', 'perdidaCalidad'].forEach(f =>
      this.form.get(f)?.valueChanges.subscribe(() => this.validateDemora())
    );
  }

  private validateNoConforme(): void {
    const cantidad = Number(this.form.get('cantidad')?.value);
    const noConf = Number(this.form.get('noConforme')?.value);
    const ctrl = this.form.get('noConforme');
    if (!isNaN(noConf) && !isNaN(cantidad) && noConf > cantidad) {
      ctrl?.setErrors({ noConformeExcedeCantidad: true });
    } else if (ctrl?.hasError('noConformeExcedeCantidad')) {
      ctrl.setErrors(null);
    }
  }

  private validateDemora(): void {
    const total = (Number(this.form.get('perdidaRendimiento')?.value) || 0)
                + (Number(this.form.get('perdidaMantenimiento')?.value) || 0)
                + (Number(this.form.get('perdidaCalidad')?.value) || 0);
    const ctrl = this.form.get('perdidaCalidad');
    if (total > this.maxDemoraMinutos) {
      ctrl?.setErrors({ demoraExcedeProceso: true });
    } else if (ctrl?.hasError('demoraExcedeProceso')) {
      ctrl.setErrors(null);
    }
  }

  cancelar(): void { this.ref.close(); }

  finalizar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { cantidad, observaciones, noConforme, perdidaRendimiento, perdidaMantenimiento, perdidaCalidad } = this.form.value;
    this.ref.close({
      cantidad: Number(cantidad),
      observaciones: (observaciones ?? '').toString().trim() || null,
      noConforme: noConforme != null ? Number(noConforme) : null,
      perdidaRendimiento: perdidaRendimiento != null ? Number(perdidaRendimiento) : null,
      perdidaMantenimiento: perdidaMantenimiento != null ? Number(perdidaMantenimiento) : null,
      perdidaCalidad: perdidaCalidad != null ? Number(perdidaCalidad) : null
    });
  }
}
