import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';

// Carrega variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Schema de validação para variáveis de ambiente
const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(8000),
  
  // Active Directory
  AD_SERVER: Joi.string().required(),
  AD_DOMAIN: Joi.string().required(),
  AD_BASE_DN: Joi.string().required(),
  AD_USERNAME: Joi.string().required(),
  AD_PASSWORD: Joi.string().required(),
  AD_USE_SSL: Joi.boolean().default(true),
  AD_USERS_OU: Joi.string().required(),
  AD_TIMEOUT: Joi.number().default(10000),
  
  // Security
  SECRET_KEY: Joi.string().required(),
  BACKEND_CORS_ORIGINS: Joi.string().default(''),
  
  // Rate limiting
  RATE_LIMIT_REQUESTS: Joi.number().default(100),
  RATE_LIMIT_WINDOW: Joi.number().default(3600),
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  
  // Password requirements
  MIN_PASSWORD_LENGTH: Joi.number().default(8),
  PASSWORD_REQUIRE_UPPERCASE: Joi.boolean().default(true),
  PASSWORD_REQUIRE_LOWERCASE: Joi.boolean().default(true),
  PASSWORD_REQUIRE_NUMBERS: Joi.boolean().default(true),
  PASSWORD_REQUIRE_SPECIAL: Joi.boolean().default(true),
}).unknown();

const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Configuração da aplicação
export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  
  // Active Directory
  ad: {
    server: envVars.AD_SERVER,
    domain: envVars.AD_DOMAIN,
    baseDN: envVars.AD_BASE_DN,
    username: envVars.AD_USERNAME,
    password: envVars.AD_PASSWORD,
    useSSL: envVars.AD_USE_SSL,
    usersOU: envVars.AD_USERS_OU,
    timeout: envVars.AD_TIMEOUT,
  },
  
  // Security
  security: {
    secretKey: envVars.SECRET_KEY,
    corsOrigins: envVars.BACKEND_CORS_ORIGINS
      ? envVars.BACKEND_CORS_ORIGINS.split(',').map((origin: string) => origin.trim())
      : [],
  },
  
  // Rate limiting
  rateLimit: {
    requests: envVars.RATE_LIMIT_REQUESTS,
    window: envVars.RATE_LIMIT_WINDOW,
  },
  
  // Logging
  logging: {
    level: envVars.LOG_LEVEL,
  },
  
  // Password requirements
  password: {
    minLength: envVars.MIN_PASSWORD_LENGTH,
    requireUppercase: envVars.PASSWORD_REQUIRE_UPPERCASE,
    requireLowercase: envVars.PASSWORD_REQUIRE_LOWERCASE,
    requireNumbers: envVars.PASSWORD_REQUIRE_NUMBERS,
    requireSpecial: envVars.PASSWORD_REQUIRE_SPECIAL,
  },
};

export default config; 