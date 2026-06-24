import { config } from "./config.js";

const PRIORITY_MAP = { low: "Low", medium: "Medium", high: "High" };

function jiraAuthHeader() {
  const credentials = Buffer.from(
    `${config.jiraEmail}:${config.jiraApiToken}`,
  ).toString("base64");
  return `Basic ${credentials}`;
}

async function jiraRequest(path, { method = "GET", body } = {}) {
  const baseUrl = config.jiraUrl.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/rest/api/2${path}`, {
    method,
    headers: {
      Authorization: jiraAuthHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Jira ${res.status}: ${text}`);
  }
  return res.json();
}

async function lookupAccountId(email) {
  try {
    const results = await jiraRequest(
      `/user/search?query=${encodeURIComponent(email)}`,
    );
    return results?.[0]?.accountId ?? null;
  } catch {
    return null;
  }
}

export async function createJiraTicket({
  title,
  description,
  assignee,
  priority = "medium",
}) {
  const accountId = assignee ? await lookupAccountId(assignee) : null;

  const fields = {
    project: { key: config.jiraProjectKey },
    summary: title,
    description: description,
    issuetype: { name: "Task" },
    priority: { name: PRIORITY_MAP[priority] ?? "Medium" },
    ...(accountId ? { assignee: { accountId } } : {}),
  };

  const data = await jiraRequest("/issue", {
    method: "POST",
    body: { fields },
  });

  return {
    ticket_id: data.key,
    url: `${config.jiraUrl.replace(/\/$/, "")}/browse/${data.key}`,
    title,
    description,
    assignee,
    priority,
    status: "To Do",
  };
}

export function sendSlackMessage({ channel, message }) {
  console.log(`[MOCK SLACK] #${channel}: ${message}`);
  return { ok: true, channel, ts: "1700000000.000100" };
}

/** name -> function */
export const TOOL_REGISTRY = {
  create_jira_ticket: createJiraTicket,
  send_slack_message: sendSlackMessage,
};

/** Tool schemas exposed to the Responses API */
export const TOOL_DEFINITIONS = [
  {
    type: "function",
    name: "create_jira_ticket",
    description:
      "Create a Jira ticket from an extracted task. " +
      "Use this whenever the user wants to push a todo into the issue tracker.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short ticket title." },
        description: {
          type: "string",
          description: "Full task description with context.",
        },
        assignee: {
          type: "string",
          description: "Email or username of the person responsible.",
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Ticket priority.",
        },
      },
      required: ["title", "description", "assignee", "priority"],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: "function",
    name: "send_slack_message",
    description: "Post a message to a Slack channel to notify the team.",
    parameters: {
      type: "object",
      properties: {
        channel: { type: "string" },
        message: { type: "string" },
      },
      required: ["channel", "message"],
      additionalProperties: false,
    },
    strict: true,
  },
];
