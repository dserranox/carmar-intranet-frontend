import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatDividerModule
  ],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  loading = true;
  saving = false;
  hideActual = true;
  hideNueva = true;
  hideConfirmar = true;

  form: FormGroup = this.fb.group({
    username: [{ value: '', disabled: true }],
    email: ['', [Validators.required, Validators.email]],
    passwordActual: [''],
    passwordNueva: [''],
    confirmarPassword: ['']
  }, { validators: this.confirmarPasswordValidator });

  ngOnInit(): void {
    this.usuarioService.getPerfil().subscribe({
      next: (perfil) => {
        this.form.patchValue({ username: perfil.username, email: perfil.email ?? '' });
        this.loading = false;
      },
      error: () => {
        this.snack.open('No se pudo cargar el perfil.', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });

    // Si escribe password nueva, passwordActual pasa a ser requerido
    this.form.get('passwordNueva')?.valueChanges.subscribe(() => this.updatePasswordValidators());
  }

  private updatePasswordValidators(): void {
    const actual = this.form.get('passwordActual');
    const nueva = this.form.get('passwordNueva')?.value;
    if (nueva) {
      actual?.setValidators(Validators.required);
    } else {
      actual?.clearValidators();
      actual?.setErrors(null);
    }
    actual?.updateValueAndValidity({ emitEvent: false });
  }

  private confirmarPasswordValidator(group: AbstractControl): ValidationErrors | null {
    const nueva = group.get('passwordNueva')?.value;
    const confirmar = group.get('confirmarPassword')?.value;
    if (nueva && confirmar && nueva !== confirmar) {
      group.get('confirmarPassword')?.setErrors({ noCoincide: true });
      return { noCoincide: true };
    } else if (group.get('confirmarPassword')?.hasError('noCoincide')) {
      group.get('confirmarPassword')?.setErrors(null);
    }
    return null;
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const { email, passwordActual, passwordNueva } = this.form.getRawValue();
    this.saving = true;

    this.usuarioService.updatePerfil({
      email,
      passwordActual: passwordActual || null,
      passwordNueva: passwordNueva || null
    }).subscribe({
      next: () => {
        this.snack.open('Perfil actualizado correctamente.', 'OK', { duration: 2500 });
        this.router.navigate(['/ordenes']);
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo actualizar el perfil.';
        this.snack.open(msg, 'OK', { duration: 4000 });
        this.saving = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/ordenes']);
  }
}
