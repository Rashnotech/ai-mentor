#!/usr/bin/python3
"""
REWARDS SYSTEM REFERENCE

This document describes the complete rewards system for the AI Mentor platform.
It includes points calculation, badge types, and certificate requirements.
"""

"""
=== POINTS CALCULATION ===

Points are awarded based on:
1. Assessment Submissions (based on correctness and deadline)
2. Project Submissions (based on approval and deadline)

Deadline-Based Points:
- Before FIRST_DEADLINE: 100 points
- Before SECOND_DEADLINE: 50 points
- After SECOND_DEADLINE: 0 points

Assessment Points:
- Only awarded if is_correct=True
- Otherwise 0 points regardless of deadline

Project Points:
- Provisional points awarded at submission (before approval)
- Finalized when mentor approves (full points kept)
- Set to 0 if mentor rejects

Example Calculation:
  Assessment Q1 (10 points): submitted before first deadline, correct = 100 points
  Assessment Q2 (5 points): submitted before second deadline, correct = 50 points
  Project 1: submitted before first deadline, approved = 100 points
  Total: 250 points for module
=======

=== BADGE TYPES ===

1. SPEEDRUN (speedrun)
   - Trigger: Completed entire learning path in timely manner
   - Requirement: Finish all modules in path
   - Benefit: Recognition of quick learning

2. PERFECTIONIST (perfectionist)
   - Trigger: 100% score on all assessments in a module
   - Requirement: All assessment submissions correct
   - Benefit: Recognition of mastery

3. EARLY BIRD (early_bird)
   - Trigger: All assignments submitted before first deadline
   - Requirement: Every assessment and project submitted before first_deadline
   - Benefit: Recognition of consistent on-time submission

4. OVERACHIEVER (overachiever)
   - Trigger: Earned 150+ points on a course
   - Requirement: total_points >= 150 for course
   - Benefit: Recognition of exceptional effort

5. CONSISTENT (consistent)
   - Trigger: Completed all modules in order without skipping
   - Requirement: Every module in path marked as completed
   - Benefit: Recognition of thorough learning journey

6. HELPER (helper) [Future Feature]
   - Trigger: Helped other students
   - Requirement: Peer code reviews, forum contributions, etc.
   - Benefit: Recognition of community participation

Badge Eligibility Check Endpoints:
- GET /api/v1/rewards/me/badge-eligibility/speedrun?path_id=1
- GET /api/v1/rewards/me/badge-eligibility/perfectionist?module_id=1
- GET /api/v1/rewards/me/badge-eligibility/early-bird?path_id=1
- GET /api/v1/rewards/me/badge-eligibility/overachiever?course_id=1
- GET /api/v1/rewards/me/badge-eligibility/consistent?path_id=1
=======

=== CERTIFICATES ===

Requirements for Certificate Issuance:
- Complete ALL modules in a learning path
- Pass all assessments in each module (is_correct=True)
- Have all projects approved by mentor (is_approved=True)

Certificate Details:
- Issued per learning path
- One certificate per user per path
- Includes: user_id, course_id, path_id, issued_at, certificate_url
- Can be made public (is_public=True) for sharing

Certificate Eligibility Check:
- GET /api/v1/rewards/me/certificate-eligibility?path_id=1

Certificate Retrieval:
- GET /api/v1/rewards/me/certificates
  Returns: [CertificateResponse]
=======

=== REWARDS ENDPOINTS ===

Student/User Endpoints:
1. GET /api/v1/rewards/me
   - Get comprehensive rewards summary (points, badges, certificates)
   
2. GET /api/v1/rewards/me/badges
   - List all earned badges

3. GET /api/v1/rewards/me/certificates
   - List all certificates

4. GET /api/v1/rewards/me/points
   - Get total points (optional course_id filter)

5. GET /api/v1/rewards/me/points/modules/{module_id}
   - Get points in specific module

6. GET /api/v1/rewards/me/badge-eligibility/{badge_type}
   - Check if user qualifies for badge

7. GET /api/v1/rewards/me/certificate-eligibility
   - Check if user qualifies for certificate
=======

=== SERVICE METHODS ===

RewardService methods available:

Points Calculation:
- get_user_total_points(user_id, course_id=None) -> float
- get_project_submission_points(submission_id) -> float
- get_module_points(user_id, module_id) -> float

Badge Checking:
- check_speedrun_badge(user_id, path_id) -> (bool, str)
- check_perfectionist_badge(user_id, module_id) -> (bool, str)
- check_early_bird_badge(user_id, path_id) -> (bool, str)
- check_overachiever_badge(user_id, course_id) -> (bool, str)
- check_consistent_badge(user_id, path_id) -> (bool, str)

Certificate Checking:
- check_certificate_eligibility(user_id, path_id) -> (bool, str)

Award Methods:
- award_badge(user_id, badge_type, description=None) -> Badge
- issue_certificate(user_id, course_id, path_id, certificate_url=None) -> Certificate

Retrieval Methods:
- get_user_badges(user_id) -> List[Badge]
- get_user_certificates(user_id) -> List[Certificate]
- get_user_rewards_summary(user_id, course_id=None) -> Dict
=======

=== INTEGRATION POINTS ===

The RewardService should be called:

1. After Assessment Submission:
   - Points already calculated in AssessmentSubmission model
   - Check badge eligibility after submission

2. After Project Approval:
   - Points finalized
   - Check certificate eligibility if all projects approved
   - Check badge eligibility

3. On Module Completion:
   - Check badge eligibility (perfectionist, speedrun)
   - Check certificate eligibility

4. Admin Dashboard:
   - Show user total points with filters
   - Show earned badges and certificates
   - Leaderboards by points/badges

Example Integration in ProgressService:

  # After project approval
  reward_service = RewardService(db_session)
  
  # Check badges
  eligible, reason = await reward_service.check_perfectionist_badge(user_id, module_id)
  if eligible:
    await reward_service.award_badge(user_id, "perfectionist")
  
  # Check certificate
  cert_eligible, cert_reason = await reward_service.check_certificate_eligibility(user_id, path_id)
  if cert_eligible:
    await reward_service.issue_certificate(user_id, course_id, path_id)
=======

=== DATABASE MODELS ===

Certificate Model:
- certificate_id (PK)
- user_id (FK to users.id)
- course_id (FK to courses.course_id)
- path_id (FK to learning_paths.path_id)
- issued_at (DateTime)
- certificate_url (String)
- is_public (Boolean)

Badge Model:
- badge_id (PK)
- user_id (FK to users.id)
- badge_type (String) - enum value
- awarded_at (DateTime)
- description (Text)

ModuleProgress tracking (existing):
- module_id, user_id, total_points_earned, is_completed
- Used to determine certificate eligibility

ProjectSubmission tracking (existing):
- points_earned, is_approved, deadline_status
- Used to calculate total points

AssessmentSubmission tracking (existing):
- points_earned, is_correct, deadline_status
- Used to calculate total points
=======

=== FUTURE ENHANCEMENTS ===

1. Leaderboard System
   - Global leaderboard (top users by points)
   - Course leaderboard
   - Time-based leaderboard (weekly, monthly)

2. Streak System
   - Track consecutive daily completions
   - Streak badges for 7, 14, 30-day streaks

3. Skill-based Badges
   - Track specific skill mastery
   - Award badges when all lessons in skill completed

4. Social Features
   - Helper badge for peer reviews
   - Reputation system
   - Student-to-student kudos

5. Advanced Analytics
   - Learning velocity
   - Performance trends
   - Predict completion probability
   - Recommend next courses based on performance

6. Gamification Levels
   - User level based on total points
   - Level progression milestones
   - Level-specific perks (early access to courses, etc.)
=======
"""
