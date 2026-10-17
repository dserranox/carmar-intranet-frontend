import { inject } from '@angular/core';
import { CanActivateChildFn, Router, UrlTree } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TareaAbiertaService } from './tarea-abierta.service';

/**
 * Con una tarea corriendo, el operario solo puede estar en la pantalla donde se hace
 * esa tarea. Si intenta irse a otra parte, la app lo devuelve y le dice que primero
 * la pause o la suspenda: si no, el reloj seguiría corriendo contra un lote que
 * dejó de trabajar, y el tiempo del lote dejaría de significar nada.
 *
 * Salir de la app sí se permite: cerrar sesión no falsea ningún tiempo, porque la
 * tarea queda igual de abierta y se retoma después.
 */
const SIEMPRE_PERMITIDO = ['/login', '/perfil'];

/**
 * Pantallas que son parte de hacer la tarea, aunque tengan otra dirección.
 * El KO de una recorrida se convierte en no conformidad ahí mismo: si el candado
 * no dejara pasar, calidad tendría que cerrar la recorrida para poder anotar lo
 * que acaba de encontrar.
 */
const PASOS_DE_LA_TAREA: { desde: string; hacia: string[] }[] = [
  { desde: '/calidad/ruta', hacia: ['/no-conformidades'] }
];

function esUnPasoDeLaTarea(rutaDeLaTarea: string, destino: string): boolean {
  return PASOS_DE_LA_TAREA.some(paso =>
    rutaDeLaTarea.startsWith(paso.desde)
    && paso.hacia.some(h => destino === h || destino.startsWith(h + '/')));
}

export const tareaAbiertaGuard: CanActivateChildFn = (_ruta, estado): Observable<boolean | UrlTree> => {
  const servicio = inject(TareaAbiertaService);
  const router = inject(Router);
  const snack = inject(MatSnackBar);

  const destino = estado.url.split('?')[0];
  if (SIEMPRE_PERMITIDO.some(p => destino.startsWith(p))) return of(true);

  return servicio.consultar().pipe(
    map(tarea => {
      // Sin tarea corriendo, o sin saber dónde se hace, no hay nada que bloquear.
      if (!tarea || !tarea.ruta) return true;
      if (destino === tarea.ruta || destino.startsWith(tarea.ruta + '/')) return true;
      if (esUnPasoDeLaTarea(tarea.ruta, destino)) return true;

      const donde = tarea.nroPlan ? ` del plan ${tarea.nroPlan}` : '';
      snack.open(
        `Tenés abierta la tarea de ${tarea.operacionNombre}${donde}. `
        + 'Pausala o suspendela antes de ir a otra pantalla.',
        'OK', { duration: 7000 });
      return router.parseUrl(tarea.ruta);
    })
  );
};
