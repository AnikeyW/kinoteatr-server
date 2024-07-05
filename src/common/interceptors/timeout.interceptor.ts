import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { TIMEOUT_KEY } from '../decorators/timeout.decorator';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const timeoutValue = this.reflector.get<number>(TIMEOUT_KEY, context.getHandler());

    if (!timeoutValue) {
      return next.handle();
    }

    return next.handle().pipe(
      timeout(timeoutValue),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new Error('Request timeout'));
        }
        return throwError(() => err);
      }),
    );
  }
}
