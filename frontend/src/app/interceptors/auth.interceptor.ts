import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const tokenKey = 'auth_token';
  const token = localStorage.getItem(tokenKey);

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
