import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const profileView = await readFile("app/dashboard/_components/profile-view.tsx", "utf8")
const adminUsersPage = await readFile("app/admin/users/page-client.tsx", "utf8")
const apiClient = await readFile("lib/api.ts", "utf8")
const adminRoutes = await readFile("api/domains/users/routes/admin.py", "utf8")
const rewardsRoutes = await readFile("api/domains/courses/routes/rewards.py", "utf8")

const checks = [
  [
    "student profile loads real certificates from backend",
    profileView.includes("rewardsApi.getMyCertificates()") &&
      profileView.includes("certificates.map") &&
      profileView.includes("certificate.certificate_url"),
  ],
  [
    "student profile no longer renders mock achievement data",
    !profileView.includes("const achievements = [") &&
      !profileView.includes("React Fundamentals") &&
      !profileView.includes("placeholder.svg?height=100&width=150"),
  ],
  [
    "student certificate cards show course/path context",
    profileView.includes("certificate.course_title") &&
      profileView.includes("certificate.path_title") &&
      rewardsRoutes.includes("course_title") &&
      rewardsRoutes.includes("path_title"),
  ],
  [
    "admin API exposes enrolled courses and certificate upload",
    apiClient.includes("getUserLearning") &&
      apiClient.includes("uploadCertificate") &&
      adminRoutes.includes('@router.get("/{user_id}/learning"') &&
      adminRoutes.includes('@router.post("/{user_id}/certificates"'),
  ],
  [
    "admin certificate assignment is tied to enrolled courses",
    adminRoutes.includes("UserCourseEnrollment") &&
      adminRoutes.includes("Student is not enrolled in this course") &&
      adminUsersPage.includes("selectedUserLearning?.enrolled_courses"),
  ],
  [
    "admin modal displays enrolled courses and certificate links",
    adminUsersPage.includes("Enrolled Courses") &&
      adminUsersPage.includes("View Certificate") &&
      adminUsersPage.includes("No certificate yet"),
  ],
  [
    "admin modal can save or update certificate URL",
    adminUsersPage.includes("Certificate URL") &&
      adminUsersPage.includes("handleSaveCertificate") &&
      adminRoutes.includes("certificate.certificate_url = request.certificate_url.strip()"),
  ],
]

const passed = checks.filter(([, condition]) => condition).length
for (const [name, condition] of checks) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
}

const score = passed / checks.length
console.log(`SCORE ${(score * 100).toFixed(0)}% (${passed}/${checks.length})`)
assert.equal(score, 1, "Admin certificate eval must pass every acceptance check")
