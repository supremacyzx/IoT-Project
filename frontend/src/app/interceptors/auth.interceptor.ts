import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import {ApiService} from '../services/api.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const apiService = inject(ApiService);
  const token = apiService.getToken();

  // Wenn kein Token vorhanden ist oder es sich um eine Login-Anfrage handelt, sende die Anfrage ohne Token
  if (!token || req.url.includes('/login') || req.url.includes('/health')) {
    return next(req);
  }

  // Klone die Anfrage und füge den Authorization-Header hinzu
  const authReq = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`)
  });

  // Sende die modifizierte Anfrage weiter
  return next(authReq);
};
