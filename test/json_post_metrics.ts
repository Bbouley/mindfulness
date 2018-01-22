import nock from 'nock';
import { Metrics } from '../src/index';
import Metric from '../src/models/metric';

test('JsonPostMetrics.getRequestOptions returns object', () => {
  const m = new Metrics([{type: 'json_post', host: 'metrics.example.com'}]);
  const jsonMetrics = m.layers[0];

  const obj = { headers: { 'X-Thing': 123 } };
  const result = jsonMetrics.getRequestOptions(obj, 'increment', new Metric('myMetric'), jsonMetrics.options);
  expect(result)
    .toMatchObject({
      ...obj,
      method: 'POST',
      uri: 'http://metrics.example.com/',
      body: {
        environment: 'test'
      },
    });
});

test('send metrics via post request to example.com', async (done) => {
  const m = new Metrics([
    {type: 'json_post', host: 'metrics.example.com'}
  ]);

  const metricsEndpoint = nock('http://metrics.example.com')
    .post('/', {
      environment: 'test',
      type: 'increment'
    })
    .reply(200, {});

  await m.increment('myMetric');

  expect(metricsEndpoint.isDone()).toBe(true);
  done();
});

test('Can modify the request body with requestBodyCallback', async (done) => {
  const m = new Metrics([
    {
      type: 'json_post',
      host: 'metrics.example.com',
      requestBodyCallback: (body: object, details: object) => {
        const newBody = {
          ...body,
          newElement: 123,
        }
        return newBody;
      }
    }
  ]);

  const metricsEndpoint = nock('http://metrics.example.com')
    .post('/', {
      environment: 'test',
      type: 'increment',
      newElement: 123,
    })
    .reply(200, {});

  await m.increment('myMetric');

  expect(metricsEndpoint.isDone()).toBe(true);
  done();
});

test('Decrement requests include a different type', async (done) => {
  const m = new Metrics([
    {
      type: 'json_post',
      host: 'metrics.example.com',
    }
  ]);

  const metricsEndpoint = nock('http://metrics.example.com')
    .post('/', {
      environment: 'test',
      type: 'decrement',
      value: 10,
    })
    .reply(200, {});

  await m.decrement('myMetric', 10);

  expect(metricsEndpoint.isDone()).toBe(true);
  done();
});

test('Decrement requests to a different URL', async (done) => {
  const m = new Metrics([
    {
      type: 'json_post',
      host: 'metrics.example.com',
      paths: {
        decrement: '/decrement',
      },
    }
  ]);

  const incorrectEndpoint = nock('http://metrics.example.com')
    .post('/')
    .reply(200, {});

  const correctEndpoint = nock('http://metrics.example.com')
    .post('/decrement', {
        environment: 'test',
        type: 'decrement',
        value: 10,
    })
    .reply(200, {});

  await m.decrement('myMetric', 10);

  expect(incorrectEndpoint.isDone()).toBe(false);
  expect(correctEndpoint.isDone()).toBe(true);
  done();
});

test('Include metric value in the request URL', async (done) => {
  const m = new Metrics([
    {
      type: 'json_post',
      host: 'metrics.example.com',
      paths: {
        increment: '/path/$category/$metric',
      },
    }
  ]);

  const correctEndpoint = nock('http://metrics.example.com')
    .post('/path/myMetric', {
        environment: 'test',
        type: 'increment',
        value: 10,
    })
    .reply(200, {});

  await m.increment('myMetric', 10);

  expect(correctEndpoint.isDone()).toBe(true);
  done();
});

test('Include metric and category value in the request URL', async (done) => {
  const m = new Metrics([
    {
      type: 'json_post',
      host: 'metrics.example.com',
      paths: {
        increment: '/path/$category/$metric',
      },
    }
  ]);

  const correctEndpoint = nock('http://metrics.example.com')
    .post('/path/awesome/myMetric', {
        environment: 'test',
        type: 'increment',
        value: 10,
    })
    .reply(200, {});

  await m.increment('awesome', 'myMetric', 10);

  expect(correctEndpoint.isDone()).toBe(true);
  done();
});

test('Metric post failure should throw an error', async (done) => {
  const m = new Metrics([
    {
      type: 'json_post',
      host: 'metrics.example.com',
      paths: {
        increment: '/path/$category/$metric',
      },
    }
  ]);

  const correctEndpoint = nock('http://metrics.example.com')
    .post('/path/awesome/myMetric', {
      environment: 'test',
      type: 'increment',
      value: 10,
    })
    .reply(500, {});

  expect(() => {
    m.increment('awesome', 'myMetric', 10)
  }).rejects.toThrowError();

  done();
});

test('Metric silent() stops errors', async (done) => {
  const m = new Metrics([
    {
      type: 'json_post',
      host: 'metrics.example.com',
      paths: {
        increment: '/path/$category/$metric',
      },
    }
  ]);

  const correctEndpoint = nock('http://metrics.example.com')
    .post('/path/awesome/myMetric', {
      environment: 'test',
      type: 'increment',
      value: 10,
    })
    .reply(500, {});

  expect(() => {
    m.silent().increment('awesome', 'myMetric', 10);
  }).rejects.not.toThrowError();

  done();
});