import { redirect } from "next/navigation"

// This page redirects to the overview page
// The mentor dashboard is now organized into separate routes:
// - /mentor/overview - Dashboard overview
// - /mentor/sessions - Manage mentoring sessions
// - /mentor/my-students - View enrolled students
// - /mentor/my-courses - Manage courses you've created
// - /mentor/availability - Set availability for sessions
// - /mentor/settings - Profile and notification settings

export default function MentorPage() {
  redirect("/mentor/overview")
}
