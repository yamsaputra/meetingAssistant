/**
 * Mock implementations of external tools the model can call.
 * Swap these for real Jira / Slack clients in production.
 */
import crypto from 'node:crypto';

function shortId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
}

export function createJiraTicket({ title, description, assignee, priority = 'medium' }) {
  const ticketId = `PROJ-${shortId()}`;
  console.log(`[MOCK JIRA] Created ${ticketId}: '${title}' for ${assignee} (${priority})`);
  return {
    ticket_id: ticketId,
    url: `https://example.atlassian.net/browse/${ticketId}`,
    title,
    description,
    assignee,
    priority,
    status: 'To Do',
  };
}

export function sendSlackMessage({ channel, message }) {
  console.log(`[MOCK SLACK] #${channel}: ${message}`);
  return { ok: true, channel, ts: '1700000000.000100' };
}

/** name -> function */
export const TOOL_REGISTRY = {
  create_jira_ticket: createJiraTicket,
  send_slack_message: sendSlackMessage,
};

/** Tool schemas exposed to the Responses API */
export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'create_jira_ticket',
    description:
      'Create a Jira ticket from an extracted task. ' +
      'Use this whenever the user wants to push a todo into the issue tracker.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short ticket title.' },
        description: {
          type: 'string',
          description: 'Full task description with context.',
        },
        assignee: {
          type: 'string',
          description: 'Email or username of the person responsible.',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Ticket priority.',
        },
      },
      required: ['title', 'description', 'assignee', 'priority'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'send_slack_message',
    description: 'Post a message to a Slack channel to notify the team.',
    parameters: {
      type: 'object',
      properties: {
        channel: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['channel', 'message'],
      additionalProperties: false,
    },
    strict: true,
  },
];
