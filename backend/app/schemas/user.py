from __future__ import annotations
from pydantic import BaseModel, Field, field_validator
import re
from datetime import datetime


class UserCreateRequest(BaseModel):
    """Schema para requisição de criação de usuário"""
    
    firstName: str = Field(..., min_length=2, max_length=50, description="Nome do usuário")
    lastName: str = Field(..., min_length=2, max_length=50, description="Sobrenome do usuário")
    loginName: str = Field(..., min_length=3, max_length=50, description="Nome de login do usuário")
    password: str = Field(..., min_length=8, description="Senha do usuário")
    
    @field_validator('firstName', 'lastName')
    @classmethod
    def validate_names(cls, v):
        if not v.strip():
            raise ValueError('Nome não pode estar vazio')
        if not re.match(r'^[a-zA-ZÀ-ÿ\s\-\']+$', v):
            raise ValueError('Nome contém caracteres inválidos')
        return v.strip().title()
    
    @field_validator('loginName')
    @classmethod
    def validate_login_name(cls, v):
        if not v.strip():
            raise ValueError('Nome de login não pode estar vazio')
        if not re.match(r'^[a-zA-Z0-9._-]+$', v):
            raise ValueError('Nome de login deve conter apenas letras, números, pontos, traços e sublinhados')
        if '..' in v or v.startswith('.') or v.endswith('.'):
            raise ValueError('Nome de login não pode começar/terminar com ponto ou ter pontos consecutivos')
        return v.strip().lower()
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Senha deve ter pelo menos 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Senha deve conter pelo menos uma letra maiúscula')
        if not re.search(r'[a-z]', v):
            raise ValueError('Senha deve conter pelo menos uma letra minúscula')
        if not re.search(r'\d', v):
            raise ValueError('Senha deve conter pelo menos um número')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Senha deve conter pelo menos um caractere especial')
        return v
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "firstName": "João",
                "lastName": "Silva",
                "loginName": "joao.silva",
                "password": "MinhaSenh@123"
            }
        }
    }


class UserCreateResponse(BaseModel):
    """Schema para resposta de criação de usuário"""
    
    success: bool = Field(..., description="Indica se a operação foi bem-sucedida")
    message: str = Field(..., description="Mensagem de resposta")
    user: UserInfo | None = Field(None, description="Informações do usuário criado")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "message": "Usuário criado com sucesso no Active Directory",
                "user": {
                    "loginName": "joao.silva",
                    "displayName": "João Silva",
                    "email": "joao.silva@example.local",
                    "distinguished_name": "CN=João Silva,OU=Users,DC=example,DC=local",
                    "created_at": "2023-12-01T10:00:00Z"
                }
            }
        }
    }


class UserInfo(BaseModel):
    """Schema para informações do usuário"""
    
    loginName: str = Field(..., description="Nome de login do usuário")
    displayName: str = Field(..., description="Nome completo do usuário")
    email: str = Field(..., description="Email do usuário")
    distinguished_name: str = Field(..., description="Distinguished Name no AD")
    created_at: datetime = Field(..., description="Data/hora de criação")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "loginName": "joao.silva",
                "displayName": "João Silva",
                "email": "joao.silva@example.local",
                "distinguished_name": "CN=João Silva,OU=Users,DC=example,DC=local",
                "created_at": "2023-12-01T10:00:00Z"
            }
        }
    }


class UserExistsResponse(BaseModel):
    """Schema para resposta de verificação de existência de usuário"""
    
    exists: bool = Field(..., description="Indica se o usuário existe")
    loginName: str = Field(..., description="Nome de login verificado")
    message: str = Field(..., description="Mensagem de resposta")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "exists": False,
                "loginName": "joao.silva",
                "message": "Usuário não encontrado"
            }
        }
    }


class PasswordValidationRequest(BaseModel):
    """Schema para requisição de validação de senha"""
    
    password: str = Field(..., min_length=1, description="Senha para validação")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "password": "MinhaSenh@123"
            }
        }
    }


class PasswordValidationResponse(BaseModel):
    """Schema para resposta de validação de senha"""
    
    valid: bool = Field(..., description="Indica se a senha é válida")
    message: str = Field(..., description="Mensagem de validação")
    requirements: dict = Field(..., description="Detalhes dos requisitos de senha")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "valid": True,
                "message": "Senha válida",
                "requirements": {
                    "min_length": True,
                    "uppercase": True,
                    "lowercase": True,
                    "numbers": True,
                    "special_chars": True
                }
            }
        }
    }


class ErrorResponse(BaseModel):
    """Schema para resposta de erro"""
    
    detail: str = Field(..., description="Detalhes do erro")
    error_code: str | None = Field(None, description="Código do erro")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "detail": "Usuário já existe no Active Directory",
                "error_code": "USER_ALREADY_EXISTS"
            }
        }
    } 