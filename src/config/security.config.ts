import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { Environment, EnvironmentConfig } from './environment.config';

export const createThrottlerConfig = (config: EnvironmentConfig): ThrottlerModuleOptions => [
  {
    name: 'short',
    ttl: config.rateLimit.short.ttl,
    limit: config.rateLimit.short.limit,
  },
  {
    name: 'medium', 
    ttl: config.rateLimit.medium.ttl,
    limit: config.rateLimit.medium.limit,
  },
  {
    name: 'long',
    ttl: config.rateLimit.long.ttl,
    limit: config.rateLimit.long.limit,
  },
];

export const createCorsConfig = (config: EnvironmentConfig) => {
  const allowedOrigins = [config.frontendUrl];
  
  // Add localhost for development
  if (config.nodeEnv === Environment.DEVELOPMENT) {
    allowedOrigins.push('http://localhost:3000', 'https://localhost:3000');
  }

  return {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Request-ID',
      'X-Environment',
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
};

export const createHelmetConfig = (config: EnvironmentConfig) => {
  const baseConfig = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  };

  // Add HSTS only for production
  if (config.nodeEnv === Environment.PRODUCTION) {
    return {
      ...baseConfig,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    };
  }

  return baseConfig;
};

// Legacy exports for backward compatibility
export const throttlerConfig: ThrottlerModuleOptions = [
  {
    name: 'short',
    ttl: 1000,
    limit: 10,
  },
  {
    name: 'medium',
    ttl: 60000,
    limit: 100,
  },
  {
    name: 'long',
    ttl: 900000,
    limit: 1000,
  },
];

export const corsConfig = {
  origin: ['http://localhost:3000', 'https://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
};