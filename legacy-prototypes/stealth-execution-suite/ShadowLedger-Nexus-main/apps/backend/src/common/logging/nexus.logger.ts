// Built by vsrupeshkumar
import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

@Injectable()
export class NexusLogger extends ConsoleLogger {
  log(message: any, context?: string) {
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        context,
        message,
      }));
    } else {
      super.log(message, context);
    }
  }

  error(message: any, stack?: string, context?: string) {
    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        context,
        message,
        stack,
      }));
    } else {
      super.error(message, stack, context);
    }
  }

  warn(message: any, context?: string) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        context,
        message,
      }));
    } else {
      super.warn(message, context);
    }
  }
}
