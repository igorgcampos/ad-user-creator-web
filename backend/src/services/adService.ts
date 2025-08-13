import * as ldap from 'ldapjs';
import { Mutex } from 'async-mutex';
import NodeCache from 'node-cache';
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

// LDAP Input Sanitization
function escapeLDAPFilter(input: string): string {
  return input
    .replace(/\\/g, '\\5c')
    .replace(/\*/g, '\\2a')
    .replace(/\(/g, '\\28')
    .replace(/\)/g, '\\29')
    .replace(/\u0000/g, '\\00');
}

// Circuit Breaker Pattern
class CircuitBreaker {
  private failures = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime = 0;

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit breaker moving to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker opened after ${this.failures} failures`);
    }
  }
}

// Connection Pool Management
class LDAPConnectionPool {
  private pool: ldap.Client[] = [];
  private activeConnections = 0;
  private readonly maxConnections = 10;
  private readonly minConnections = 2;
  private readonly connectionMutex = new Mutex();
  private isDestroyed = false;

  async acquire(): Promise<ldap.Client> {
    const release = await this.connectionMutex.acquire();
    try {
      if (this.isDestroyed) {
        throw new Error('Connection pool has been destroyed');
      }

      // Try to get an existing connection from the pool
      if (this.pool.length > 0) {
        const client = this.pool.pop()!;
        if (this.isConnectionHealthy(client)) {
          return client;
        } else {
          this.destroyConnection(client);
        }
      }

      // Create new connection if under limit
      if (this.activeConnections < this.maxConnections) {
        return await this.createConnection();
      }

      // Wait for a connection to become available
      throw new Error('Connection pool exhausted');
    } finally {
      release();
    }
  }

  async release(client: ldap.Client): Promise<void> {
    const release = await this.connectionMutex.acquire();
    try {
      if (this.isDestroyed || !this.isConnectionHealthy(client)) {
        this.destroyConnection(client);
        return;
      }

      if (this.pool.length < this.minConnections) {
        this.pool.push(client);
      } else {
        this.destroyConnection(client);
      }
    } finally {
      release();
    }
  }

  private async createConnection(): Promise<ldap.Client> {
    const client = ldap.createClient({
      url: config.ad.server,
      timeout: config.ad.timeout,
      connectTimeout: config.ad.timeout,
      tlsOptions: config.ad.useSSL ? { rejectUnauthorized: false } : undefined
    });

    this.activeConnections++;
    
    // Set up event listeners with proper cleanup
    const errorHandler = (err: Error) => {
      logger.error('LDAP pool connection error:', { error: err.message });
    };
    
    client.on('error', errorHandler);
    client.on('disconnect', () => {
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    });

    return client;
  }

  private isConnectionHealthy(client: ldap.Client): boolean {
    try {
      return client && typeof client.bind === 'function';
    } catch {
      return false;
    }
  }

  private destroyConnection(client: ldap.Client): void {
    try {
      if (client && typeof client.destroy === 'function') {
        client.destroy();
      }
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    } catch (error) {
      logger.error('Error destroying connection:', error);
    }
  }

  async destroy(): Promise<void> {
    const release = await this.connectionMutex.acquire();
    try {
      this.isDestroyed = true;
      
      // Destroy all pooled connections
      while (this.pool.length > 0) {
        const client = this.pool.pop()!;
        this.destroyConnection(client);
      }
    } finally {
      release();
    }
  }
}

export class ADService {
  private connectionPool: LDAPConnectionPool;
  private circuitBreaker: CircuitBreaker;
  private cache: NodeCache;

  constructor() {
    this.connectionPool = new LDAPConnectionPool();
    this.circuitBreaker = new CircuitBreaker();
    this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 minute cache
  }

  private async withConnection<T>(operation: (client: ldap.Client) => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const client = await this.connectionPool.acquire();
      try {
        return await operation(client);
      } finally {
        await this.connectionPool.release(client);
      }
    });
  }

  private async bind(client: ldap.Client): Promise<void> {
    return new Promise((resolve, reject) => {
      const bindDN = `${config.ad.username}@${config.ad.domain}`;
      logger.info('🔑 Attempting LDAP bind');
      
      // Timeout manual para bind LDAP
      const timeoutId = setTimeout(() => {
        logger.error('❌ LDAP bind timeout after 15 seconds');
        reject(new ADConnectionError('LDAP authentication timeout'));
      }, 15000);
      
      client.bind(bindDN, config.ad.password, (err) => {
        clearTimeout(timeoutId);
        
        if (err) {
          logger.error('❌ LDAP bind error:', { error: err.message, code: (err as any).code });
          reject(new ADConnectionError(`LDAP authentication error: ${err.message}`));
        } else {
          logger.info('✅ LDAP bind successful');
          resolve();
        }
      });
    });
  }

  private async unbind(client: ldap.Client): Promise<void> {
    return new Promise((resolve) => {
      client.unbind((err) => {
        if (err) {
          logger.error('LDAP unbind error:', { error: err.message });
        } else {
          logger.debug('LDAP unbind successful');
        }
        resolve();
      });
    });
  }

  // Método para forçar reset do serviço em caso de problemas
  public async forceReset(): Promise<void> {
    logger.warn('🔧 Forcing AD service reset...');
    
    try {
      await this.connectionPool.destroy();
      this.connectionPool = new LDAPConnectionPool();
      this.circuitBreaker = new CircuitBreaker();
      this.cache.flushAll();
      logger.info('✅ AD service reset completed');
    } catch (error) {
      logger.error('Error during service reset:', error);
      throw error;
    }
  }


  private async search(client: ldap.Client, baseDN: string, filter: string, attributes?: string[]): Promise<LDAPUser[]> {
    return new Promise((resolve, reject) => {
      const options = {
        filter: filter,
        scope: 'sub' as const,
        attributes: attributes || ['*'],
        timeLimit: config.ad.timeout / 1000,
        sizeLimit: 1000
      };

      const results: LDAPUser[] = [];

      client.search(baseDN, options, (err, res) => {
        if (err) {
          logger.error('LDAP search error:', { error: err.message });
          reject(new ADConnectionError(`LDAP search error: ${err.message}`));
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
          logger.error('LDAP search result error:', { error: err.message });
          reject(new ADConnectionError(`LDAP search error: ${err.message}`));
        });

        res.on('end', (result) => {
          if (result && result.status !== 0) {
            logger.error('LDAP search failed:', { status: result.status });
            reject(new ADConnectionError(`LDAP search failed: status ${result.status}`));
          } else {
            logger.debug(`LDAP search completed, found ${results.length} results`);
            resolve(results);
          }
        });
      });
    });
  }

  // Internal methods with caching and LDAP injection prevention
  private async _userExists(client: ldap.Client, loginName: string): Promise<boolean> {
    // Check cache first
    const cacheKey = `user_exists_${loginName}`;
    const cached = this.cache.get<boolean>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      await this.bind(client);
      
      // Escape input to prevent LDAP injection
      const escapedLoginName = escapeLDAPFilter(loginName);
      const filter = `(sAMAccountName=${escapedLoginName})`;
      const results = await this.search(client, config.ad.baseDN, filter, ['sAMAccountName']);
      
      await this.unbind(client);
      
      const exists = results.length > 0;
      // Cache result for 5 minutes
      this.cache.set(cacheKey, exists, 300);
      return exists;
    } catch (error) {
      try {
        await this.unbind(client);
      } catch (unbindError) {
        logger.error('Error during unbind in _userExists:', unbindError);
      }
      logger.error('Error checking user existence:', error);
      throw error;
    }
  }

  private async _getUserInfo(client: ldap.Client, loginName: string): Promise<UserInfo | null> {
    // Check cache first
    const cacheKey = `user_info_${loginName}`;
    const cached = this.cache.get<UserInfo | null>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    try {
      await this.bind(client);
      
      // Escape input to prevent LDAP injection
      const escapedLoginName = escapeLDAPFilter(loginName);
      const filter = `(sAMAccountName=${escapedLoginName})`;
      const results = await this.search(client, config.ad.baseDN, filter);
      
      await this.unbind(client);
      
      if (results.length === 0) {
        // Cache null result for 1 minute
        this.cache.set(cacheKey, null, 60);
        return null;
      }

      const user = results[0];
      if (!user) {
        this.cache.set(cacheKey, null, 60);
        return null;
      }
      
      const userInfo = {
        loginName: user.sAMAccountName,
        displayName: user.displayName,
        email: user.mail,
        distinguished_name: user.dn,
        created_at: user.whenCreated
      };
      
      // Cache result for 10 minutes
      this.cache.set(cacheKey, userInfo, 600);
      return userInfo;
    } catch (error) {
      try {
        await this.unbind(client);
      } catch (unbindError) {
        logger.error('Error during unbind in _getUserInfo:', unbindError);
      }
      logger.error('Error getting user info:', error);
      throw error;
    }
  }

  // Public methods using connection pool
  public async testConnection(): Promise<boolean> {
    return this.withConnection(async (client) => {
      try {
        logger.debug('Starting connection test');
        
        await this.bind(client);
        logger.debug('Bind successful, testing unbind');
        await this.unbind(client);
        logger.debug('Connection test completed successfully');
        return true;
      } catch (error) {
        logger.error('AD connection test failed:', error);
        try {
          await this.unbind(client);
        } catch (unbindError) {
          logger.error('Error during unbind in testConnection:', unbindError);
        }
        return false;
      }
    });
  }

  public async userExists(loginName: string): Promise<boolean> {
    return this.withConnection(async (client) => {
      return this._userExists(client, loginName);
    });
  }

  public async getUserInfo(loginName: string): Promise<UserInfo | null> {
    return this.withConnection(async (client) => {
      return this._getUserInfo(client, loginName);
    });
  }

  public async createUser(userData: UserCreateRequest): Promise<UserInfo> {
    logger.info(`🚀 Starting user creation: ${userData.loginName}`);
    
    return this.withConnection(async (client) => {
      try {
        logger.info(`🔍 Checking if user ${userData.loginName} already exists...`);
        
        // Check if user already exists using internal method
        const exists = await this._userExists(client, userData.loginName);
        if (exists) {
          logger.warn(`❌ User ${userData.loginName} already exists in AD`);
          throw new UserAlreadyExistsError(userData.loginName);
        }
        
        logger.info(`✅ User ${userData.loginName} doesn't exist, proceeding with creation...`);
        
        await this.bind(client);
        logger.info(`✅ Bind successful`);

        // Create Distinguished Name for new user
        const userDN = `CN=${userData.firstName} ${userData.lastName},${config.ad.usersOU}`;
        logger.info(`📍 User DN: ${userDN}`);
        
        // User attributes
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
          userAccountControl: 512 // Normal enabled account
        };

        logger.info(`📋 User attributes prepared`);

        // Add user to AD
        logger.info(`➕ Adding user to AD...`);
        await this.addUser(client, userDN, userEntry);
        logger.info(`✅ User added successfully to AD`);
        
        await this.unbind(client);
        logger.info(`✅ Unbind successful`);

        const userInfo = {
          loginName: userData.loginName,
          displayName: `${userData.firstName} ${userData.lastName}`,
          email: `${userData.loginName}@${config.ad.domain}`,
          distinguished_name: userDN,
          created_at: new Date()
        };

        // Invalidate relevant cache entries
        this.cache.del(`user_exists_${userData.loginName}`);
        this.cache.del(`user_info_${userData.loginName}`);

        logger.info(`🎉 User ${userData.loginName} created successfully!`);
        return userInfo;

      } catch (error) {
        logger.error(`❌ Error during user creation ${userData.loginName}:`, error);
        
        try {
          await this.unbind(client);
        } catch (unbindError) {
          logger.error(`❌ Error during emergency unbind:`, unbindError);
        }
        
        if (error instanceof UserAlreadyExistsError) {
          throw error;
        }
        
        throw new UserCreationError(`Error creating user: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  private async addUser(client: ldap.Client, dn: string, entry: any): Promise<void> {
    return new Promise((resolve, reject) => {
      client.add(dn, entry, (err) => {
        if (err) {
          logger.error('LDAP add error:', { error: err.message });
          reject(new UserCreationError(`Error adding user: ${err.message}`));
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
    // Check cache first
    const cacheKey = `username_suggestion_${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
    const cached = this.cache.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    return this.withConnection(async (client) => {
      const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
      let username = baseUsername;
      let counter = 1;

      // Use internal method to avoid deadlock
      while (await this._userExists(client, username)) {
        username = `${baseUsername}${counter}`;
        counter++;
        
        // Limit search to avoid infinite loop
        if (counter > 999) {
          throw new Error('Could not generate a unique username');
        }
      }

      // Cache suggestion for 1 hour
      this.cache.set(cacheKey, username, 3600);
      return username;
    });
  }

  public async destroy(): Promise<void> {
    try {
      await this.connectionPool.destroy();
      this.cache.flushAll();
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