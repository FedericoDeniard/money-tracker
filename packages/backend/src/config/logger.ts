import { Logger, LogLevel } from '../utils/logger';
import type { LoggerConfig } from '../utils/logger';

const defaultConfig: LoggerConfig = {
    level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
    enableConsole: true,
    enableFile: false,
    format: 'text',
};

export const rootLogger = new Logger(defaultConfig);

// Loggers específicos para diferentes módulos
export const authLogger = rootLogger.child('AUTH');
export const transactionLogger = rootLogger.child('TRANSACTION');
export const emailLogger = rootLogger.child('EMAIL');
export const metricsLogger = rootLogger.child('METRICS');
export const gmailLogger = rootLogger.child('GMAIL');
export const supabaseLogger = rootLogger.child('SUPABASE');
export const apiLogger = rootLogger.child('API');

// Exportar por defecto el logger raíz
export default rootLogger;
