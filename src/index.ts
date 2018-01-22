import {ConsoleLogger, ConsoleMetrics} from './contrib/console';
import {JsonPostLogger, JsonPostMetrics} from './contrib/json_post';
import {LoggerOptions, L, LoggerLayer} from './interfaces/logger';
import {M, MetricsOptions, MetricInterface} from './interfaces/metrics';
import Metric from './models/metric';

const contribLoggers = {
  console: ConsoleLogger,
  json_post: JsonPostLogger,
};

const contribMetrics = {
  console: ConsoleMetrics,
  json_post: JsonPostMetrics,
};

/**
 * Logger class.
 *
 * A logger instance may represent one or more layers of logging. Each
 * layer represents an output (console, POST request, file, etc).
 */
export class Logger implements L {
  layers = [];
  options: LoggerOptions = {};

  /**
   * Build our logger object.
   *
   * @param layers The logging layers to include.
   */
  constructor(layers: (string|LoggerLayer)[] = [], options = {}) {
    this.options = {...options};

    // default for logging is just to use the console
    if (layers.length == 0) {
      layers = ['console'];
    }

    // add any layers that may exist
    layers.forEach((layer) => {
      // user passed in a string
      if (typeof layer === 'string') {
        if (!contribLoggers.hasOwnProperty(layer)) {
          throw new Error('Could not find layer type: ' + layer);
        }
        this.layers.push(new contribLoggers[layer](this));
        return;
      }

      // this is a LoggerLayer
      if (layer.type && contribLoggers.hasOwnProperty(layer.type)) {
        this.layers.push(new contribLoggers[layer.type](this, layer));
        return;
      }

      this.layers.push(layer);
    });
  }

  /**
   * Handle an "after" function.
   *
   * Runs after all layers have finished.
   *
   * @param results Results from all logging layers
   */
  async after(results: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (this.options.after) {
        await this.options.after(results);
      }
      resolve();
    });
  }

  /**
   * Handle a "before" function.
   *
   * These functions can be used to modify for a specific request. Before functions
   *
   * @param message The message being logged
   * @param payload The payload being logged
   * @param options The settings for this call
   */
  async before(message: any, payload?: object, options?: object): Promise<any> {
    const before = async () => {
      return new Promise(async (resolve, reject) => {
        let callOptions = this.getCallOptions(options);

        // make sure we're not passing a reference if we don't need to...
        if (payload && !(payload instanceof Error)) {
          payload = {...payload};
        }

        if (callOptions && callOptions.before) {
          const result = await callOptions.before(message, payload, callOptions);
          [message, payload, callOptions] = [result.message, result.payload, result.options];
        }
        return resolve({ message, payload, options: callOptions });
      });
    }

    return await before();
  }

  /**
   * Used to log messages.
   *
   * Dynamically bound to the various methods in the constructor.
   *
   * @param logLevel Log level to use for this message
   * @param message The message
   * @param payload optional payload object
   */
  async call(logLevel: string, message: any, payload?: object, options?: object) {
    // call & wait for our before handlers
    const beforeResult = await this.before(message, payload, options);

    // call the log function on each layer
    const promises = this.layers.map((layer) => layer[logLevel](beforeResult.message, beforeResult.payload, beforeResult.options));

    // return a promise that will resolve when all layers are finished
    return new Promise((resolve, reject) => {
      Promise.all(promises)
        .then((results) => {
          this.after(results)

            .then(resolve);
        })
        .catch(reject);
    });
  }

  /**
   * Get the options for a specific call.
   *
   * Basically will return an options object for a specific call merged with the logger's
   * default options.
   *
   * @param options Call specific options
   */
  getCallOptions(options?: LoggerOptions): LoggerOptions {
    // if we have call options, override the defaults or just return the defaults.
    return (options) ? {
      ...this.options,
      ...options
    } : { ...this.options };
  }

  /**
   * Log a message to the "log" channel.
   *
   * @param message Message to log
   * @param payload Option payload to include
   */
  log(message: any, payload?: object, options?: object) {
    return this.call('log', message, payload, options);
  }

  /**
   * Log a message to the "error" channel.
   *
   * @param message Message to log
   * @param payload Option payload to include
   */
  logError(message: any, payload?: object, options?: object) {
    return this.call('logError', message, payload, options);
  }

  /**
   * Log a message to the "info" channel.
   *
   * @param message Message to log
   * @param payload Option payload to include
   */
  logInfo(message: any, payload?: object, options?: object) {
    return this.call('logInfo', message, payload, options);
  }

  /**
   * Log a message to the "warn" channel.
   *
   * @param message Message to log
   * @param payload Option payload to include
   */
  logWarn(message: any, payload?: object, options?: object) {
    return this.call('logWarn', message, payload, options);
  }
};

export class Metrics implements M {
  layers = [];
  options: MetricsOptions = {};

  constructor(layers = [], options: MetricsOptions = {}) {
    this.options = options;

    // default for logging is just to use the console
    if (layers.length == 0) {
      layers = ['console'];
    }

    // add any layers that may exist
    layers.forEach((layer) => {
      // user passed in a string
      if (typeof layer === 'string') {
        if (!contribMetrics.hasOwnProperty(layer)) {
          throw new Error('Could not find layer type: ' + layer);
        }
        this.layers.push(new contribMetrics[layer](this));
        return;
      }

      // this is a LoggerLayer
      if (layer.type && contribMetrics.hasOwnProperty(layer.type)) {
        this.layers.push(new contribMetrics[layer.type](this, layer));
        return;
      }

      this.layers.push(layer);
    });
  }

  async after(results: any): Promise<any> {
    return new Promise(async (resolve, reject) => {
      if (this.options.after) {
        await this.options.after(results);
      }
      resolve();
    });
  }

  async before(metric: MetricInterface, options?: MetricsOptions): Promise<any> {
    const before = async () => {
      return new Promise(async (resolve, reject) => {
        resolve({metric, options});
      });
    };

    return await before();
  }

  async decrement(...args: any[]) {
    const length = args.length;

    let options = this.options;
    if (length <= 0) {
      throw new Error('Invalid arguments for decrement');
    }
    else if (length == 2 && args[0] instanceof Metric && typeof args[1] === 'object') {
      options = {
        ...this.options,
        ...args[1]
      };
    }

    const metric = new Metric(...args);

    // call & wait for our before handlers
    const beforeResult = await this.before(metric, options);

    // call the log function on each layer
    const promises = this.layers.map((layer) => layer.decrement(metric, beforeResult.options));

    // return a promise that will resolve when all layers are finished
    return new Promise((resolve, reject) => {
      Promise.all(promises)
        .then((results) => {
          this.after(results)
            .then(resolve);
        })
        .catch(reject);
    });
  }

  async increment(...args: any[]) {
    const length = args.length;

    let options = this.options;
    if (length <= 0) {
      throw new Error('Invalid arguments for increment');
    }
    else if (length == 2 && args[0] instanceof Metric && typeof args[1] === 'object') {
      options = {
        ...this.options,
        ...args[1]
      };
    }

    const metric = new Metric(...args);

    // call & wait for our before handlers
    const beforeResult = await this.before(metric, options);

    // call the log function on each layer
    const promises = this.layers.map((layer) => layer.increment(metric, beforeResult.options));

    // return a promise that will resolve when all layers are finished
    return new Promise((resolve, reject) => {
      Promise.all(promises)
        .then((results) => {
          this.after(results)
            .then(resolve);
        })
        .catch(reject);
    });
  }

  silent() {
    this.options.silent = true;
    return this;
  }

}
