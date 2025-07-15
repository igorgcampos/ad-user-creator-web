import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Testa o endpoint de health check"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "ad-user-creator-api"}


def test_create_user_success():
    """Testa criação de usuário com sucesso"""
    user_data = {
        "firstName": "João",
        "lastName": "Silva",
        "loginName": "joao.silva.test",
        "password": "MinhaSenh@123"
    }
    
    response = client.post("/api/v1/users/create", json=user_data)
    assert response.status_code == 201
    
    data = response.json()
    assert data["success"] is True
    assert "joao.silva.test" in data["message"]
    assert data["user"]["loginName"] == "joao.silva.test"


def test_create_user_invalid_data():
    """Testa criação de usuário com dados inválidos"""
    user_data = {
        "firstName": "",
        "lastName": "Silva",
        "loginName": "joao.silva",
        "password": "123"  # Senha muito fraca
    }
    
    response = client.post("/api/v1/users/create", json=user_data)
    assert response.status_code == 422


def test_create_user_duplicate():
    """Testa criação de usuário duplicado"""
    user_data = {
        "firstName": "João",
        "lastName": "Silva",
        "loginName": "joao.silva.duplicate",
        "password": "MinhaSenh@123"
    }
    
    # Cria usuário primeira vez
    response1 = client.post("/api/v1/users/create", json=user_data)
    assert response1.status_code == 201
    
    # Tenta criar novamente
    response2 = client.post("/api/v1/users/create", json=user_data)
    assert response2.status_code == 409


def test_user_exists():
    """Testa verificação de existência de usuário"""
    # Cria usuário primeiro
    user_data = {
        "firstName": "João",
        "lastName": "Silva",
        "loginName": "joao.silva.exists",
        "password": "MinhaSenh@123"
    }
    client.post("/api/v1/users/create", json=user_data)
    
    # Verifica se existe
    response = client.get("/api/v1/users/exists/joao.silva.exists")
    assert response.status_code == 200
    
    data = response.json()
    assert data["exists"] is True
    assert data["loginName"] == "joao.silva.exists"


def test_user_not_exists():
    """Testa verificação de usuário que não existe"""
    response = client.get("/api/v1/users/exists/usuario.inexistente")
    assert response.status_code == 200
    
    data = response.json()
    assert data["exists"] is False


def test_validate_password():
    """Testa validação de senha"""
    password_data = {"password": "MinhaSenh@123"}
    
    response = client.post("/api/v1/users/validate-password", json=password_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["valid"] is True
    assert data["requirements"]["min_length"] is True


def test_validate_weak_password():
    """Testa validação de senha fraca"""
    password_data = {"password": "123"}
    
    response = client.post("/api/v1/users/validate-password", json=password_data)
    assert response.status_code == 200
    
    data = response.json()
    assert data["valid"] is False


def test_suggest_username():
    """Testa sugestão de nome de usuário"""
    response = client.get("/api/v1/users/suggest-username/João/Silva")
    assert response.status_code == 200
    
    data = response.json()
    assert "suggested_username" in data
    assert "joao.silva" in data["suggested_username"]


def test_connection_test():
    """Testa endpoint de teste de conexão"""
    response = client.get("/api/v1/users/connection-test")
    assert response.status_code == 200
    
    data = response.json()
    assert "connection_status" in data
    assert data["connection_status"] in ["success", "failed"]


def test_get_user_info():
    """Testa obtenção de informações do usuário"""
    # Cria usuário primeiro
    user_data = {
        "firstName": "João",
        "lastName": "Silva",
        "loginName": "joao.silva.info",
        "password": "MinhaSenh@123"
    }
    client.post("/api/v1/users/create", json=user_data)
    
    # Obtém informações
    response = client.get("/api/v1/users/info/joao.silva.info")
    assert response.status_code == 200
    
    data = response.json()
    assert data["loginName"] == "joao.silva.info"
    assert data["displayName"] == "João Silva"


def test_get_user_info_not_found():
    """Testa obtenção de informações de usuário inexistente"""
    response = client.get("/api/v1/users/info/usuario.inexistente")
    assert response.status_code == 404 