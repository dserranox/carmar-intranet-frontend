import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const raw = localStorage.getItem('user');
  if (raw) {
    try {
      const { username } = JSON.parse(raw);
      const cloned = req.clone({
        setHeaders: { Authorization: `Bearer FAKE-${username}-TOKEN` }
      });
      return next(cloned);
    } catch {
      // ignore JSON error
    }
  }
  return next(req);
};
