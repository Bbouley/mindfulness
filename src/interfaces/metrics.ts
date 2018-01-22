import Metric from '../models/metric';

export interface MetricInterface {
  metric: string,
  feature?: string,
  value?: any,
};

export interface MetricsBeforeCallback {
  (metric: MetricInterface): Promise<{ metric: MetricInterface, options: MetricsOptions }>;
}

export interface MetricsAfterCallback {
  (results: object): void;
}

export interface MetricsRequestBodyCallback {
  (body: object, details: object): object;
}

export interface MetricsOptions {
  before?: MetricsBeforeCallback;
  after?: MetricsAfterCallback;
  requestBodyCallback?: MetricsRequestBodyCallback;
  [propName: string]: any;
};

export interface M {
  layers: object[];
  before: (metric: MetricInterface) => Promise<{ metric: MetricInterface, options: object }>;
  after: (err: object) => Promise<any>;
};

export interface MetricsInterface {
  increment(...args: any[]): Promise<any>;
  decrement(...args: any[]): Promise<any>;
  timing(...args: any[]): Promise<any>;
}
