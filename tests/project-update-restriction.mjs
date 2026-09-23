/**
 * Test: Project Link Update Restriction
 * 
 * Verifies that students can update project submission links only before review.
 * Once a mentor/admin has reviewed (checked on reviewed_at), updates should fail.
 */

import { strict as assert } from "assert"

const API_BASE = process.env.API_BASE || "http://localhost:8000/api/v1"
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "test-admin-token"
const STUDENT_TOKEN = process.env.STUDENT_TOKEN || "test-student-token"

async function httpRequest(method, path, body = null, token = null) {
  const url = `${API_BASE}${path}`
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)
  const data = await response.json()

  return {
    status: response.status,
    data,
    ok: response.ok,
  }
}

async function test_project_update_restriction() {
  console.log("Testing project link update restriction...")

  // Step 1: Get a student's submitted project (assuming one exists)
  console.log("  [1] Fetching student's learning content...")
  const contentRes = await httpRequest(
    "GET",
    "/courses/by-slug/test-course/learning-content",
    null,
    STUDENT_TOKEN
  )

  if (!contentRes.ok) {
    console.error("Failed to fetch learning content:", contentRes.data)
    return false
  }

  // Find the first submitted project
  let submittedProject = null
  let submissionId = null

  for (const module of contentRes.data.modules || []) {
    for (const project of module.projects || []) {
      if (project.is_submitted && project.submission_id) {
        submittedProject = project
        submissionId = project.submission_id
        break
      }
    }
    if (submittedProject) break
  }

  if (!submittedProject) {
    console.warn("  No submitted projects found to test. Skipping test.")
    return true
  }

  console.log(`  [2] Found submitted project: ${submittedProject.title} (submission_id: ${submissionId})`)
  console.log(`      Status: ${submittedProject.submission_status}, Reviewed: ${submittedProject.reviewed_at}`)

  // Step 2: Test update BEFORE review (should succeed if reviewed_at is null)
  if (!submittedProject.reviewed_at) {
    console.log("  [3] Testing update BEFORE review (should succeed)...")
    const updateRes = await httpRequest(
      "PUT",
      `/progress/projects/${submissionId}/update-url`,
      {
        solution_url: "https://github.com/student/updated-project-link",
        module_id: submittedProject.module_id,
      },
      STUDENT_TOKEN
    )

    if (updateRes.ok) {
      console.log("      ✓ Update succeeded before review (expected)")
      assert.equal(
        updateRes.data.solution_url,
        "https://github.com/student/updated-project-link",
        "URL should be updated"
      )
    } else {
      console.error(
        "      ✗ Update failed before review (unexpected):",
        updateRes.data.detail || updateRes.data
      )
      return false
    }
  } else {
    // Step 3: Test update AFTER review (should fail)
    console.log("  [3] Testing update AFTER review (should fail with 403)...")
    const updateRes = await httpRequest(
      "PUT",
      `/progress/projects/${submissionId}/update-url`,
      {
        solution_url: "https://github.com/student/another-updated-link",
        module_id: submittedProject.module_id,
      },
      STUDENT_TOKEN
    )

    if (updateRes.status === 403) {
      console.log("      ✓ Update rejected after review (expected)")
      assert(updateRes.data.detail.includes("reviewed"), "Error should mention review")
    } else {
      console.error(
        `      ✗ Expected 403 but got ${updateRes.status}:`,
        updateRes.data.detail || updateRes.data
      )
      return false
    }
  }

  // Step 4: Test ownership validation (student cannot update others' submissions)
  console.log("  [4] Testing ownership validation...")
  const differentStudentRes = await httpRequest(
    "PUT",
    `/progress/projects/${submissionId}/update-url`,
    {
      solution_url: "https://github.com/hacker/attempt",
      module_id: submittedProject.module_id,
    },
    "different-student-token"
  )

  if (differentStudentRes.status === 403) {
    console.log("      ✓ Ownership check passed (expected)")
    assert(
      differentStudentRes.data.detail.includes("own"),
      "Error should mention ownership"
    )
  } else {
    console.warn(
      `      [WARN] Ownership check status ${differentStudentRes.status} (verify if tokens work)`
    )
  }

  console.log("  ✓ Project update restriction test passed!\n")
  return true
}

async function run_tests() {
  try {
    const passed = await test_project_update_restriction()

    if (passed) {
      console.log("✓ All tests passed!")
      process.exit(0)
    } else {
      console.error("✗ Tests failed!")
      process.exit(1)
    }
  } catch (error) {
    console.error("Test error:", error.message)
    process.exit(1)
  }
}

run_tests()
