import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { OperationsService } from '../../services/operations.service';
import { OperacionesDTO } from './../../models/operacion';


export interface StartTaskDialogData {
  ordenId?: number;
  ordNroPlan?: string;
  operaciones?: string[];
}

export interface StartTaskDialogResult {
  operacionId: number;
  nroMaquina: number;
}

@Component({
  selector: 'app-start-task-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './start-task-dialog.component.html',
  styleUrls: ['./start-task-dialog.component.scss']
})
export class StartTaskDialogComponent implements OnInit {
  form: FormGroup;
  operaciones: OperacionesDTO[] = [];

  constructor(
    private fb: FormBuilder,
    private ref: MatDialogRef<StartTaskDialogComponent, StartTaskDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: StartTaskDialogData,
    private operacionesService: OperationsService
  ) {
    this.form = this.fb.group({
      operacionId: [null, Validators.required],
      nroMaquina: [null, [Validators.required, Validators.pattern(/^\d+$/)]]
    });
  }

  ngOnInit(): void {
    this.operacionesService.getAll().subscribe({
      next: (ops) => { this.operaciones = ops || []; },
      error: () => { this.operaciones = []; }
    });
    
  }

  cancelar(): void {
    this.ref.close();
  }

  iniciar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { operacionId, nroMaquina } = this.form.value;
    this.ref.close({
      operacionId: Number(operacionId),
      nroMaquina: Number(nroMaquina)
    });

  }
}
