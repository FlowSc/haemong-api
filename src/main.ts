import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import helmet from 'helmet';
import * as cors from 'cors';
import * as dotenv from 'dotenv';

import { createWinstonConfig } from './config/logger.config';
import { createCorsConfig, createHelmetConfig } from './config/security.config';
import { getEnvironmentConfig, validateEnvironmentConfig, Environment } from './config/environment.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// Load environment-specific config
const nodeEnv = process.env.NODE_ENV as Environment || Environment.DEVELOPMENT;
const envFile = `.env.${nodeEnv}`;

dotenv.config({ path: envFile });
dotenv.config(); // Fallback to .env

async function bootstrap() {
  // Get environment configuration
  const tempApp = await NestFactory.create(AppModule, { logger: false });
  const configService = tempApp.get(ConfigService);
  const envConfig = getEnvironmentConfig(configService);
  
  // Validate configuration
  try {
    validateEnvironmentConfig(envConfig);
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    process.exit(1);
  }
  
  await tempApp.close();

  // Create logger with environment config
  const logger = WinstonModule.createLogger(
    createWinstonConfig(envConfig.nodeEnv, envConfig.logLevel)
  );
  
  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // Get services
  const actualConfigService = app.get(ConfigService);
  const actualEnvConfig = getEnvironmentConfig(actualConfigService);

  // Security middlewares (conditionally enabled)
  if (actualEnvConfig.security.enableHelmet) {
    app.use(helmet(createHelmetConfig(actualEnvConfig)));
  }
  
  if (actualEnvConfig.security.enableCors) {
    app.use(cors(createCorsConfig(actualEnvConfig)));
  }

  // Global pipes for validation
  if (actualEnvConfig.security.enableValidation) {
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        disableErrorMessages: actualEnvConfig.nodeEnv === Environment.PRODUCTION,
        validationError: {
          target: false,
          value: false,
        },
      }),
    );
  }

  // Global filters and interceptors
  const globalExceptionFilter = app.get(GlobalExceptionFilter);
  const loggingInterceptor = app.get(LoggingInterceptor);
  
  app.useGlobalFilters(globalExceptionFilter);
  app.useGlobalInterceptors(loggingInterceptor);

  // Trust proxy for Heroku
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Add environment header to all responses
  app.use((req, res, next) => {
    res.setHeader('X-Environment', actualEnvConfig.nodeEnv);
    next();
  });
  
  await app.listen(actualEnvConfig.port);
  
  const appLogger = new Logger('Bootstrap');
  appLogger.log(`🚀 Application is running on port ${actualEnvConfig.port}`);
  appLogger.log(`🌍 Environment: ${actualEnvConfig.nodeEnv}`);
  appLogger.log(`📊 Log Level: ${actualEnvConfig.logLevel}`);
  appLogger.log(`🔒 Security: Helmet(${actualEnvConfig.security.enableHelmet}), CORS(${actualEnvConfig.security.enableCors}), Validation(${actualEnvConfig.security.enableValidation})`);
  appLogger.log(`⚡ Rate Limits: ${actualEnvConfig.rateLimit.short.limit}/sec, ${actualEnvConfig.rateLimit.medium.limit}/min`);
  appLogger.log(`🎯 Frontend URL: ${actualEnvConfig.frontendUrl}`);
  appLogger.log(`📝 Logging: Winston with structured logging enabled`);
  
  if (actualEnvConfig.nodeEnv === Environment.DEVELOPMENT) {
    appLogger.log(`🛠️  Development mode: Enhanced logging and lenient rate limits`);
  } else if (actualEnvConfig.nodeEnv === Environment.QA) {
    appLogger.log(`🧪 QA mode: Production-like settings with enhanced logging`);
  } else {
    appLogger.log(`🏭 Production mode: Optimized for performance and security`);
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
