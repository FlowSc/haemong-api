import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { Environment } from './environment.config';

const { combine, timestamp, printf, errors, json, colorize } = winston.format;

// Custom format for console logging
const consoleFormat = printf(({ timestamp, level, message, context, trace, env }) => {
  const envPrefix = env ? `[${String(env).toUpperCase()}] ` : '';
  return `${timestamp} ${envPrefix}[${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
});

// Custom format for file logging
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json()
);

export const createWinstonConfig = (
  env: Environment = Environment.DEVELOPMENT,
  logLevel: string = 'info'
): WinstonModuleOptions => {
  const isProduction = env === Environment.PRODUCTION;
  const isDevelopment = env === Environment.DEVELOPMENT;

  // Create logs directory if it doesn't exist
  import('fs').then(fs => {
    import('path').then(path => {
      const logsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
    });
  });

  const transports: winston.transport[] = [];

  // Console transport - always enabled but with different formats
  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize({ all: !isProduction }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format((info) => ({ ...info, env }))(),
        consoleFormat
      ),
      level: isDevelopment ? 'debug' : logLevel,
    })
  );

  // File transports - enabled for QA and Production
  if (!isDevelopment) {
    // Error logs
    transports.push(
      new winston.transports.File({
        filename: `logs/${env}-error.log`,
        level: 'error',
        format: combine(
          winston.format((info) => ({ ...info, env }))(),
          fileFormat
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );

    // Combined logs
    transports.push(
      new winston.transports.File({
        filename: `logs/${env}-combined.log`,
        format: combine(
          winston.format((info) => ({ ...info, env }))(),
          fileFormat
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  }

  const config: WinstonModuleOptions = {
    level: logLevel,
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      winston.format((info) => ({ ...info, env }))()
    ),
    transports,
    exceptionHandlers: [],
    rejectionHandlers: [],
  };

  // Exception and rejection handlers - only for non-development
  if (!isDevelopment) {
    config.exceptionHandlers = [
      new winston.transports.File({
        filename: `logs/${env}-exceptions.log`,
        format: combine(
          winston.format((info) => ({ ...info, env }))(),
          fileFormat
        ),
      }),
    ];

    config.rejectionHandlers = [
      new winston.transports.File({
        filename: `logs/${env}-rejections.log`,
        format: combine(
          winston.format((info) => ({ ...info, env }))(),
          fileFormat
        ),
      }),
    ];
  }

  return config;
};

// Legacy export for backward compatibility
export const winstonConfig = createWinstonConfig();