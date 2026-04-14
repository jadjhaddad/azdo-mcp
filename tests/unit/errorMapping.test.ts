import { mapAxiosError } from '../../src/utils/errors';
import { AxiosError, AxiosResponse } from 'axios';

function makeAxiosError(status: number, message: string): AxiosError {
  const response = {
    status,
    data: { message },
    headers: {},
    config: {} as never,
    statusText: '',
  } as AxiosResponse;

  const err = new AxiosError(message, String(status), {} as never, null, response);
  return err;
}

describe('mapAxiosError', () => {
  it('maps 401 → AuthRequiredError', () => {
    const err = mapAxiosError(makeAxiosError(401, 'Unauthorized'));
    expect(err.code).toBe('AUTH_REQUIRED');
    expect(err.retryable).toBe(false);
  });

  it('maps 403 → ForbiddenError', () => {
    const err = mapAxiosError(makeAxiosError(403, 'Forbidden'));
    expect(err.code).toBe('FORBIDDEN');
  });

  it('maps 404 → NotFoundError', () => {
    const err = mapAxiosError(makeAxiosError(404, 'Not Found'));
    expect(err.code).toBe('NOT_FOUND');
  });

  it('maps 429 → RateLimitedError (retryable)', () => {
    const err = mapAxiosError(makeAxiosError(429, 'Too Many Requests'));
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.retryable).toBe(true);
  });

  it('maps 500 → AzdoApiError (retryable)', () => {
    const err = mapAxiosError(makeAxiosError(500, 'Internal Server Error'));
    expect(err.code).toBe('AZDO_API_ERROR');
    expect(err.retryable).toBe(true);
  });

  it('maps non-Axios error → INTERNAL_ERROR', () => {
    const err = mapAxiosError('something went wrong');
    expect(err.code).toBe('INTERNAL_ERROR');
  });
});
