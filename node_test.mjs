
// fetch Jira Issues
const response = await fetch(
  "https://yamsaputra.atlassian.net/rest/api/2/issue/createmeta",
  {
    headers: {
      method: "GET",
      Authorization:
        "Basic " +
        Buffer.from(
          "yamuniverse@gmail.com:ATATT3xFfGF09XGN66G4n8QmFZZsMa5mYSzCjuo0ZCE-vq_ErlsahNCLq1TiUWaMi226ixTnDg5ZzGbGw9CgfvIE3LhcoRSVyAjBnj9z49GgesRyGmfOoogkzzcE9sSaGsSuLJqUmrHhNStLoCm7JpxsiZ249ReQRuHd-iPgcT3V2_DBxj_vaAE=641BF50C",
        ).toString("base64"),
      Accept: "application/json",
    },
  },
);

/* const responseData = await response.json(); */

/* console.log(responseData.projects[0]); */
/* console.log(await response.text()); */

/**
 * discover-fields — call Jira directly, print the custom field .env lines.
 */
const JIRA_URL = "https://yamsaputra.atlassian.net";
const JIRA_EMAIL = "yamuniverse@gmail.com";
const JIRA_API_TOKEN =
  "ATATT3xFfGF09XGN66G4n8QmFZZsMa5mYSzCjuo0ZCE-vq_ErlsahNCLq1TiUWaMi226ixTnDg5ZzGbGw9CgfvIE3LhcoRSVyAjBnj9z49GgesRyGmfOoogkzzcE9sSaGsSuLJqUmrHhNStLoCm7JpxsiZ249ReQRuHd-iPgcT3V2_DBxj_vaAE=641BF50C";

const authHeader =
  "Basic " + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

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
