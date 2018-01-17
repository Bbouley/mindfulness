import {LoggerInterface, LOG_LEVELS, LoggerOptions, L} from '../interfaces/logger';
import {getLogLevelConstant} from '../util/logging';

export class ConsoleLogger implements LoggerInterface {
  options: LoggerOptions;
  parent: L;

  constructor(parent: L, options?: LoggerOptions) {
    this.parent = parent;
    this.options = {
      logLevel: LOG_LEVELS.LOG_ALL,
      ...options
    };
  }

  async call(level: string, message: any, payload?: object, options?: LoggerOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      const callOptions: LoggerOptions = (options) ? options : this.options;
      if (callOptions.logLevel != LOG_LEVELS.LOG_NONE && callOptions.logLevel & getLogLevelConstant(level)) {
        const args: (string|object)[] = [message];
        if (payload) {
          args.push(payload);
        }
        console[level].call(this, ...args);
      }
      resolve();
    });
  }

  log(message: any, payload?: object): Promise<any> {
    return this.call('log', message, payload);
  }

  logError(message: any, payload?: object): Promise<any> {
    return this.call('error', message, payload);
  }

  logInfo(message: any, payload?: object): Promise<any> {
    return this.call('info', message, payload);
  }

  logWarn(message: any, payload?: object): Promise<any> {
    return this.call('warn', message, payload);
  }
}
