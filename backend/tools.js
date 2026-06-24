import { config } from "./config.js";

// Read custom-field IDs directly from .env so start_date/team work even if
// config.js doesn't map them. THIS fixes the missing start date.
const START_DATE_FIELD = process.env.JIRA_START_DATE_FIELD ?? config.jiraStartDateField ?? null;
const TEAM_FIELD = process.env.JIRA_TEAM_FIELD ?? config.jiraTeamField ?? null;

const PRIORITIES = ["Highest", "High", "Medium", "Low", "Lowest"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const cleanPriority = (p) =>
  PRIORITIES.find((x) => x.toLowerCase() === String(p ?? "").toLowerCase()) ?? "Medium";
const cleanLabels = (l) =>
  Array.isArray(l) ? [...new Set(l.map((x) => String(x).trim().replace(/\s+/g, "-")).filter(Boolean))] : [];
const cleanDate = (d) => (typeof d === "string" && ISO_DATE.test(d) ? d : null);

async function jira(path, { method = "GET", body } = {}) {
  const base = config.jiraUrl.replace(/\/$/, "");
  const auth = Buffer.from(`${config.jiraEmail}:${config.jiraApiToken}`).toString("base64");
  const res = await fetch(`${base}/rest/api/2${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json", Accept: "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    let detail = raw || `HTTP ${res.status}`;
    try {
      const j = JSON.parse(raw);
      const msgs = [...(j.errorMessages ?? []), ...Object.entries(j.errors ?? {}).map(([k, v]) => `${k}: ${v}`)];
      if (msgs.length) detail = msgs.join("; ");
    } catch {}
    throw new Error(`Jira ${res.status}: ${detail}`);
  }
  return res.json();
}

const lookupAccountId = async (q) => {
  if (!q) return null;
  try {
    const r = await jira(`/user/search?query=${encodeURIComponent(q)}`);
    return r?.[0]?.accountId ?? null;
  } catch {
    return null;
  }
};

export async function createJiraTicket(task) {
  const { title, description, issue_type, priority, assignee, reporter,
          due_date, start_date, labels, parent, team } = task;

  if (!config.jiraUrl || !config.jiraEmail || !config.jiraApiToken || !config.jiraProjectKey)
    throw new Error("Jira config missing — check .env");

  const [assigneeId, reporterId] = await Promise.all([
    lookupAccountId(assignee),
    lookupAccountId(reporter),
  ]);

  const due = cleanDate(due_date);
  const start = cleanDate(start_date);
  const labelList = cleanLabels(labels);

  const fields = {
    project: { key: config.jiraProjectKey },
    summary: title,
    description: description ?? "", // v2 = plain string
    issuetype: { name: issue_type || "Task" },
    priority: { name: cleanPriority(priority) },
  };
  if (assigneeId) fields.assignee = { accountId: assigneeId };
  if (reporterId) fields.reporter = { accountId: reporterId };
  if (due) fields.duedate = due;
  if (labelList.length) fields.labels = labelList;
  if (parent) fields.parent = { key: parent };
const startField = process.env.JIRA_START_DATE_FIELD ?? config.jiraStartDateField ?? null;
const teamField  = process.env.JIRA_TEAM_FIELD ?? config.jiraTeamField ?? null;

if (start && startField) fields[startField] = start;
if (team && teamField)   fields[teamField]  = team;

  console.log(`[tools.js] Created Jira ticket with fields: ${JSON.stringify(fields, null, 2)}`);

  const data = await jira("/issue", { method: "POST", body: { fields } });
  const url = `${config.jiraUrl.replace(/\/$/, "")}/browse/${data.key}`;
  console.log(`[JIRA] Created ${data.key}: "${title}" → ${url}`);

  return {
    ticket_id: data.key, url, title, status: "To Do",
    issue_type: fields.issuetype.name, priority: fields.priority.name,
    assignee: assigneeId ? assignee : null, reporter: reporterId ? reporter : null,
    due_date: due, start_date: start, labels: labelList,
    parent: parent ?? null, team: team ?? null,
  };
}

export function sendSlackMessage({ channel, message }) {
  console.log(`[MOCK SLACK] #${channel}: ${message}`);
  return { ok: true, channel, ts: "1700000000.000100" };
}

export const TOOL_REGISTRY = {
  create_jira_ticket: createJiraTicket,
  send_slack_message: sendSlackMessage,
};

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    name: "create_jira_ticket",
    description:
      "Create a single Jira issue from a task described in natural language. " +
      "Call once per distinct task. Extract every field you can infer; use null " +
      "(or [] for labels) for anything not stated. Never invent values.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: 'Short, action-oriented summary (the Jira "Summary").' },
        description: { type: "string", description: "Full task details and context. If only a title was given, restate it here." },
        issue_type: { type: "string", enum: ["Task", "Bug", "Story", "Epic"], description: '"Bug" for defects, "Story" for features, else "Task".' },
        priority: { type: "string", enum: ["Highest", "High", "Medium", "Low", "Lowest"], description: 'Infer from urgency. "urgent/critical/blocker" -> High/Highest. Default "Medium".' },
        assignee: { type: ["string", "null"], description: "Email or display name of who does the work, exactly as written. null if absent." },
        reporter: { type: ["string", "null"], description: "Email or display name of who requested it. null if absent." },
        due_date: { type: ["string", "null"], description: "Deadline as strict YYYY-MM-DD. null if none." },
        start_date: { type: ["string", "null"], description: "Planned start as strict YYYY-MM-DD. NOT the creation date. null if none." },
        labels: { type: "array", items: { type: "string" }, description: "Single-word tags, no spaces (use hyphens). [] if none." },
        parent: { type: ["string", "null"], description: 'Parent issue key like "PROJ-123". null if none.' },
        team: { type: ["string", "null"], description: "Team name if explicitly mentioned. null if none." },
      },
      required: ["title", "description", "issue_type", "priority", "assignee", "reporter", "due_date", "start_date", "labels", "parent", "team"],
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
      properties: { channel: { type: "string" }, message: { type: "string" } },
      required: ["channel", "message"],
      additionalProperties: false,
    },
    strict: true,
  },
];