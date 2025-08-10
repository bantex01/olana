// Simple frontend logger with different behavior in dev/prod
class Logger {
  private isDevelopment = import.meta.env.DEV;

  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      if (data) {
        console.log(`[DEBUG] ${message}`, data);
      } else {
        console.log(`[DEBUG] ${message}`);
      }
    }
  }

  info(message: string, data?: any) {
    if (data) {
      console.info(`[INFO] ${message}`, data);
    } else {
      console.info(`[INFO] ${message}`);
    }
  }

  warn(message: string, data?: any) {
    if (data) {
      console.warn(`[WARN] ${message}`, data);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  }

  error(message: string, data?: any) {
    if (data) {
      console.error(`[ERROR] ${message}`, data);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }
}

export const logger = new Logger();