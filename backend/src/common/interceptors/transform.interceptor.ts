import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

function redactSecrets(value: any): any {
  if (value instanceof Date || value === null || typeof value !== "object")
    return value;
  if (Array.isArray(value)) return value.map(redactSecrets);
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          ![
            "passwordHash",
            "refreshTokenHash",
            "verificationCode",
            "verificationExpiresAt",
          ].includes(key),
      )
      .map(([key, item]) => [key, redactSecrets(item)]),
  );
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        data = redactSecrets(data);

        if (data && typeof data === "object" && "success" in data) {
          return data;
        }
        return {
          success: true,
          data: data ?? null,
          message: "Success",
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
