import * as ldap from 'ldapjs';
import config from '../config';
import logger from '../config/logger';

// Declarações para contornar problemas de tipos
declare const Buffer: any;
declare const process: any;
declare const setTimeout: any;
declare const clearTimeout: any;
import { 
  UserCreateRequest, 
  UserInfo, 
  PasswordValidationResponse, 
  LDAPUser 
} from '../types/user';
import { 
  ADConnectionError, 
  UserAlreadyExistsError, 
  UserNotFoundError, 
  UserCreationError, 
  PasswordValidationError 
} from '../types/errors';

export class ADService {
  private client: ldap.Client | null = null;
  
  // Mutex para controlar acesso à conexão LDAP
  private connectionMutex = false;
  private waitingQueue: Array<() => void> = [];

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      this.client = ldap.createClient({
        url: config.ad.server,
        timeout: config.ad.timeout,
        connectTimeout: config.ad.timeout,
        tlsOptions: config.ad.useSSL ? { rejectUnauthorized: false } : undefined
      });

      this.client.on('error', (err) => {
        logger.error('LDAP client error:', err);
      });

      this.client.on('connect', () => {
        logger.info('LDAP client connected successfully');
      });

      this.client.on('disconnect', () => {
        logger.info('LDAP client disconnected');
      });

    } catch (error) {
      logger.error('Failed to initialize LDAP client:', error);
      throw new ADConnectionError('Falha ao inicializar cliente LDAP');
    }
  }

  private async bind(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        logger.error('❌ Cliente LDAP não está inicializado');
        reject(new ADConnectionError('Cliente LDAP não inicializado'));
        return;
      }

      const bindDN = `${config.ad.username}@${config.ad.domain}`;
      logger.info(`🔑 Tentando bind LDAP com DN: ${bindDN}`);
      logger.info(`🌐 Servidor AD: ${config.ad.server}`);
      logger.info(`🏢 Domínio AD: ${config.ad.domain}`);
      
      // Timeout manual para bind LDAP
      const timeoutId = setTimeout(() => {
        logger.error('❌ Timeout no bind LDAP após 15 segundos');
        reject(new ADConnectionError('Timeout na autenticação LDAP'));
      }, 15000);
      
      this.client.bind(bindDN, config.ad.password, (err) => {
        clearTimeout(timeoutId);
        
        if (err) {
          logger.error('❌ Erro de bind LDAP:', err);
          logger.error(`❌ Detalhes do erro: ${err.message}`);
          logger.error(`❌ Código do erro: ${(err as any).code || 'N/A'}`);
          logger.error(`❌ DN usado: ${bindDN}`);
          logger.error(`❌ Servidor: ${config.ad.server}`);
          reject(new ADConnectionError(`Erro de autenticação LDAP: ${err.message}`));
        } else {
          logger.info('✅ Bind LDAP realizado com sucesso');
          resolve();
        }
      });
    });
  }

  private async unbind(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client) {
        resolve();
        return;
      }

      this.client.unbind((err) => {
        if (err) {
          logger.error('LDAP unbind error:', err);
        } else {
          logger.debug('LDAP unbind successful');
        }
        resolve();
      });
    });
  }

  // Métodos para controle do mutex
  private async acquireConnection(): Promise<void> {
    logger.info(`🔒 Tentando adquirir mutex de conexão...`);
    logger.info(`🔒 Mutex status: ${this.connectionMutex ? 'ocupado' : 'livre'}`);
    logger.info(`🔒 Fila de espera: ${this.waitingQueue.length} item(s)`);
    
    if (this.connectionMutex) {
      // Se já está em uso, esperar na fila
      logger.info(`⏳ Mutex ocupado, entrando na fila de espera...`);
      await new Promise<void>((resolve) => {
        this.waitingQueue.push(resolve);
        logger.info(`⏳ Adicionado à fila. Posição: ${this.waitingQueue.length}`);
      });
      logger.info(`✅ Saiu da fila de espera`);
    }
    
    this.connectionMutex = true;
    logger.info(`🔒 Mutex adquirido com sucesso`);
  }

  private releaseConnection(): void {
    logger.info(`🔓 Liberando mutex de conexão...`);
    this.connectionMutex = false;
    const next = this.waitingQueue.shift();
    if (next) {
      logger.info(`🔓 Notificando próximo da fila. Restam: ${this.waitingQueue.length}`);
      next();
    } else {
      logger.info(`🔓 Nenhum item na fila de espera`);
    }
    logger.info(`🔓 Mutex liberado`);
  }

  // Método para forçar reset do serviço em caso de deadlock
  public forceReset(): void {
    logger.warn('🔧 Forçando reset do serviço AD devido a deadlock...');
    
    // Força liberação do mutex
    this.connectionMutex = false;
    
    // Processa toda a fila de espera com erro
    while (this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift();
      if (next) {
        logger.info(`🔧 Liberando item da fila com erro...`);
        next();
      }
    }
    
    // Reinicializa cliente
    try {
      if (this.client) {
        this.client.destroy();
      }
    } catch (error) {
      logger.error('Erro ao destruir cliente durante reset:', error);
    }
    
    this.initializeClient();
    logger.info('✅ Reset do serviço AD concluído');
  }

  private async withConnection<T>(operation: () => Promise<T>): Promise<T> {
    logger.info('🔒 Tentando adquirir conexão LDAP...');
    await this.acquireConnection();
    logger.info('✅ Conexão LDAP adquirida com sucesso');
    
    // Timeout de segurança para toda a operação
    const operationTimeout = setTimeout(() => {
      logger.error('❌ Timeout geral da operação LDAP após 30 segundos');
      logger.error('❌ Forçando liberação do mutex...');
      this.releaseConnection();
    }, 30000);
    
    try {
      logger.info('🔄 Executando operação LDAP...');
      const result = await operation();
      logger.info('✅ Operação LDAP concluída com sucesso');
      clearTimeout(operationTimeout);
      return result;
    } catch (error) {
      clearTimeout(operationTimeout);
      // Em caso de erro, tentar recuperar a conexão
      logger.error('❌ Erro em withConnection, tentando recuperar conexão:', error);
      try {
        logger.info('🔄 Tentando unbind para recuperação...');
        await this.unbind();
        logger.info('🔄 Reinicializando cliente LDAP...');
        this.initializeClient();
        logger.info('✅ Cliente LDAP reinicializado');
      } catch (recoveryError) {
        logger.error('❌ Falha ao recuperar conexão:', recoveryError);
      }
      throw error;
    } finally {
      logger.info('🔓 Liberando conexão LDAP...');
      this.releaseConnection();
      logger.info('✅ Conexão LDAP liberada');
    }
  }

  private async search(baseDN: string, filter: string, attributes?: string[]): Promise<LDAPUser[]> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new ADConnectionError('Cliente LDAP não inicializado'));
        return;
      }

      const options = {
        filter: filter,
        scope: 'sub' as const,
        attributes: attributes || ['*'],
        timeLimit: config.ad.timeout / 1000,
        sizeLimit: 1000
      };

      const results: LDAPUser[] = [];

      this.client.search(baseDN, options, (err, res) => {
        if (err) {
          logger.error('LDAP search error:', err);
          reject(new ADConnectionError(`Erro na busca LDAP: ${err.message}`));
          return;
        }

        res.on('searchEntry', (entry) => {
          try {
            const user: LDAPUser = {
              dn: entry.objectName || '',
              displayName: entry.getAttribute('displayName')?.vals?.[0] || '',
              mail: entry.getAttribute('mail')?.vals?.[0] || '',
              sAMAccountName: entry.getAttribute('sAMAccountName')?.vals?.[0] || '',
              userPrincipalName: entry.getAttribute('userPrincipalName')?.vals?.[0] || '',
              cn: entry.getAttribute('cn')?.vals?.[0] || '',
              givenName: entry.getAttribute('givenName')?.vals?.[0] || '',
              sn: entry.getAttribute('sn')?.vals?.[0] || '',
              objectClass: entry.getAttribute('objectClass')?.vals || [],
              whenCreated: entry.getAttribute('whenCreated')?.vals?.[0] 
                ? new Date(entry.getAttribute('whenCreated').vals[0]) 
                : new Date()
            };
            results.push(user);
          } catch (parseError) {
            logger.error('Error parsing LDAP entry:', parseError);
          }
        });

        res.on('searchReference', (referral) => {
          logger.debug('LDAP search referral:', referral);
        });

        res.on('error', (err) => {
          logger.error('LDAP search result error:', err);
          reject(new ADConnectionError(`Erro na busca LDAP: ${err.message}`));
        });

        res.on('end', (result) => {
          if (result && result.status !== 0) {
            logger.error('LDAP search failed:', result);
            reject(new ADConnectionError(`Busca LDAP falhou: status ${result.status}`));
          } else {
            logger.debug(`LDAP search completed, found ${results.length} results`);
            resolve(results);
          }
        });
      });
    });
  }

  // Métodos internos sem mutex (para uso dentro de withConnection)
  private async _userExists(loginName: string): Promise<boolean> {
    try {
      await this.bind();
      
      const filter = `(sAMAccountName=${loginName})`;
      const results = await this.search(config.ad.baseDN, filter, ['sAMAccountName']);
      
      await this.unbind();
      
      return results.length > 0;
    } catch (error) {
      try {
        await this.unbind();
      } catch (unbindError) {
        logger.error('Error during unbind in _userExists:', unbindError);
      }
      logger.error('Error checking user existence:', error);
      throw error;
    }
  }

  private async _getUserInfo(loginName: string): Promise<UserInfo | null> {
    try {
      await this.bind();
      
      const filter = `(sAMAccountName=${loginName})`;
      const results = await this.search(config.ad.baseDN, filter);
      
      await this.unbind();
      
      if (results.length === 0) {
        return null;
      }

      const user = results[0];
      if (!user) {
        return null;
      }
      return {
        loginName: user.sAMAccountName,
        displayName: user.displayName,
        email: user.mail,
        distinguished_name: user.dn,
        created_at: user.whenCreated
      };
    } catch (error) {
      try {
        await this.unbind();
      } catch (unbindError) {
        logger.error('Error during unbind in _getUserInfo:', unbindError);
      }
      logger.error('Error getting user info:', error);
      throw error;
    }
  }

  // Métodos públicos com mutex
  public async testConnection(): Promise<boolean> {
    return this.withConnection(async () => {
      try {
        logger.debug('Starting connection test');
        
        // Reinicializar cliente para garantir estado limpo
        if (this.client) {
          try {
            this.client.destroy();
          } catch (e) {
            logger.debug('Error destroying client:', e);
          }
        }
        this.initializeClient();
        
        await this.bind();
        logger.debug('Bind successful, testing unbind');
        await this.unbind();
        logger.debug('Connection test completed successfully');
        return true;
      } catch (error) {
        logger.error('AD connection test failed:', error);
        try {
          await this.unbind();
        } catch (unbindError) {
          logger.error('Error during unbind in testConnection:', unbindError);
        }
        return false;
      }
    });
  }

  public async userExists(loginName: string): Promise<boolean> {
    return this.withConnection(async () => {
      return this._userExists(loginName);
    });
  }

  public async getUserInfo(loginName: string): Promise<UserInfo | null> {
    return this.withConnection(async () => {
      return this._getUserInfo(loginName);
    });
  }

  public async createUser(userData: UserCreateRequest): Promise<UserInfo> {
    logger.info(`🚀 Iniciando criação de usuário: ${userData.loginName}`);
    logger.info(`Dados recebidos: ${JSON.stringify({ firstName: userData.firstName, lastName: userData.lastName, loginName: userData.loginName })}`);
    
    return this.withConnection(async () => {
      try {
        logger.info(`🔍 Verificando se usuário ${userData.loginName} já existe...`);
        
        // Verifica se o usuário já existe usando método interno
        const exists = await this._userExists(userData.loginName);
        if (exists) {
          logger.warn(`❌ Usuário ${userData.loginName} já existe no AD`);
          throw new UserAlreadyExistsError(userData.loginName);
        }
        
        logger.info(`✅ Usuário ${userData.loginName} não existe, prosseguindo com criação...`);
        
        logger.info(`🔐 Fazendo bind com usuário de serviço: ${config.ad.username}`);
        await this.bind();
        logger.info(`✅ Bind realizado com sucesso`);

        // Cria o Distinguished Name para o novo usuário
        const userDN = `CN=${userData.firstName} ${userData.lastName},${config.ad.usersOU}`;
        logger.info(`📍 DN do usuário: ${userDN}`);
        
        // Atributos do usuário
        const userEntry = {
          objectClass: ['top', 'person', 'organizationalPerson', 'user'],
          cn: `${userData.firstName} ${userData.lastName}`,
          sn: userData.lastName,
          givenName: userData.firstName,
          displayName: `${userData.firstName} ${userData.lastName}`,
          sAMAccountName: userData.loginName,
          userPrincipalName: `${userData.loginName}@${config.ad.domain}`,
          mail: `${userData.loginName}@${config.ad.domain}`,
          unicodePwd: Buffer.from(`"${userData.password}"`, 'utf16le'),
          userAccountControl: 512 // Conta normal habilitada
        };

        logger.info(`📋 Atributos do usuário preparados`);
        logger.info(`👤 sAMAccountName: ${userEntry.sAMAccountName}`);
        logger.info(`📧 userPrincipalName: ${userEntry.userPrincipalName}`);
        logger.info(`🏢 OU de destino: ${config.ad.usersOU}`);

        // Adiciona o usuário
        logger.info(`➕ Adicionando usuário ao AD...`);
        await this.addUser(userDN, userEntry);
        logger.info(`✅ Usuário adicionado com sucesso ao AD`);
        
        logger.info(`🔓 Fazendo unbind da conexão...`);
        await this.unbind();
        logger.info(`✅ Unbind realizado com sucesso`);

        const userInfo = {
          loginName: userData.loginName,
          displayName: `${userData.firstName} ${userData.lastName}`,
          email: `${userData.loginName}@${config.ad.domain}`,
          distinguished_name: userDN,
          created_at: new Date()
        };

        logger.info(`🎉 Usuário ${userData.loginName} criado com sucesso!`);
        logger.info(`📊 Informações do usuário: ${JSON.stringify(userInfo)}`);

        // Retorna informações do usuário criado
        return userInfo;

      } catch (error) {
        logger.error(`❌ Erro durante criação do usuário ${userData.loginName}:`, error);
        
        try {
          await this.unbind();
          logger.info(`🔓 Unbind de emergência realizado`);
        } catch (unbindError) {
          logger.error(`❌ Erro durante unbind de emergência:`, unbindError);
        }
        
        if (error instanceof UserAlreadyExistsError) {
          throw error;
        }
        
        throw new UserCreationError(`Erro ao criar usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    });
  }

  private async addUser(dn: string, entry: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new ADConnectionError('Cliente LDAP não inicializado'));
        return;
      }

      this.client.add(dn, entry, (err) => {
        if (err) {
          logger.error('LDAP add error:', err);
          reject(new UserCreationError(`Erro ao adicionar usuário: ${err.message}`));
        } else {
          logger.info(`User added successfully: ${dn}`);
          resolve();
        }
      });
    });
  }

  public async validatePasswordStrength(password: string): Promise<PasswordValidationResponse> {
    const requirements = {
      min_length: password.length >= config.password.minLength,
      uppercase: config.password.requireUppercase ? /[A-Z]/.test(password) : true,
      lowercase: config.password.requireLowercase ? /[a-z]/.test(password) : true,
      numbers: config.password.requireNumbers ? /\d/.test(password) : true,
      special_chars: config.password.requireSpecial ? /[!@#$%^&*(),.?":{}|<>]/.test(password) : true
    };

    const valid = Object.values(requirements).every(req => req);
    
    let message = 'Senha válida';
    if (!valid) {
      const issues = [];
      if (!requirements.min_length) issues.push(`pelo menos ${config.password.minLength} caracteres`);
      if (!requirements.uppercase) issues.push('uma letra maiúscula');
      if (!requirements.lowercase) issues.push('uma letra minúscula');
      if (!requirements.numbers) issues.push('um número');
      if (!requirements.special_chars) issues.push('um caractere especial');
      
      message = `Senha deve conter ${issues.join(', ')}`;
    }

    return {
      valid,
      message,
      requirements
    };
  }

  public async suggestUsername(firstName: string, lastName: string): Promise<string> {
    return this.withConnection(async () => {
      const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      let username = baseUsername;
      let counter = 1;

      // Usa método interno para evitar deadlock
      while (await this._userExists(username)) {
        username = `${baseUsername}${counter}`;
        counter++;
        
        // Limita a busca para evitar loop infinito
        if (counter > 999) {
          throw new Error('Não foi possível gerar um nome de usuário único');
        }
      }

      return username;
    });
  }

  public async destroy(): Promise<void> {
    try {
      await this.unbind();
      if (this.client) {
        this.client.destroy();
        this.client = null;
      }
    } catch (error) {
      logger.error('Error destroying AD service:', error);
    }
  }
}

// Singleton instance
export const adService = new ADService();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing AD service...');
  await adService.destroy();
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing AD service...');
  await adService.destroy();
}); 