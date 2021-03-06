import { LoggerAfterCallback, LoggerBeforeCallback } from './callbacks';

export interface LoggerInterface {
  log(message: any, payload?: any, options?: object): Promise<any>
  logError(message: any, payload?: any, options?: object): Promise<string>
  logInfo(message: any, payload?: any, options?: object): Promise<string>
  logWarn(message: any, payload?: any, options?: object): Promise<string>
}

export const LOG_LEVELS = {
  LOG_NONE: 0,
  LOG_LOG: 1,
  LOG_ERROR: 2,
  LOG_WARN: 4,
  LOG_INFO: 8,
  LOG_ALL: 1 | 2 | 4 | 8,
};

export interface LoggerLayer {
  type: string;
  handler?: LoggerInterface;
  logLevel?: number;
  [propName: string]: any;
}

export interface L {
  layers: object[];
  before: (message: string, payload?: any) => Promise<{ message: string, payload: any, options: object }>;
  after: (err: object) => Promise<any>;
}
