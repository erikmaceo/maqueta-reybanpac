import { HttpInterceptorFn } from '@angular/common/http';
import { tokenStore } from '../services/api.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = tokenStore.get();
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq);
  }
  return next(req);
};
