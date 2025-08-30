
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

  constructor(
    private fb: FormBuilder,
    private ref: MatDialogRef<FinishTaskDialogComponent, FinishTaskDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: FinishTaskDialogData
  ) {
    const initialCantidad = data?.tarea?.ordCantidad ?? null;
    this.form = this.fb.group({
      cantidad: [initialCantidad, [Validators.required, Validators.pattern(/^\d+$/)]],
      observaciones: [data?.tarea?.observaciones ?? null]
    });
  }

  cancelar(): void { this.ref.close(); }

  finalizar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { cantidad, observaciones } = this.form.value;
    this.ref.close({
      cantidad: Number(cantidad),
      observaciones: (observaciones ?? '').toString().trim() || null
    });
  }
}
