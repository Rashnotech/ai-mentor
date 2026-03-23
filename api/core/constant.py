#!/usr/bin/python3
"""app enums for the ai mentor"""
from enum import Enum

class SkillLevel(Enum):
    BEGINNER = "Beginner"
    LOWER_INTERMEDIATE = "Lower-Intermediate"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"

class LearningMode(Enum):
    BOOTCAMP = "bootcamp"
    SELF_PACED = "self-paced"

class LearningStyle(Enum):
    PROJECT_FIRST = "Project-first"
    INSTRUCTION_FIRST = "Instruction-first"
    PROMPT_HEAVY = "Prompt-heavy"
    INDEPENDENT = "Independent"
    SLOW_BUT_THOROUGH = "Slow but thorough"
    FAST_BUT_ERROR_PRONE = "Fast but error-prone"

class UserGoal(Enum):
    GET_A_JOB = "Get a job"
    BUILD_A_STARTUP = "Build a startup"
    LEARN_FUNDAMENTALS = "Learn fundamentals"
    EARN_CERTIFICATION = "Earn certification"
    BUILD_A_PROJECT = "Build a specific project"

class ContentType(Enum):
    THEORY = "theory"
    CODING = "coding"
    DEBUGGING = "debugging"
    QUIZ = "quiz"

class ProgressStatus(Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
