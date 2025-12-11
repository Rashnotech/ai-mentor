#!/usr/bin/python3
"""Personalization model for learners"""


import time
from enum import Enum
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel, Field

class UserGoal(str, Enum):
    GET_JOB = "get_job"
    BUILD_STARTUP = "build_startup"
    LEARN_FUNDAMENTALS = "learn_fundamentals"
    EARN_CERTIFICATION = "earn_certification"
    SPECIFIC_PROJECT = "specific_project"

class LearnerArchetype(str, Enum):
    PROJECT_FIRST = "project_first"         # Learns by building
    INSTRUCTION_FIRST = "instruction_first" # Needs theory before practice
    PROMPT_HEAVY = "prompt_heavy"           # Relies too much on AI help
    INDEPENDENT = "independent"             # Solves without help
    SLOW_THOROUGH = "slow_thorough"         # Slow typing, low errors, high read time
    FAST_ERROR_PRONE = "fast_error_prone"   # Fast typing, high errors, low read time

class SkillLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class OnboardingAssessment(BaseModel):
    user_id: str
    selected_goal: UserGoal
    initial_skill_self_report: SkillLevel
    project_interest: Optional[str] = None # e.g., "Crypto bot", "E-commerce"

class BehavioralSignals(BaseModel):
    """
    Captured during the first 10 minutes or warm-up task.
    """
    user_id: str
    typing_speed_wpm: float
    error_count_before_success: int
    ai_mentor_requests: int
    warmup_task_duration_seconds: int
    avg_time_reading_instructions_seconds: float
    total_code_runs: int

# --- Output Models (The Blueprint) ---

class ModuleItem(BaseModel):
    title: str
    type: str # 'project', 'lesson', 'quiz'
    estimated_duration_minutes: int
    scaffolding_level: str # 'high', 'medium', 'low'

class PersonalizedPath(BaseModel):
    user_id: str
    learner_archetype: LearnerArchetype
    detected_skill_level: SkillLevel
    strategy_summary: str
    modules_to_skip: List[str]
    curriculum: List[ModuleItem]
    mentor_persona_instruction: str