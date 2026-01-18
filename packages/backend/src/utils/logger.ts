export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
    metadata?: Record<string, unknown>;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile?: boolean;
  format?: 'json' | 'text';
}

export class Logger {
  private config: LoggerConfig;
  private context?: string;

  constructor(config: LoggerConfig, context?: string) {
    this.config = config;
    this.context = context;
  }

    debug(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, message, metadata);
  }

    info(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, metadata);
  }

    warn(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, metadata);
  }

    error(message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, metadata);
  }

    private log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
    if (level < this.config.level) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      metadata,
    };

    this.writeLog(entry);
  }

  private writeLog(entry: LogEntry) {
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }
    // Futuro: escribir a archivo, base de datos, etc.
  }

  private writeToConsole(entry: LogEntry) {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const context = entry.context ? `[${entry.context}]` : '';
    
    const logMessage = `${timestamp} ${levelName} ${context} ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, entry.metadata || '');
        break;
      case LogLevel.INFO:
        console.info(logMessage, entry.metadata || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, entry.metadata || '');
        break;
      case LogLevel.ERROR:
        console.error(logMessage, entry.metadata || '');
        break;
    }
  }

  child(context: string): Logger {
    return new Logger(this.config, context);
  }
}
