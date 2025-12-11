#!/usr/bin/python3
"""Heuristic Engine for Learners"""
from api.models.learning_path import (BehavioralSignals, LearnerArchetype,
                                      PersonalizedPath, OnboardingAssessment)


class HeuristicEngine:
    """
    Analyzes raw signals to determine Learner Archetype.
    This is deterministic logic before we hand off to the LLM.
    """
    
    @staticmethod
    def analyze_behavior(signals: BehavioralSignals) -> LearnerArchetype:
        # Heuristic 1: Dependency on AI
        if signals.ai_mentor_requests > 5:
            return LearnerArchetype.PROMPT_HEAVY
            
        # Heuristic 2: The "Sprinter vs. Marathoner"
        # High errors + fast completion = Fast but Error Prone
        if signals.error_count_before_success > 4 and signals.warmup_task_duration_seconds < 120:
            return LearnerArchetype.FAST_ERROR_PRONE
            
        # Heuristic 3: Reading time vs Action
        # Low reading time + immediate code runs = Project First / Tinkerer
        if signals.avg_time_reading_instructions_seconds < 15 and signals.total_code_runs > 5:
            return LearnerArchetype.PROJECT_FIRST
            
        # Heuristic 4: Thoroughness
        # Low errors + slow typing + high read time = Slow but Thorough
        if signals.error_count_before_success <= 1 and signals.avg_time_reading_instructions_seconds > 45:
            return LearnerArchetype.SLOW_THOROUGH
            
        # Heuristic 5: Independence
        if signals.ai_mentor_requests == 0 and signals.error_count_before_success < 3:
            return LearnerArchetype.INDEPENDENT

        # Default fallback
        return LearnerArchetype.INSTRUCTION_FIRST

    @staticmethod
    def generate_llm_prompt(assessment: OnboardingAssessment, archetype: LearnerArchetype, signals: BehavioralSignals):
        """
        Constructs the structured context for the LLM to generate the JSON curriculum.
        """
        return f"""
        ACT AS: An Expert Technical Curriculum Architect.
        
        USER PROFILE:
        - Goal: {assessment.selected_goal.value}
        - Self-Reported Skill: {assessment.initial_skill_self_report.value}
        - Interest: {assessment.project_interest}
        
        BEHAVIORAL ANALYSIS (The "Truth"):
        - Archetype: {archetype.value.upper()}
        - Typing Speed: {signals.typing_speed_wpm} WPM
        - Error Rate: {signals.error_count_before_success} errors before success
        - AI Reliance: {signals.ai_mentor_requests} requests (0=Low, >5=High)
        
        INSTRUCTION RULES:
        1. If 'Project-First': Start with code immediately. Minimize theory text.
        2. If 'Fast Error-Prone': Force TDD (Test Driven Development) steps. Add "Code Review" checkpoints.
        3. If 'Job Seeker': Compress fundamentals, focus on Resume-Ready Artifacts (GitHub Actions, Deployments).
        4. If 'Startup Builder': Skip algorithmic theory, focus on MVP speed, Auth, Database, APIs.
        
        TASK:
        Generate a JSON learning path.
        - Identify modules to SKIP (because they are boring or too basic based on behavior).
        - Define specific scaffolding levels (High=Fill in blanks, Low=Blank file).
        """
