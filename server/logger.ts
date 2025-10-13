import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
}

class Logger {
  private logLevel: LogLevel;
  private logStream?: NodeJS.WritableStream;

  constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    
    if (process.env.NODE_ENV === 'production') {
      this.setupFileLogging();
    }
  }

  private setupFileLogging() {
    try {
      const logsDir = join(process.cwd(), 'logs');
      if (!existsSync(logsDir)) {
        mkdirSync(logsDir, { recursive: true });
      }
      
      const logFile = join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
      this.logStream = createWriteStream(logFile, { flags: 'a' });
    } catch (error) {
      // Fallback to console if file logging fails
      console.warn('Failed to setup file logging:', error);
    }
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: any) {
    if (level > this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      message,
      ...(meta && { meta }),
    };

    const logLine = JSON.stringify(entry);

    // Always log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const colorMap = {
        ERROR: '\x1b[31m',
        WARN: '\x1b[33m',
        INFO: '\x1b[36m',
        DEBUG: '\x1b[90m',
      };
      const color = colorMap[levelName as keyof typeof colorMap] || '';
      const reset = '\x1b[0m';
      console.log(`${color}[${entry.timestamp}] ${levelName}: ${message}${reset}`, meta || '');
    }

    // Log to file in production
    if (this.logStream) {
      this.logStream.write(logLine + '\n');
    }
  }

  error(message: string, meta?: any) {
    this.log(LogLevel.ERROR, 'ERROR', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  info(message: string, meta?: any) {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  debug(message: string, meta?: any) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  http(method: string, url: string, ip: string, statusCode?: number) {
    this.info(`${method} ${url} from ${ip}${statusCode ? ` - ${statusCode}` : ''}`);
  }
}

export const logger = new Logger();