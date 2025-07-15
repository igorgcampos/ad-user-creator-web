from fastapi import APIRouter

from app.api.routes import users

api_router = APIRouter()

# Inclui as rotas de usuários
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Adicione outras rotas aqui conforme necessário
# api_router.include_router(other_router, prefix="/other", tags=["other"]) 