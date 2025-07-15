from fastapi import HTTPException


class ADException(HTTPException):
    """Base exception for Active Directory operations"""
    
    def __init__(self, detail: str, status_code: int = 500, error_code: str = "AD_ERROR"):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code


class ValidationException(Exception):
    """Exception for validation errors"""
    
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class UserAlreadyExistsException(ADException):
    """Exception when trying to create a user that already exists"""
    
    def __init__(self, username: str):
        super().__init__(
            detail=f"Usuário '{username}' já existe no Active Directory",
            status_code=409,
            error_code="USER_ALREADY_EXISTS"
        )


class UserCreationException(ADException):
    """Exception when user creation fails"""
    
    def __init__(self, detail: str):
        super().__init__(
            detail=f"Erro ao criar usuário: {detail}",
            status_code=500,
            error_code="USER_CREATION_FAILED"
        )


class ADConnectionException(ADException):
    """Exception when AD connection fails"""
    
    def __init__(self, detail: str = "Não foi possível conectar ao Active Directory"):
        super().__init__(
            detail=detail,
            status_code=503,
            error_code="AD_CONNECTION_FAILED"
        )


class PasswordValidationException(ValidationException):
    """Exception for password validation errors"""
    
    def __init__(self, detail: str):
        super().__init__(f"Senha inválida: {detail}")


class UsernameValidationException(ValidationException):
    """Exception for username validation errors"""
    
    def __init__(self, detail: str):
        super().__init__(f"Nome de usuário inválido: {detail}") 