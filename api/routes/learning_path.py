#!/usr/bin/python3
"""a module that generate personalized path for user"""
from api.models.learning_path import (PersonalizedPath, OnboardingAssessment,
                                      BehavioralSignals, SkillLevel, UserGoal, ModuleItem)
from api.services.heuristic_engine import HeuristicEngine
from fastapi import APIRouter


router = APIRouter()


@router.post("/generate-path", response_model=PersonalizedPath)
async def generate_learning_path(
    assessment: OnboardingAssessment, 
    signals: BehavioralSignals
):
    # 1. Classification Phase
    archetype = HeuristicEngine.analyze_behavior(signals)
    
    # 2. Skill Calibration (Simple Logic for demo)
    # If they claimed beginner but solved warmup in 30 seconds with 0 errors, bump to Intermediate
    calibrated_level = assessment.initial_skill_self_report
    if (assessment.initial_skill_self_report == SkillLevel.BEGINNER 
        and signals.warmup_task_duration_seconds < 60 
        and signals.error_count_before_success == 0):
        calibrated_level = SkillLevel.INTERMEDIATE

    # 3. Prompt Engineering (This would go to OpenAI/Anthropic/Gemini)
    llm_prompt = HeuristicEngine.generate_llm_prompt(assessment, archetype, signals)
    
    # print(llm_prompt) # For debugging
    
    # 4. Mock LLM Response (In production, this is an API call returning JSON)
    # Simulating a response for a "Startup Builder" who is "Project First"
    
    mock_curriculum = []
    
    if assessment.selected_goal == UserGoal.BUILD_STARTUP:
        mock_curriculum = [
            ModuleItem(title="Boilerplate Setup (FastAPI + React)", type="project", estimated_duration_minutes=45, scaffolding_level="medium"),
            ModuleItem(title="User Auth & Database Schema", type="project", estimated_duration_minutes=90, scaffolding_level="low"),
            ModuleItem(title="Stripe Integration MVP", type="project", estimated_duration_minutes=60, scaffolding_level="high"),
        ]
        skip_list = ["Python Syntax Basics", "Data Structures Theory", "Sorting Algorithms"]
        strategy = "Speed-run mode. Skipping theory. Focusing on shipping code."
        persona = "Co-founder CTO style. Direct, pragmatic, focuses on 'does it work?'"
        
    elif assessment.selected_goal == UserGoal.GET_JOB:
        mock_curriculum = [
            ModuleItem(title="Advanced Data Structures", type="lesson", estimated_duration_minutes=60, scaffolding_level="medium"),
            ModuleItem(title="Clean Code & Design Patterns", type="lesson", estimated_duration_minutes=45, scaffolding_level="low"),
            ModuleItem(title="Mock Interview: System Design", type="quiz", estimated_duration_minutes=30, scaffolding_level="low"),
        ]
        skip_list = ["Hello World", "Basic Loops"]
        strategy = "Professional polish. Strict linting enforced. Focus on testing."
        persona = "Senior Engineer Interviewer. Strict, demands best practices."
    
    else:
        # Generic fallback
        mock_curriculum = [ModuleItem(title="Python Basics", type="lesson", estimated_duration_minutes=30, scaffolding_level="high")]
        skip_list = []
        strategy = "Standard pacing."
        persona = "Friendly Tutor."

    return PersonalizedPath(
        user_id=assessment.user_id,
        learner_archetype=archetype,
        detected_skill_level=calibrated_level,
        strategy_summary=strategy,
        modules_to_skip=skip_list,
        curriculum=mock_curriculum,
        mentor_persona_instruction=persona
    )
