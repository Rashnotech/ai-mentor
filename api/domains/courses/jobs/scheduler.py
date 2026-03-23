#!/usr/bin/python3
"""
Background Job Scheduler
Uses APScheduler to run scheduled jobs.
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from domains.courses.jobs.module_availability_job import run_module_availability_job
from domains.bootcamps.jobs.bootcamp_start_job import run_bootcamp_start_job

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = AsyncIOScheduler()


def setup_scheduled_jobs():
    """
    Configure and set up all scheduled jobs.
    Call this during application startup.
    """
    # Module Availability Job - Runs daily at 6:00 AM UTC
    scheduler.add_job(
        run_module_availability_job,
        CronTrigger(hour=6, minute=0, timezone="UTC"),
        id="module_availability_job",
        name="Unlock modules based on registration date",
        replace_existing=True,
        misfire_grace_time=3600,  # Allow up to 1 hour delay
    )
    
    # Bootcamp Start Job - Runs daily at 0:05 AM UTC
    # Runs early to update bootcamp status and enroll users before they wake up
    scheduler.add_job(
        run_bootcamp_start_job,
        CronTrigger(hour=0, minute=5, timezone="UTC"),
        id="bootcamp_start_job",
        name="Start bootcamps and auto-enroll users in linked courses",
        replace_existing=True,
        misfire_grace_time=3600,  # Allow up to 1 hour delay
    )
    
    logger.info("Scheduled jobs configured:")
    logger.info(" - Module Availability Job: Daily at 6:00 AM UTC")
    logger.info(" - Bootcamp Start Job: Daily at 0:05 AM UTC")


def start_scheduler():
    """Start the background scheduler."""
    if not scheduler.running:
        scheduler.start()
        logger.info("Background scheduler started")


def stop_scheduler():
    """Stop the background scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler stopped")


def get_scheduled_jobs():
    """Get list of all scheduled jobs and their next run times."""
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger),
        })
    return jobs
