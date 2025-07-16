import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';

import config from './config';
import logger from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import usersRouter from './routes/users';

const app = express();

// Trust proxy - importante para rate limiting e logging de IP
app.set('trust proxy', 1);

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: false, // Desabilita CSP para API
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Middleware de compressão
app.use(compression());

// Middleware de CORS
app.use(cors({
  origin: (origin, callback) => {
    // Permite requests sem origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    // Se não há origins configurados, permite todos
    if (config.security.corsOrigins.length === 0) {
      return callback(null, true);
    }
    
    // Verifica se a origin está permitida
    if (config.security.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.window * 1000, // Converte para ms
  max: config.rateLimit.requests,
  message: {
    detail: 'Too many requests from this IP, please try again later',
    error_code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Pula rate limiting para health check
    return req.path === '/health';
  }
});

app.use(limiter);

// Middleware de logging
if (config.env !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      }
    }
  }));
}

// Middleware de parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/users', usersRouter);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'AD User Creator API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    health: '/health'
  });
});

// Middleware de tratamento de rotas não encontradas
app.use(notFoundHandler);

// Middleware de tratamento de erros
app.use(errorHandler);

// Inicialização do servidor
const startServer = async (): Promise<void> => {
  try {
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`🌍 Environment: ${config.env}`);
      logger.info(`📖 Health check: http://localhost:${config.port}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Inicia o servidor apenas se este arquivo for executado diretamente
if (require.main === module) {
  startServer();
}

export default app; 