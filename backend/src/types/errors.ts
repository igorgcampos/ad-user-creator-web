// Classes de erro customizadas
export class AppError extends Error {
  public statusCode: number;
  public errorCode: string | undefined;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errorCode?: string) {
    super(message, 400, errorCode);
  }
}

export class UserAlreadyExistsError extends AppError {
  constructor(loginName: string) {
    super(`Usuário '${loginName}' já existe no Active Directory`, 409, 'USER_ALREADY_EXISTS');
  }
}

export class UserNotFoundError extends AppError {
  constructor(loginName: string) {
    super(`Usuário '${loginName}' não encontrado no Active Directory`, 404, 'USER_NOT_FOUND');
  }
}

export class UserCreationError extends AppError {
  constructor(message: string, errorCode?: string) {
    super(message, 500, errorCode || 'USER_CREATION_ERROR');
  }
}

export class ADConnectionError extends AppError {
  constructor(message: string) {
    super(message, 503, 'AD_CONNECTION_ERROR');
  }
}

export class PasswordValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'PASSWORD_VALIDATION_ERROR');
  }
}

export class UsernameValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'USERNAME_VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
} 