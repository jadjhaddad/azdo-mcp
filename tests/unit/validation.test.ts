import { ListMyTicketsInput, GetTicketInput, CreateTicketInput, DeleteTicketInput } from '../../src/mcp/schemas/inputs';

describe('Input validation schemas', () => {
  describe('ListMyTicketsInput', () => {
    it('parses valid input with defaults', () => {
      const result = ListMyTicketsInput.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.top).toBe(50);
        expect(result.data.skip).toBe(0);
      }
    });

    it('rejects top > 200', () => {
      const result = ListMyTicketsInput.safeParse({ top: 201 });
      expect(result.success).toBe(false);
    });

    it('rejects negative skip', () => {
      const result = ListMyTicketsInput.safeParse({ skip: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('GetTicketInput', () => {
    it('accepts valid id', () => {
      const result = GetTicketInput.safeParse({ id: 42 });
      expect(result.success).toBe(true);
    });

    it('rejects non-positive id', () => {
      expect(GetTicketInput.safeParse({ id: 0 }).success).toBe(false);
      expect(GetTicketInput.safeParse({ id: -1 }).success).toBe(false);
    });

    it('defaults expand to fields', () => {
      const result = GetTicketInput.safeParse({ id: 1 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.expand).toBe('fields');
    });
  });

  describe('CreateTicketInput', () => {
    it('accepts minimal valid input', () => {
      const result = CreateTicketInput.safeParse({ project: 'MyProject', type: 'Task', title: 'Do something' });
      expect(result.success).toBe(true);
    });

    it('rejects empty title', () => {
      const result = CreateTicketInput.safeParse({ project: 'MyProject', type: 'Task', title: '' });
      expect(result.success).toBe(false);
    });

    it('rejects priority out of range', () => {
      expect(CreateTicketInput.safeParse({ project: 'P', type: 'T', title: 'X', priority: 0 }).success).toBe(false);
      expect(CreateTicketInput.safeParse({ project: 'P', type: 'T', title: 'X', priority: 5 }).success).toBe(false);
    });
  });

  describe('DeleteTicketInput', () => {
    it('accepts id with confirm token', () => {
      const result = DeleteTicketInput.safeParse({ id: 123, confirm: 'DELETE-123' });
      expect(result.success).toBe(true);
    });

    it('defaults hardDelete to false', () => {
      const result = DeleteTicketInput.safeParse({ id: 1 });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.hardDelete).toBe(false);
    });
  });
});
