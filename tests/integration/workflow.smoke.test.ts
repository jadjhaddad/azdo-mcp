/**
 * Integration smoke test — requires a live AzDO sandbox project.
 * Skipped automatically unless AZDO_INTEGRATION_TEST=true is set.
 *
 * Flow: create → update → transition → comment → delete
 */

const RUN = process.env.AZDO_INTEGRATION_TEST === 'true';
const describeIf = RUN ? describe : describe.skip;

describeIf('AzDO integration smoke test', () => {
  const PROJECT = process.env.AZDO_TEST_PROJECT ?? 'Sandbox';
  let createdId: number;

  it('create_ticket — creates a Task', async () => {
    const { handleCreateTicket } = await import('../../src/mcp/tools/createTicket');
    const raw = await handleCreateTicket({
      project: PROJECT,
      type: 'Task',
      title: '[azdo-mcp smoke test] ' + new Date().toISOString(),
      description: 'Created by integration smoke test',
      priority: 3,
    });
    const payload = JSON.parse(raw.content[0].text);
    expect(payload.ok).toBe(true);
    createdId = payload.data.id;
    expect(createdId).toBeGreaterThan(0);
  });

  it('update_ticket — updates title', async () => {
    const { handleUpdateTicket } = await import('../../src/mcp/tools/updateTicket');
    const raw = await handleUpdateTicket({
      id: createdId,
      fields: { 'System.Title': '[azdo-mcp smoke test] UPDATED' },
    });
    const payload = JSON.parse(raw.content[0].text);
    expect(payload.ok).toBe(true);
  });

  it('transition_ticket — moves to Active', async () => {
    const { handleTransitionTicket } = await import('../../src/mcp/tools/transitionTicket');
    const raw = await handleTransitionTicket({ id: createdId, toState: 'Active' });
    const payload = JSON.parse(raw.content[0].text);
    expect(payload.ok).toBe(true);
    expect(payload.data.newState).toBe('Active');
  });

  it('add_ticket_comment — adds a comment', async () => {
    const { handleAddTicketComment } = await import('../../src/mcp/tools/addTicketComment');
    const raw = await handleAddTicketComment({ id: createdId, commentText: 'Smoke test comment' });
    const payload = JSON.parse(raw.content[0].text);
    expect(payload.ok).toBe(true);
    expect(payload.data.commentId).toBeGreaterThan(0);
  });

  it('delete_ticket — deletes with confirmation', async () => {
    // Requires ENABLE_DELETE=true in env for integration test
    const { handleDeleteTicket } = await import('../../src/mcp/tools/deleteTicket');
    const raw = await handleDeleteTicket({
      id: createdId,
      confirm: `DELETE-${createdId}`,
      hardDelete: false,
    });
    const payload = JSON.parse(raw.content[0].text);
    expect(payload.ok).toBe(true);
    expect(payload.data.deleted).toBe(true);
  });
});
