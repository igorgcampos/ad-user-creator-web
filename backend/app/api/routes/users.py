from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
import logging
from typing import Dict, Any
from datetime import datetime

from app.schemas.user import (
    UserCreateRequest,
    UserCreateResponse,
    UserExistsResponse,
    PasswordValidationRequest,
    PasswordValidationResponse,
    UserInfo
)
from app.services.ad_service import ad_service
from app.core.exceptions import (
    ADException,
    ValidationException,
    UserAlreadyExistsException,
    UserCreationException,
    ADConnectionException,
    PasswordValidationException,
    UsernameValidationException
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/create",
    response_model=UserCreateResponse,
    summary="Criar usuário no Active Directory",
    description="Cria um novo usuário no Active Directory com validação completa",
    responses={
        201: {"description": "Usuário criado com sucesso"},
        400: {"description": "Dados inválidos"},
        409: {"description": "Usuário já existe"},
        503: {"description": "Erro de conexão com AD"}
    }
)
async def create_user(user_data: UserCreateRequest):
    """Cria um novo usuário no Active Directory"""
    try:
        logger.info(f"Iniciando criação do usuário: {user_data.loginName}")
        
        # Cria usuário no AD
        user_info = await ad_service.create_user(user_data)
        
        # Resposta de sucesso
        response = UserCreateResponse(
            success=True,
            message=f"Usuário '{user_data.loginName}' criado com sucesso no Active Directory",
            user=user_info
        )
        
        logger.info(f"Usuário '{user_data.loginName}' criado com sucesso")
        return JSONResponse(content=response.dict(), status_code=201)
        
    except UserAlreadyExistsException as e:
        logger.warning(f"Tentativa de criar usuário existente: {user_data.loginName}")
        raise HTTPException(status_code=409, detail=str(e))
    
    except (PasswordValidationException, UsernameValidationException) as e:
        logger.warning(f"Erro de validação para usuário {user_data.loginName}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except ADConnectionException as e:
        logger.error(f"Erro de conexão AD ao criar usuário {user_data.loginName}: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    
    except UserCreationException as e:
        logger.error(f"Erro ao criar usuário {user_data.loginName}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    except Exception as e:
        logger.error(f"Erro inesperado ao criar usuário {user_data.loginName}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get(
    "/exists/{login_name}",
    response_model=UserExistsResponse,
    summary="Verificar se usuário existe",
    description="Verifica se um usuário já existe no Active Directory",
    responses={
        200: {"description": "Verificação realizada com sucesso"},
        503: {"description": "Erro de conexão com AD"}
    }
)
async def check_user_exists(login_name: str):
    """Verifica se um usuário existe no Active Directory"""
    try:
        logger.info(f"Verificando existência do usuário: {login_name}")
        
        exists = await ad_service.user_exists(login_name)
        
        response = UserExistsResponse(
            exists=exists,
            loginName=login_name,
            message="Usuário encontrado" if exists else "Usuário não encontrado"
        )
        
        logger.info(f"Verificação de existência do usuário {login_name}: {'existe' if exists else 'não existe'}")
        return response
        
    except ADConnectionException as e:
        logger.error(f"Erro de conexão AD ao verificar usuário {login_name}: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    
    except Exception as e:
        logger.error(f"Erro inesperado ao verificar usuário {login_name}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get(
    "/info/{login_name}",
    response_model=UserInfo,
    summary="Obter informações do usuário",
    description="Obtém informações detalhadas de um usuário do Active Directory",
    responses={
        200: {"description": "Informações obtidas com sucesso"},
        404: {"description": "Usuário não encontrado"},
        503: {"description": "Erro de conexão com AD"}
    }
)
async def get_user_info(login_name: str):
    """Obtém informações de um usuário do Active Directory"""
    try:
        logger.info(f"Obtendo informações do usuário: {login_name}")
        
        user_info = await ad_service.get_user_info(login_name)
        
        if not user_info:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        logger.info(f"Informações do usuário {login_name} obtidas com sucesso")
        return user_info
        
    except ADConnectionException as e:
        logger.error(f"Erro de conexão AD ao obter informações do usuário {login_name}: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"Erro inesperado ao obter informações do usuário {login_name}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.post(
    "/validate-password",
    response_model=PasswordValidationResponse,
    summary="Validar força da senha",
    description="Valida se uma senha atende aos requisitos de segurança",
    responses={
        200: {"description": "Validação realizada com sucesso"}
    }
)
async def validate_password(password_data: PasswordValidationRequest):
    """Valida a força de uma senha"""
    try:
        logger.info("Validando força da senha")
        
        validation_result = await ad_service.validate_password_strength(password_data.password)
        
        response = PasswordValidationResponse(**validation_result)
        
        logger.info(f"Validação de senha: {'válida' if validation_result['valid'] else 'inválida'}")
        return response
        
    except Exception as e:
        logger.error(f"Erro ao validar senha: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get(
    "/suggest-username/{first_name}/{last_name}",
    response_model=Dict[str, str],
    summary="Sugerir nome de login",
    description="Sugere um nome de login baseado no nome e sobrenome",
    responses={
        200: {"description": "Sugestão gerada com sucesso"},
        503: {"description": "Erro de conexão com AD"}
    }
)
async def suggest_username(first_name: str, last_name: str):
    """Sugere um nome de login baseado no nome e sobrenome"""
    try:
        logger.info(f"Gerando sugestão de nome de login para: {first_name} {last_name}")
        
        suggestion = await ad_service.suggest_username(first_name, last_name)
        
        response = {
            "suggested_username": suggestion,
            "message": f"Nome de login sugerido: {suggestion}"
        }
        
        logger.info(f"Sugestão de nome de login gerada: {suggestion}")
        return response
        
    except ADConnectionException as e:
        logger.error(f"Erro de conexão AD ao sugerir nome de login: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    
    except Exception as e:
        logger.error(f"Erro inesperado ao sugerir nome de login: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")


@router.get(
    "/connection-test",
    response_model=Dict[str, Any],
    summary="Testar conexão com AD",
    description="Testa a conexão com o Active Directory",
    responses={
        200: {"description": "Conexão testada com sucesso"},
        503: {"description": "Erro de conexão com AD"}
    }
)
async def test_ad_connection():
    """Testa a conexão com o Active Directory"""
    try:
        logger.info("Testando conexão com Active Directory")
        
        connection_ok = await ad_service.test_connection()
        
        response = {
            "connection_status": "success" if connection_ok else "failed",
            "message": "Conexão com Active Directory estabelecida com sucesso" if connection_ok else "Falha na conexão",
            "timestamp": str(datetime.now())
        }
        
        logger.info("Teste de conexão com AD realizado com sucesso")
        return response
        
    except ADConnectionException as e:
        logger.error(f"Erro de conexão AD no teste: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    
    except Exception as e:
        logger.error(f"Erro inesperado no teste de conexão: {e}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor") 