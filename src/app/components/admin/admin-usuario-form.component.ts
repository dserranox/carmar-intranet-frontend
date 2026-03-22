import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { UsuarioService } from '../../services/usuario.service';

function carMarEmailValidator(ctrl: AbstractControl): ValidationErrors | null {
  const v: string = (ctrl.value || '').trim().toLowerCase();
  if (!v) return null;
  return v.endsWith('@car-mar.com') ? null : { carMarDomain: true };
}

@Component({
  selector: 'app-admin-usuario-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatDividerModule
  ],
  templateUrl: './admin-usuario-form.component.html',
  styleUrls: ['./admin-usuario-form.component.scss']
})
export class AdminUsuarioFormComponent implements OnInit {
  private usuarioService = inject(UsuarioService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  modo: 'ver' | 'editar' | 'nuevo' = 'ver';
  get modoEdicion() { return this.modo === 'editar'; }
  get modoNuevo()   { return this.modo === 'nuevo'; }

  loading = true;
  saving = false;
  activo = false;
  usuarioId = 0;

  hidePassword = true;
  hideConfirmar = true;

  readonly rolesDisponibles = ['ADMIN', 'OPERARIO'];

  form: FormGroup = this.fb.group({
    username: [{ value: '', disabled: true }],
    email: ['', [Validators.email, carMarEmailValidator]],
    roles: [[]],
    password: [''],
    confirmarPassword: ['']
  });

  ngOnInit(): void {
    this.modo = this.route.snapshot.data['mode'] as 'ver' | 'editar' | 'nuevo';
    this.usuarioId = Number(this.route.snapshot.paramMap.get('id'));

    if (this.modoNuevo) {
      this.setupNuevoMode();
    } else if (this.modoEdicion) {
      this.setupEdicionMode();
      this.loadUsuario();
    } else {
      this.form.disable();
      this.loadUsuario();
    }
  }

  private setupEdicionMode(): void {
    // Password es opcional en editar: solo validar coincidencia si se ingresa algo
    this.form.get('password')!.valueChanges.subscribe(() => this.syncConfirmarError());
    this.form.get('confirmarPassword')!.valueChanges.subscribe(() => this.syncConfirmarError());
  }

  private setupNuevoMode(): void {
    this.form.get('username')!.enable();
    this.form.get('username')!.setValidators([Validators.required]);
    this.form.get('email')!.setValidators([Validators.required, carMarEmailValidator]);
    this.form.get('password')!.setValidators([Validators.required]);
    this.form.get('confirmarPassword')!.setValidators([Validators.required]);
    this.form.updateValueAndValidity();

    this.form.get('password')!.valueChanges.subscribe(() => this.syncConfirmarError());
    this.form.get('confirmarPassword')!.valueChanges.subscribe(() => this.syncConfirmarError());

    this.loading = false;
  }

  private loadUsuario(): void {
    this.usuarioService.getUsuario(this.usuarioId).subscribe({
      next: (u) => {
        this.activo = u.activo;
        this.form.patchValue({ username: u.username, email: u.email ?? '', roles: u.roles });
        this.loading = false;
      },
      error: () => {
        this.snack.open('No se pudo cargar el usuario.', 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private syncConfirmarError(): void {
    const pass = this.form.get('password')?.value;
    const confirmar = this.form.get('confirmarPassword')!;
    if (pass && confirmar.value && pass !== confirmar.value) {
      confirmar.setErrors({ noCoincide: true });
    } else if (confirmar.hasError('noCoincide')) {
      confirmar.setErrors(null);
    }
    // En editar: si se escribe password, confirmar pasa a ser requerido
    if (this.modoEdicion) {
      if (pass && !confirmar.hasError('noCoincide')) {
        confirmar.setValidators([Validators.required]);
      } else if (!pass) {
        confirmar.clearValidators();
        confirmar.setErrors(null);
      }
      confirmar.updateValueAndValidity({ emitEvent: false });
    }
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.modoNuevo) this.syncConfirmarError();
    if (this.form.invalid) return;

    if (this.modoNuevo) {
      const { username, email, password, roles } = this.form.getRawValue();
      this.saving = true;
      this.usuarioService.createUsuario({ username, email, password, roles }).subscribe({
        next: () => {
          this.snack.open('Usuario creado correctamente.', 'OK', { duration: 2500 });
          this.router.navigate(['/admin/usuarios']);
        },
        error: (err) => {
          this.snack.open(err?.error?.message || 'No se pudo crear el usuario.', 'OK', { duration: 4000 });
          this.saving = false;
        }
      });
    } else {
      const { email, roles, password } = this.form.getRawValue();
      this.saving = true;
      this.usuarioService.updateUsuario(this.usuarioId, {
        email: email || null,
        roles,
        passwordNueva: password || null
      }).subscribe({
        next: () => {
          this.snack.open('Usuario actualizado correctamente.', 'OK', { duration: 2500 });
          this.router.navigate(['/admin/usuarios']);
        },
        error: (err) => {
          this.snack.open(err?.error?.message || 'No se pudo actualizar el usuario.', 'OK', { duration: 4000 });
          this.saving = false;
        }
      });
    }
  }

  darDeBaja(): void {
    this.saving = true;
    this.usuarioService.darDeBaja(this.usuarioId).subscribe({
      next: () => {
        this.activo = false;
        this.snack.open('Usuario dado de baja.', 'OK', { duration: 2500 });
        this.saving = false;
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'No se pudo dar de baja.', 'OK', { duration: 4000 });
        this.saving = false;
      }
    });
  }

  darDeAlta(): void {
    this.saving = true;
    this.usuarioService.darDeAlta(this.usuarioId).subscribe({
      next: () => {
        this.activo = true;
        this.snack.open('Usuario dado de alta.', 'OK', { duration: 2500 });
        this.saving = false;
      },
      error: (err) => {
        this.snack.open(err?.error?.message || 'No se pudo dar de alta.', 'OK', { duration: 4000 });
        this.saving = false;
      }
    });
  }

  irEditar(): void {
    this.router.navigate(['/admin/usuarios', this.usuarioId, 'editar']);
  }

  volver(): void {
    this.router.navigate(['/admin/usuarios']);
  }
}
