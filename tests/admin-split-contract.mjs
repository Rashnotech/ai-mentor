import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const rootClient = await readFile("app/admin/page-client.tsx", "utf8")
const gateConfig = await readFile("tsconfig.gate.json", "utf8")

const routes = [
  ["analytics", "AnalyticsView"],
  ["bootcamps", "BootcampManagementView"],
  ["community", "CommunityManagementView"],
  ["courses", "CoursesManagementView"],
  ["mentors", "MentorManagementView"],
  ["settings", "SettingsView"],
  ["transactions", "TransactionsView"],
  ["users", "UsersManagementView"],
]

for (const [route, exportName] of routes) {
  const page = await readFile(`app/admin/${route}/page.tsx`, "utf8")
  const client = await readFile(`app/admin/${route}/page-client.tsx`, "utf8")

  assert.match(page, new RegExp(`import \\{ ${exportName} \\} from "\\./page-client"`))
  assert.doesNotMatch(page, /from "\.\.\/page"/)
  assert.match(client, new RegExp(`export function ${exportName}\\(`))
  assert.match(gateConfig, new RegExp(`app/admin/${route}/page\\.tsx`))
  assert.match(gateConfig, new RegExp(`app/admin/${route}/page-client\\.tsx`))
}

for (const movedSymbol of [
  "UsersManagementView",
  "CoursesManagementView",
  "AnalyticsView",
  "BootcampManagementView",
  "CommunityManagementView",
  "MentorManagementView",
  "SettingsView",
  "TransactionsView",
]) {
  assert.doesNotMatch(rootClient, new RegExp(`export function ${movedSymbol}\\(`))
}

for (const removedImport of [
  "bootcampAdminApi",
  "transactionAdminApi",
  "communityApi",
  "validateCourseForm",
  "type UserCreatePayload",
  "type AdminTransactionItem",
]) {
  assert.doesNotMatch(rootClient, new RegExp(removedImport.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
}

assert.match(rootClient, /export function OverviewView\(/)
assert.match(rootClient, /export default function AdminDashboard\(/)
assert.match(rootClient, /import \{ courseAdminApi, userAdminApi \} from "@\/lib\/api"/)

console.log("Admin split contract: PASS")
