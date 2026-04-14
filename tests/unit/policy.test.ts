import { isWritableField, expectedDeleteToken, isProjectAllowed } from '../../src/config/policy';

// Mock getEnv so tests don't need real env vars
jest.mock('../../src/config/env', () => ({
  getEnv: () => ({
    AZDO_ORG_URL: 'https://dev.azure.com/test-org',
    AZDO_TOKEN: 'test-token',
    AZDO_ALLOWED_PROJECTS: ['Alpha', 'Beta'],
    AZDO_DEFAULT_PROJECT: 'Alpha',
    ENABLE_DELETE: false,
    MAX_PAGE_SIZE: 200,
    LOG_LEVEL: 'error',
    SERVER_NAME: 'azdo-mcp',
    SERVER_VERSION: '0.1.0',
  }),
}));

describe('Policy', () => {
  describe('isWritableField', () => {
    it('allows known writable fields', () => {
      expect(isWritableField('System.Title')).toBe(true);
      expect(isWritableField('System.State')).toBe(true);
      expect(isWritableField('System.AssignedTo')).toBe(true);
      expect(isWritableField('Microsoft.VSTS.Common.Priority')).toBe(true);
    });

    it('blocks unknown fields', () => {
      expect(isWritableField('System.Id')).toBe(false);
      expect(isWritableField('System.Rev')).toBe(false);
      expect(isWritableField('Custom.ArbitraryField')).toBe(false);
    });
  });

  describe('expectedDeleteToken', () => {
    it('returns DELETE-<id> format', () => {
      expect(expectedDeleteToken(123)).toBe('DELETE-123');
      expect(expectedDeleteToken(1)).toBe('DELETE-1');
    });
  });

  describe('isProjectAllowed', () => {
    it('allows configured projects (case-insensitive)', () => {
      expect(isProjectAllowed('Alpha')).toBe(true);
      expect(isProjectAllowed('alpha')).toBe(true);
      expect(isProjectAllowed('Beta')).toBe(true);
    });

    it('blocks projects not in allowlist', () => {
      expect(isProjectAllowed('Gamma')).toBe(false);
      expect(isProjectAllowed('secret-project')).toBe(false);
    });
  });
});
