import { executeDelete } from '../../src/services/deleteService';

jest.mock('../../src/azdo/workItems', () => ({ deleteWorkItem: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  auditLog: jest.fn(),
}));

// Helper to re-mock ENABLE_DELETE per test
function mockDeleteEnabled(enabled: boolean) {
  jest.mock('../../src/config/policy', () => ({
    isDeleteEnabled: () => enabled,
    expectedDeleteToken: (id: number) => `DELETE-${id}`,
  }));
}

describe('executeDelete gates', () => {
  beforeEach(() => jest.resetModules());

  it('throws FORBIDDEN when ENABLE_DELETE=false', async () => {
    jest.doMock('../../src/config/policy', () => ({
      isDeleteEnabled: () => false,
      expectedDeleteToken: (id: number) => `DELETE-${id}`,
    }));
    const { executeDelete: del } = await import('../../src/services/deleteService');
    await expect(del({ id: 1, confirm: 'DELETE-1', hardDelete: false })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('throws VALIDATION_ERROR when confirm token wrong', async () => {
    jest.doMock('../../src/config/policy', () => ({
      isDeleteEnabled: () => true,
      expectedDeleteToken: (id: number) => `DELETE-${id}`,
    }));
    const { executeDelete: del } = await import('../../src/services/deleteService');
    await expect(del({ id: 42, confirm: 'wrong-token', hardDelete: false })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('throws FORBIDDEN on hardDelete=true regardless', async () => {
    jest.doMock('../../src/config/policy', () => ({
      isDeleteEnabled: () => true,
      expectedDeleteToken: (id: number) => `DELETE-${id}`,
    }));
    const { executeDelete: del } = await import('../../src/services/deleteService');
    await expect(del({ id: 7, confirm: 'DELETE-7', hardDelete: true })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});
