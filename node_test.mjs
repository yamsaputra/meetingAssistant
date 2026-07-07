
const JIRA_URL = process.env.JIRA_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const authHeader =
  "Basic " + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

// fetch Jira Issues
const response = await fetch(`${JIRA_URL}/rest/api/2/issue/createmeta`, {
  method: "GET",
  headers: {
    Authorization: authHeader,
    Accept: "application/json",
  },
});

/* const responseData = await response.json(); */

/* console.log(responseData.projects[0]); */
/* console.log(await response.text()); */

/**
 * discover-fields — call Jira directly, print the custom field .env lines.
 */
const responseFields = await fetch(`${JIRA_URL}/rest/api/2/field`, {
  method: "GET",
  headers: {
    Authorization: authHeader,
    Accept: "application/json",
  },
});

if (!responseFields.ok) {
  const text = await responseFields.text().catch(() => `HTTP ${responseFields.status}`);
  throw new Error(`Jira ${responseFields.status}: ${text}`);
}

const fields = await responseFields.json();

// Pick the custom field when a name appears more than once.
const pick = (name) => {
  const matches = fields.filter((f) => f.name === name);
  return matches.find((f) => f.custom) ?? matches[0] ?? null;
};

const startDate = pick("Start date");
const team = pick("Team");

console.log("=== Paste into .env ===");
console.log(
  startDate
    ? `JIRA_START_DATE_FIELD=${startDate.id}`
    : "# 'Start date' field not found on this site",
);
console.log(
  team ? `JIRA_TEAM_FIELD=${team.id}` : "# 'Team' field not found on this site",
);

// Show all custom fields too, in case the names differ from the labels in the UI.
console.log("\n=== All custom fields (id → name) ===");
fields
  .filter((f) => f.custom)
  .sort((a, b) => a.name.localeCompare(b.name))
  .forEach((f) => console.log(`${f.id} → ${f.name}`));
