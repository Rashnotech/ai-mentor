import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const rootClient = await readFile("app/admin/page-client.tsx", "utf8")
const gateConfig = await readFile("tsconfig.gate.json", "utf8")

const routeChecks = [
  ["analytics", "AnalyticsView"],
  ["bootcamps", "BootcampManagementView"],
  ["community", "CommunityManagementView"],
  ["courses", "CoursesManagementView"],
  ["mentors", "MentorManagementView"],
  ["settings", "SettingsView"],
  ["transactions", "TransactionsView"],
  ["users", "UsersManagementView"],
]

const routeResults = await Promise.all(
  routeChecks.map(async ([route, exportName]) => {
    const page = await readFile(`app/admin/${route}/page.tsx`, "utf8")
    const client = await readFile(`app/admin/${route}/page-client.tsx`, "utf8")
    return [
      route,
      page.includes(`import { ${exportName} } from "./page-client"`) &&
        !page.includes('from "../page"') &&
        client.includes(`export function ${exportName}(`) &&
        gateConfig.includes(`app/admin/${route}/page.tsx`) &&
        gateConfig.includes(`app/admin/${route}/page-client.tsx`),
    ]
  })
)

const checks = [
  [
    "every split admin route imports its local page-client chunk",
    routeResults.every(([, passed]) => passed),
  ],
  [
    "root admin page-client only owns overview/dashboard",
    rootClient.includes("export function OverviewView(") &&
      rootClient.includes("export default function AdminDashboard(") &&
      !["UsersManagementView", "CoursesManagementView", "BootcampManagementView", "TransactionsView"].some(
        (name) => rootClient.includes(`export function ${name}(`)
      ),
  ],
  [
    "root admin imports were trimmed after split",
    rootClient.includes('import { courseAdminApi, userAdminApi } from "@/lib/api"') &&
      !["bootcampAdminApi", "transactionAdminApi", "communityApi", "validateCourseForm"].some((name) =>
        rootClient.includes(name)
      ),
  ],
  [
    "type gate covers the split admin chunks",
    routeChecks.every(([route]) =>
      gateConfig.includes(`app/admin/${route}/page.tsx`) &&
      gateConfig.includes(`app/admin/${route}/page-client.tsx`)
    ),
  ],
]

const passed = checks.filter(([, condition]) => condition).length
for (const [name, condition] of checks) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
}

const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Admin split eval must pass every acceptance check")
