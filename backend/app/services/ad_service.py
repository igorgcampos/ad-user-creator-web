import logging
import asyncio
from typing import Dict, Any
from datetime import datetime
import hashlib
import json
from pathlib import Path

from app.core.config import settings
from app.core.exceptions import (
    ADConnectionException,
    UserAlreadyExistsException,
    UserCreationException,
    PasswordValidationException,
    UsernameValidationException
)
from app.schemas.user import UserCreateRequest, UserInfo


logger = logging.getLogger(__name__)


class ADService:
    """Serviço simulado para integração com Active Directory"""
    
    def __init__(self):
        self.users_db_path = Path("data/users.json")
        self.users_db_path.parent.mkdir(exist_ok=True)
        self._load_users_db()
    
    def _load_users_db(self):
        """Carrega base de dados simulada de usuários"""
        try:
            if self.users_db_path.exists():
                with open(self.users_db_path, 'r', encoding='utf-8') as f:
                    self.users_db = json.load(f)
            else:
                self.users_db = {}
                self._save_users_db()
        except Exception as e:
            logger.error(f"Erro ao carregar base de dados de usuários: {e}")
            self.users_db = {}
    
    def _save_users_db(self):
        """Salva base de dados simulada de usuários"""
        try:
            with open(self.users_db_path, 'w', encoding='utf-8') as f:
                json.dump(self.users_db, f, ensure_ascii=False, indent=2, default=str)
        except Exception as e:
            logger.error(f"Erro ao salvar base de dados de usuários: {e}")
    
    async def test_connection(self) -> bool:
        """Testa conexão com Active Directory"""
        try:
            logger.info("Testando conexão com Active Directory...")
            # Simula latência de rede
            await asyncio.sleep(0.1)
            
            # Simula falha de conexão em 5% dos casos para teste
            import random
            if random.random() < 0.05:
                raise ADConnectionException("Falha na conexão com o servidor AD")
            
            logger.info("Conexão com Active Directory estabelecida com sucesso")
            return True
            
        except Exception as e:
            logger.error(f"Erro na conexão com Active Directory: {e}")
            raise ADConnectionException(f"Erro de conexão: {str(e)}")
    
    async def user_exists(self, login_name: str) -> bool:
        """Verifica se usuário existe no Active Directory"""
        try:
            await self.test_connection()
            
            # Normaliza nome de login
            login_name = login_name.lower().strip()
            
            # Verifica na base de dados simulada
            exists = login_name in self.users_db
            
            logger.info(f"Verificação de existência do usuário '{login_name}': {'existe' if exists else 'não existe'}")
            return exists
            
        except ADConnectionException:
            raise
        except Exception as e:
            logger.error(f"Erro ao verificar existência do usuário '{login_name}': {e}")
            raise ADConnectionException(f"Erro na verificação de usuário: {str(e)}")
    
    async def create_user(self, user_data: UserCreateRequest) -> UserInfo:
        """Cria usuário no Active Directory"""
        try:
            await self.test_connection()
            
            # Verifica se usuário já existe
            if await self.user_exists(user_data.loginName):
                raise UserAlreadyExistsException(user_data.loginName)
            
            # Valida dados adicionais
            await self._validate_user_data(user_data)
            
            # Simula tempo de criação no AD
            await asyncio.sleep(0.2)
            
            # Cria usuário na base de dados simulada
            user_info = await self._create_user_in_db(user_data)
            
            logger.info(f"Usuário '{user_data.loginName}' criado com sucesso no Active Directory")
            return user_info
            
        except (ADConnectionException, UserAlreadyExistsException, PasswordValidationException, UsernameValidationException):
            raise
        except Exception as e:
            logger.error(f"Erro ao criar usuário '{user_data.loginName}': {e}")
            raise UserCreationException(f"Falha na criação: {str(e)}")
    
    async def _validate_user_data(self, user_data: UserCreateRequest):
        """Valida dados do usuário antes da criação"""
        
        # Valida nome de login contra lista de nomes reservados
        reserved_names = ['admin', 'administrator', 'root', 'system', 'guest', 'public']
        if user_data.loginName.lower() in reserved_names:
            raise UsernameValidationException("Nome de login está reservado")
        
        # Valida se nome de login não contém palavras proibidas
        forbidden_words = ['test', 'temp', 'delete', 'remove']
        if any(word in user_data.loginName.lower() for word in forbidden_words):
            raise UsernameValidationException("Nome de login contém palavras não permitidas")
        
        # Valida se senha não contém informações pessoais
        if user_data.firstName.lower() in user_data.password.lower():
            raise PasswordValidationException("Senha não pode conter o nome do usuário")
        
        if user_data.lastName.lower() in user_data.password.lower():
            raise PasswordValidationException("Senha não pode conter o sobrenome do usuário")
        
        if user_data.loginName.lower() in user_data.password.lower():
            raise PasswordValidationException("Senha não pode conter o nome de login")
    
    async def _create_user_in_db(self, user_data: UserCreateRequest) -> UserInfo:
        """Cria usuário na base de dados simulada"""
        
        # Gera hash da senha (em produção, usar bcrypt ou similar)
        password_hash = hashlib.sha256(user_data.password.encode()).hexdigest()
        
        # Cria informações do usuário
        display_name = f"{user_data.firstName} {user_data.lastName}"
        email = f"{user_data.loginName}@{settings.AD_DOMAIN}"
        distinguished_name = f"CN={display_name},{settings.AD_USERS_OU}"
        created_at = datetime.now()
        
        # Salva na base de dados simulada
        self.users_db[user_data.loginName] = {
            "loginName": user_data.loginName,
            "firstName": user_data.firstName,
            "lastName": user_data.lastName,
            "displayName": display_name,
            "email": email,
            "password_hash": password_hash,
            "distinguished_name": distinguished_name,
            "created_at": created_at.isoformat(),
            "enabled": True,
            "must_change_password": False
        }
        
        # Salva arquivo
        self._save_users_db()
        
        return UserInfo(
            loginName=user_data.loginName,
            displayName=display_name,
            email=email,
            distinguished_name=distinguished_name,
            created_at=created_at
        )
    
    async def get_user_info(self, login_name: str) -> UserInfo | None:
        """Obtém informações do usuário do Active Directory"""
        try:
            await self.test_connection()
            
            login_name = login_name.lower().strip()
            
            if login_name not in self.users_db:
                return None
            
            user_data = self.users_db[login_name]
            
            return UserInfo(
                loginName=user_data["loginName"],
                displayName=user_data["displayName"],
                email=user_data["email"],
                distinguished_name=user_data["distinguished_name"],
                created_at=datetime.fromisoformat(user_data["created_at"])
            )
            
        except ADConnectionException:
            raise
        except Exception as e:
            logger.error(f"Erro ao obter informações do usuário '{login_name}': {e}")
            raise ADConnectionException(f"Erro na consulta: {str(e)}")
    
    async def validate_password_strength(self, password: str) -> Dict[str, Any]:
        """Valida força da senha"""
        requirements = {
            "min_length": len(password) >= settings.PASSWORD_MIN_LENGTH,
            "uppercase": any(c.isupper() for c in password),
            "lowercase": any(c.islower() for c in password),
            "numbers": any(c.isdigit() for c in password),
            "special_chars": any(c in "!@#$%^&*(),.?\":{}|<>" for c in password)
        }
        
        valid = all(requirements.values())
        
        if not valid:
            missing = [req for req, met in requirements.items() if not met]
            message = f"Senha não atende aos requisitos: {', '.join(missing)}"
        else:
            message = "Senha válida"
        
        return {
            "valid": valid,
            "message": message,
            "requirements": requirements
        }
    
    async def suggest_username(self, first_name: str, last_name: str) -> str:
        """Sugere nome de login baseado no nome e sobrenome"""
        base_suggestion = f"{first_name.lower()}.{last_name.lower()}"
        
        # Remove caracteres especiais e acentos
        import unicodedata
        base_suggestion = unicodedata.normalize('NFKD', base_suggestion)
        base_suggestion = ''.join(c for c in base_suggestion if c.isalnum() or c in '.-_')
        
        # Verifica se já existe
        if not await self.user_exists(base_suggestion):
            return base_suggestion
        
        # Se existe, tenta variações
        for i in range(1, 100):
            suggestion = f"{base_suggestion}{i}"
            if not await self.user_exists(suggestion):
                return suggestion
        
        # Se não encontrou, retorna com timestamp
        from time import time
        return f"{base_suggestion}{int(time())}"


# Instância global do serviço AD
ad_service = ADService() 