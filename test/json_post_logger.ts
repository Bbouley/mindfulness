import nock from 'nock';
import { Logger } from '../src/index';

test('log via post request to example.com', async (done) => {
  const l = new Logger([
    {type: 'json_post', host: 'logging.example.com'}
  ]);

  const loggingEndpoint = nock('http://logging.example.com')
    .post('/', {
      severity: 'log',
      type: 'log',
      message: 'Hello!',
      info: {},
    })
    .reply(200, {});

  await l.log('Hello!');

  expect(loggingEndpoint.isDone()).toBe(true);
  done();
});

test('log via post payload request to example.com', async (done) => {
  const l = new Logger([
    {type: 'json_post', host: 'logging.example.com'}
  ]);

  const loggingEndpoint = nock('http://logging.example.com')
    .post('/', {
      severity: 'log',
      type: 'log',
      message: 'Hello!',
      info: {example:123},
    })
    .reply(200, {});

  await l.log('Hello!', {example: 123});

  expect(loggingEndpoint.isDone()).toBe(true);
  done();
});

test('log object for message', async (done) => {
  const l = new Logger([
    {type: 'json_post', host: 'logging.example.com'}
  ]);

  const loggingEndpoint = nock('http://logging.example.com')
    .post('/', (req) => {
      expect(req).toEqual({
        severity: 'log',
        type: 'log',
        message: '{"example":123}',
        info: {}
      })
      return true;
    })
    .reply(200, {});

  await l.log({example: 123});

  expect(loggingEndpoint.isDone()).toBe(true);
  done();
});

test('log error for payload', async (done) => {
  const l = new Logger([
    { type: 'json_post', host: 'logging.example.com' }
  ]);

  const loggingEndpoint = nock('http://logging.example.com')
    .post('/', (req) => {
      expect(req).toMatchObject({
        severity: 'log',
        type: 'log',
        message: 'Error doing things',
        info: {
          message: 'You did everything wrong',
          stack: expect.any(String),
        }
      })
      return true;
    })
    .reply(200, {});

  await l.log('Error doing things', new Error('You did everything wrong'));

  expect(loggingEndpoint.isDone()).toBe(true);
  done();
});

test('can change request body', async (done) => {
  const l = new Logger([
    {
      type: 'json_post',
      host: 'logging.example.com',
      requestHandler: (body, details) => {
        return {
          ...body,
          injected: 123
        }
      }
    }
  ]);

  const loggingEndpoint = nock('http://logging.example.com')
    .post('/', (req) => {
      expect(req).toMatchObject({
        severity: 'log',
        type: 'log',
        message: 'Error doing things',
        injected: 123,
        info: {
          payload: 234,
        }
      })
      return true;
    })
    .reply(200, {});

  await l.log('Error doing things', { payload: 234 });

  expect(loggingEndpoint.isDone()).toBe(true);
  done();
});

test('can change request body on a call', async (done) => {
  const l = new Logger([
    {
      type: 'json_post',
      host: 'logging.example.com',
    }
  ]);

  const loggingEndpoint = nock('http://logging.example.com')
    .post('/', (req) => {
      expect(req).toMatchObject({
        severity: 'log',
        type: 'log',
        message: 'Error doing things',
        injected: 123,
        info: {
          payload: 234,
        }
      })
      return true;
    })
    .reply(200, {});

  await l.log('Error doing things', { payload: 234 }, { requestHandler: (body, details) => {
    return {
      ...body,
      injected: 123
    }
  }});

  expect(loggingEndpoint.isDone()).toBe(true);
  done();
});
