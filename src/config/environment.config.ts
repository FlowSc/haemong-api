import { ConfigService } from '@nestjs/config';

export enum Environment {
  DEVELOPMENT = 'development',
  QA = 'qa',
  PRODUCTION = 'production',
}

export interface EnvironmentConfig {
  nodeEnv: Environment;
  port: number;
  logLevel: string;
  
  // Database
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  
  // JWT
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  
  // OAuth
  google: {
    clientId: string;
    clientSecret: string;
  };
  
  apple: {
    clientId: string;
    teamId: string;
    keyId: string;
    privateKeyPath: string;
  };
  
  // External APIs
  openai: {
    apiKey: string;
    model: string;
  };
  
  replicate: {
    apiToken: string;
  };
  
  // Frontend
  frontendUrl: string;
  
  // Rate Limiting
  rateLimit: {
    short: { ttl: number; limit: number };
    medium: { ttl: number; limit: number };
    long: { ttl: number; limit: number };
  };
  
  // Security
  security: {
    enableCors: boolean;
    enableHelmet: boolean;
    enableValidation: boolean;
  };
  
  // Feature Flags
  features: {
    enableImageGeneration: boolean;
    enableVideoGeneration: boolean;
    enablePremiumFeatures: boolean;
  };
  
  // Environment Specific
  sentry?: {
    dsn: string;
  };
  
  qa?: {
    testUserEmail: string;
    adminEmail: string;
  };
}

export const getEnvironmentConfig = (configService: ConfigService): EnvironmentConfig => {
  const nodeEnv = configService.get<Environment>('NODE_ENV', Environment.DEVELOPMENT);
  
  return {
    nodeEnv,
    port: configService.get<number>('PORT', 3000),
    logLevel: configService.get<string>('LOG_LEVEL', getDefaultLogLevel(nodeEnv)),
    
    supabase: {
      url: configService.get<string>('SUPABASE_URL')!,
      anonKey: configService.get<string>('SUPABASE_ANON_KEY')!,
      serviceRoleKey: configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    },
    
    jwt: {
      secret: configService.get<string>('JWT_SECRET')!,
      expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
      refreshSecret: configService.get<string>('JWT_REFRESH_SECRET')!,
      refreshExpiresIn: configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    },
    
    google: {
      clientId: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
    },
    
    apple: {
      clientId: configService.get<string>('APPLE_CLIENT_ID')!,
      teamId: configService.get<string>('APPLE_TEAM_ID')!,
      keyId: configService.get<string>('APPLE_KEY_ID')!,
      privateKeyPath: configService.get<string>('APPLE_PRIVATE_KEY_PATH')!,
    },
    
    openai: {
      apiKey: configService.get<string>('OPENAI_API_KEY')!,
      model: configService.get<string>('OPENAI_MODEL', 'gpt-3.5-turbo'),
    },
    
    replicate: {
      apiToken: configService.get<string>('REPLICATE_API_TOKEN')!,
    },
    
    frontendUrl: configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    
    rateLimit: {
      short: {
        ttl: configService.get<number>('RATE_LIMIT_SHORT_TTL', 1000),
        limit: configService.get<number>('RATE_LIMIT_SHORT_LIMIT', getDefaultRateLimit(nodeEnv, 'short')),
      },
      medium: {
        ttl: configService.get<number>('RATE_LIMIT_MEDIUM_TTL', 60000),
        limit: configService.get<number>('RATE_LIMIT_MEDIUM_LIMIT', getDefaultRateLimit(nodeEnv, 'medium')),
      },
      long: {
        ttl: configService.get<number>('RATE_LIMIT_LONG_TTL', 900000),
        limit: configService.get<number>('RATE_LIMIT_LONG_LIMIT', getDefaultRateLimit(nodeEnv, 'long')),
      },
    },
    
    security: {
      enableCors: configService.get<boolean>('ENABLE_CORS', true),
      enableHelmet: configService.get<boolean>('ENABLE_HELMET', true),
      enableValidation: configService.get<boolean>('ENABLE_VALIDATION', true),
    },
    
    features: {
      enableImageGeneration: configService.get<boolean>('ENABLE_IMAGE_GENERATION', true),
      enableVideoGeneration: configService.get<boolean>('ENABLE_VIDEO_GENERATION', true),
      enablePremiumFeatures: configService.get<boolean>('ENABLE_PREMIUM_FEATURES', true),
    },
    
    // Optional environment-specific configs
    ...(nodeEnv === Environment.PRODUCTION && {
      sentry: {
        dsn: configService.get<string>('SENTRY_DSN')!,
      },
    }),
    
    ...(nodeEnv === Environment.QA && {
      qa: {
        testUserEmail: configService.get<string>('QA_TEST_USER_EMAIL')!,
        adminEmail: configService.get<string>('QA_ADMIN_EMAIL')!,
      },
    }),
  };
};

function getDefaultLogLevel(env: Environment): string {
  switch (env) {
    case Environment.DEVELOPMENT:
      return 'debug';
    case Environment.QA:
      return 'info';
    case Environment.PRODUCTION:
      return 'warn';
    default:
      return 'info';
  }
}

function getDefaultRateLimit(env: Environment, type: 'short' | 'medium' | 'long'): number {
  const limits = {
    [Environment.DEVELOPMENT]: { short: 20, medium: 200, long: 2000 },
    [Environment.QA]: { short: 15, medium: 150, long: 1500 },
    [Environment.PRODUCTION]: { short: 10, medium: 100, long: 1000 },
  };
  
  return limits[env][type];
}

export const validateEnvironmentConfig = (config: EnvironmentConfig): void => {
  const requiredFields = [
    'supabase.url',
    'supabase.anonKey', 
    'supabase.serviceRoleKey',
    'jwt.secret',
    'jwt.refreshSecret',
    'openai.apiKey',
  ];
  
  for (const field of requiredFields) {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config as any);
    if (!value) {
      throw new Error(`Missing required environment variable for: ${field}`);
    }
  }
  
  // Environment-specific validations
  if (config.nodeEnv === Environment.PRODUCTION) {
    if (config.jwt.secret.includes('CHANGE_THIS')) {
      throw new Error('JWT secrets must be changed in production!');
    }
  }
};