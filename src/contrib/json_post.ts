import request from 'request-promise-native';
import {LoggerInterface, LOG_LEVELS, LoggerOptions, L} from '../interfaces/logger';
import ContribLogger from './contrib_logger';
import ContribMetrics from './contrib_metrics';
import {getLogLevelConstant} from '../util/logging';
import { MetricsInterface, MetricsOptions, M } from '../interfaces/metrics';
import Metric from "../models/metric";

/**
 * JSON POST logger
 *
 * Passes off a log message to a remote endpoint.
 */
export class JsonPostLogger extends ContribLogger implements LoggerInterface {
  constructor(parent: L, options?: LoggerOptions) {
    options = {
      ...options
    }
    super(parent, options);
  }

  /**
   * Send the POST request.
   *
   * @param level Log level as a lowercase string
   * @param message The log message
   * @param payload The payload to include
   * @param options Call-specific options
   */
  async call(level: string, message: any, payload?: object, options?: LoggerOptions): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const callOptions = this.getCallOptions(options);
      if (callOptions.logLevel != LOG_LEVELS.LOG_NONE && callOptions.logLevel & getLogLevelConstant(level)) {

        try {
          if (typeof message !== 'string') {
            message = JSON.stringify(message);
          }

          if (payload && payload instanceof Error) {
            payload = {
              message: payload.message,
              stack: payload.stack
            };
          }
        }
        catch (e) {
          reject(e);
        }

        const requestOptions: object = this.getRequestOptions({
          json: true,
          resolveWithFullResponse: true
        }, level, message, payload, callOptions);

        try {
          const response = await request(requestOptions);
          resolve(response);
        }
        catch (e) {
          reject(e);
        }
      }
      else {
        resolve();
      }
    });
  }

  /**
   * Build the request body and hand off to a requestBodyCallback if specified.
   *
   * @param level Log level string
   * @param message Message being logged
   * @param payload Current payload
   * @param options Call-specific options
   */
  getRequestBody(level: string, message: any, payload?: object, options?: LoggerOptions): object {
    let body = {
      message,
      info: (payload) ? payload : {},
      severity: level,
      type: level
    };

    const callOptions = this.getCallOptions(options);

    if (callOptions.requestBodyCallback) {
      body = callOptions.requestBodyCallback(body, {level, message, payload, callOptions});
    }

    return body;
  }

  /**
   * Get the request() options.
   *
   * @param request The current request() options
   * @param metricType The metric type being called
   * @param metric The metric being updated
   * @param options Call-specific options.
   */
  getRequestOptions(request: object, level: string, message: any, payload: object, options: LoggerOptions): object {
    if (options.requestOptionsCallback) {
      const result = options.requestOptionsCallback(request, level, message, payload, options);
      if (result && typeof result === 'object') {
        request = result;
      }
      else {
        console.warn('The results of Metrics.requestOptionsCallback did not return a correct value. Ignoring result with type: ' + typeof result);
      }
    }

    let thisRequest: { method: string, uri: string, body: (string | object), json?: boolean } = {
      ...request,
      method: 'POST',
      uri: this.getRequestUri(level, message, payload, options),
      body: this.getRequestBody(level, message, payload, options),
    };

    if (typeof thisRequest.body === 'object') {
      thisRequest.json = true;
    }

    return thisRequest;
  }

  /**
   * Get the request URI based on options.
   */
  getRequestUri(level: string, message: any, payload: object, options?: LoggerOptions): string {
    const callOptions = this.getCallOptions(options);
    let url = '';

    const scheme = (callOptions.scheme) ? callOptions.scheme : 'http';
    const host = (callOptions.host) ? String(callOptions.host).replace(/^https?:\/\//, '') : 'localhost';
    const port = (callOptions.port) ? Number(callOptions.port) : null;
    const path = (callOptions.path) ? String(callOptions.path) : '/';

    url = scheme + '://' + host;
    if (port) {
      url += ':' + port;
    }

    url += path;
    url = url.replace(/\$level(\/)?/, level + '$1');

    return url;
  }
}

/**
 * JSON POST metrics
 *
 * Passes off a metrics request to a remote endpoint.
 */
export class JsonPostMetrics extends ContribMetrics implements MetricsInterface {
  constructor(parent: M, options?: LoggerOptions) {
    options = {
      ...options
    }
    super(parent, options);
  }

  /**
   * Send the POST request.
   *
   * @param metricType The metric update being made (increment, decrement, timing)
   * @param metric The metric being updated
   * @param options Call-specific options
   */
  async call(metricType: string, metric: Metric, options?: MetricsOptions): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const callOptions = this.getCallOptions(options);
      const requestOptions: object = this.getRequestOptions({
        json: true,
        resolveWithFullResponse: true
      }, metricType, metric, callOptions);

      try {
        const response = await request(requestOptions);
        resolve(response);
      }
      catch (e) {
        reject(e);
      }
    });
  }

  async decrement(...args: any[]): Promise<any> {
    const m = new Metric(...args);
    let options = this.options;
    if (args.length === 2 && args[0] instanceof Metric && typeof args[1] === 'object') {
      options = args[1];
    }
    return this.call('decrement', new Metric(...args), options);
  }

  async increment(...args: any[]): Promise<any> {
    const m = new Metric(...args);
    let options = this.options;
    if (args.length === 2 && args[0] instanceof Metric && typeof args[1] === 'object') {
      options = args[1];
    }
    return this.call('increment', new Metric(...args), options);
  }

  async timing(...args: any[]): Promise<any> {
    const m = new Metric(...args);
    let options = this.options;
    if (args.length === 2 && args[0] instanceof Metric && typeof args[1] === 'object') {
      options = args[1];
    }
    return this.call('timing', new Metric(...args), options);
  }

  /**
   * Get the environment to pass in the body.
   */
  getEnvironment(): string {
    if (process.env.NODE_ENV) {
      return process.env.NODE_ENV;
    }
    else if (process.env.ENVIRONMENT) {
      return process.env.ENVIRONMENT;
    }
    return 'production';
  }

  /**
   * Build the request body and hand off to a requestBodyCallback if specified.
   *
   * @param metricType The type of call being made
   * @param metric The metric object being sent
   * @param options Call-specific options
   */
  getRequestBody(metricType: string, metric: Metric, options?: MetricsOptions): object {
    const callOptions = this.getCallOptions(options);
    const dataDefaults = (callOptions.dataDefaults) ? callOptions.dataDefaults : {};
    let body = {
      environment: this.getEnvironment(),
      type: metricType,
      ...dataDefaults
    };

    if (metric.value) {
      body.value = metric.value;
    }

    if (callOptions.requestBodyCallback) {
      body = callOptions.requestBodyCallback(body, { metricType, metric, callOptions });
    }

    return body;
  }

  /**
   * Get the request() options.
   *
   * @param request The current request() options
   * @param metricType The metric type being called
   * @param metric The metric being updated
   * @param options Call-specific options.
   */
  getRequestOptions(request: object, metricType: string, metric: Metric, options: MetricsOptions): object {
    if (options.requestOptionsCallback) {
      const result = options.requestOptionsCallback(request, metricType, metric, options);
      if (result && typeof result === 'object') {
        request = result;
      }
      else {
        console.warn('The results of Metrics.requestOptionsCallback did not return a correct value. Ignoring result with type: ' + typeof result);
      }
    }

    let thisRequest: {method: string, uri: string, body: (string|object), json?: boolean} = {
      ...request,
      method: 'POST',
      uri: this.getRequestUri(metricType, metric, options),
      body: this.getRequestBody(metricType, metric, options),
    };

    if (typeof thisRequest.body === 'object') {
      thisRequest.json = true;
    }

    return thisRequest;
  }

  /**
   * Get the request path.
   *
   * @param metricType The metric type being sent
   * @param options An object of options for this call.
   */
  getRequestPath(metricType: string, options: MetricsOptions) {
    if (options.hasOwnProperty('paths') && options.paths.hasOwnProperty(metricType)) {
      return options.paths[metricType];
    }
    return (options.path) ? String(options.path) : '/';
  }

  /**
   * Get the request URI based on options.
   */
  getRequestUri(metricType: string, metric: Metric, options?: MetricsOptions): string {
    const callOptions = this.getCallOptions(options);

    let url = '';

    const scheme = (callOptions.scheme) ? callOptions.scheme : 'http';
    const host = (callOptions.host) ? String(callOptions.host) : 'localhost';
    const port = (callOptions.port) ? Number(callOptions.port) : null;

    url = scheme + '://' + host;
    if (port) {
      url += ':' + port;
    }

    url += this.getRequestPath(metricType, callOptions);

    const category = (metric.category) ? metric.category + '$1' : '';
    url = url.replace(/\$category(\/)?/, category);
    url = url.replace(/\$metric(\/)?/, metric.metric + '$1');

    return url;
  }
}
