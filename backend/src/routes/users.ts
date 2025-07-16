import { Router, Request, Response } from 'express';
import { adService } from '../services/adService';
import { validateBody, validateParams } from '../middleware/validation';
import { asyncErrorHandler } from '../middleware/errorHandler';
import { 
  userCreateSchema, 
  passwordValidationSchema, 
  loginNameParamSchema 
} from '../schemas/user';
import { 
  UserCreateRequest, 
  UserCreateResponse, 
  UserExistsResponse, 
  PasswordValidationRequest, 
  PasswordValidationResponse,
  ConnectionTestResponse,
  UsernameValidationResponse
} from '../types/user';
import { UserNotFoundError } from '../types/errors';
import logger from '../config/logger';

const router = Router();

// POST /users/create - Criar usuário
router.post('/create', 
  validateBody(userCreateSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const userData: UserCreateRequest = req.body;
    
    logger.info(`Iniciando criação do usuário: ${userData.loginName}`);
    
    const userInfo = await adService.createUser(userData);
    
    const response: UserCreateResponse = {
      success: true,
      message: `Usuário '${userData.loginName}' criado com sucesso no Active Directory`,
      user: userInfo
    };
    
    logger.info(`Usuário '${userData.loginName}' criado com sucesso`);
    res.status(201).json(response);
  })
);

// GET /users/exists/:loginName - Verificar se usuário existe
router.get('/exists/:loginName',
  validateParams(loginNameParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { loginName } = req.params;
    
    logger.info(`Verificando existência do usuário: ${loginName}`);
    
    const exists = await adService.userExists(loginName);
    
    const response: UserExistsResponse = {
      exists,
      loginName,
      message: exists ? 'Usuário encontrado' : 'Usuário não encontrado'
    };
    
    logger.info(`Verificação de existência do usuário ${loginName}: ${exists ? 'existe' : 'não existe'}`);
    res.json(response);
  })
);

// GET /users/info/:loginName - Obter informações do usuário
router.get('/info/:loginName',
  validateParams(loginNameParamSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { loginName } = req.params;
    
    logger.info(`Obtendo informações do usuário: ${loginName}`);
    
    const userInfo = await adService.getUserInfo(loginName);
    
    if (!userInfo) {
      throw new UserNotFoundError(loginName);
    }
    
    logger.info(`Informações do usuário ${loginName} obtidas com sucesso`);
    res.json(userInfo);
  })
);

// POST /users/validate-password - Validar força da senha
router.post('/validate-password',
  validateBody(passwordValidationSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { password }: PasswordValidationRequest = req.body;
    
    logger.info('Validando força da senha');
    
    const validation = await adService.validatePasswordStrength(password);
    
    const response: PasswordValidationResponse = validation;
    
    logger.info(`Validação de senha: ${validation.valid ? 'válida' : 'inválida'}`);
    res.json(response);
  })
);

// GET /users/suggest-username/:firstName/:lastName - Sugerir nome de login
router.get('/suggest-username/:firstName/:lastName',
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { firstName, lastName } = req.params;
    
    logger.info(`Gerando sugestão de nome de login para: ${firstName} ${lastName}`);
    
    const suggestedUsername = await adService.suggestUsername(firstName, lastName);
    
    const response: UsernameValidationResponse = {
      suggested_username: suggestedUsername,
      message: `Nome de login sugerido: ${suggestedUsername}`
    };
    
    logger.info(`Sugestão de nome de login gerada: ${suggestedUsername}`);
    res.json(response);
  })
);

// GET /users/connection-test - Testar conexão com AD
router.get('/connection-test',
  asyncErrorHandler(async (req: Request, res: Response) => {
    logger.info('Testando conexão com Active Directory');
    
    const connectionOk = await adService.testConnection();
    
    const response: ConnectionTestResponse = {
      connection_status: connectionOk ? 'success' : 'failed',
      message: connectionOk 
        ? 'Conexão com Active Directory estabelecida com sucesso'
        : 'Falha na conexão com Active Directory',
      timestamp: new Date().toISOString()
    };
    
    logger.info('Teste de conexão com AD realizado com sucesso');
    res.json(response);
  })
);

export default router; 