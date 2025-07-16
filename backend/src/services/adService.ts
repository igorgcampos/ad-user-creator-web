import * as ldap from 'ldapjs';
import config from '../config';
import logger from '../config/logger';
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
        reject(new ADConnectionError('Cliente LDAP não inicializado'));
        return;
      }

      const bindDN = `${config.ad.username}@${config.ad.domain}`;
      
      this.client.bind(bindDN, config.ad.password, (err) => {
        if (err) {
          logger.error('LDAP bind error:', err);
          reject(new ADConnectionError(`Erro de autenticação LDAP: ${err.message}`));
        } else {
          logger.debug('LDAP bind successful');
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
    if (this.connectionMutex) {
      // Se já está em uso, esperar na fila
      await new Promise<void>((resolve) => {
        this.waitingQueue.push(resolve);
      });
    }
    this.connectionMutex = true;
  }

  private releaseConnection(): void {
    this.connectionMutex = false;
    const next = this.waitingQueue.shift();
    if (next) next();
  }

  private async withConnection<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquireConnection();
    try {
      return await operation();
    } catch (error) {
      // Em caso de erro, tentar recuperar a conexão
      logger.error('Error in withConnection, attempting to recover:', error);
      try {
        await this.unbind();
        this.initializeClient();
      } catch (recoveryError) {
        logger.error('Failed to recover connection:', recoveryError);
      }
      throw error;
    } finally {
      this.releaseConnection();
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
    return this.withConnection(async () => {
      try {
        // Verifica se o usuário já existe usando método interno
        const exists = await this._userExists(userData.loginName);
        if (exists) {
          throw new UserAlreadyExistsError(userData.loginName);
        }

        await this.bind();

        // Cria o Distinguished Name para o novo usuário
        const userDN = `CN=${userData.firstName} ${userData.lastName},${config.ad.usersOU}`;
        
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

        // Adiciona o usuário
        await this.addUser(userDN, userEntry);
        
        await this.unbind();

        // Retorna informações do usuário criado
        return {
          loginName: userData.loginName,
          displayName: `${userData.firstName} ${userData.lastName}`,
          email: `${userData.loginName}@${config.ad.domain}`,
          distinguished_name: userDN,
          created_at: new Date()
        };

      } catch (error) {
        await this.unbind();
        logger.error('Error creating user:', error);
        
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