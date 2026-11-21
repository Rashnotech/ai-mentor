#!/usr/bin/python3
"""5-business-day programme schedule and pace engine (Algorithm A + Algorithm B).

Excludes weekends (Saturday and Sunday) from all start/end and module window
calculations, and supports both Cohort (fixed start date) and Self-Paced
(enrollment start date) anchors.
"""
from datetime import date, datetime, timedelta, timezone
import math
from typing import Any, Dict, List, Optional


DEFAULT_PROGRAMME_BUSINESS_DAYS = 5
DEFAULT_DAILY_TARGET_HOURS = 1.5


def next_business_day(dt: datetime) -> datetime:
    """Snap a datetime forward to Monday if it falls on Saturday (5) or Sunday (6)."""
    current = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    while current.weekday() >= 5:
        current = current + timedelta(days=1)
    return current


def add_business_days(start_dt: datetime, business_days: int) -> datetime:
    """Add N business days (skipping Saturday and Sunday) to start_dt."""
    current = next_business_day(start_dt)
    remaining = max(0, int(business_days))
    while remaining > 0:
        current = current + timedelta(days=1)
        if current.weekday() < 5:
            remaining -= 1
    return current


def count_business_days_inclusive(start_date: date, end_date: date) -> int:
    """Count weekdays (Mon-Fri) between start_date and end_date inclusive."""
    if end_date < start_date:
        return 0
    total = 0
    cur = start_date
    while cur <= end_date:
        if cur.weekday() < 5:
            total += 1
        cur = cur + timedelta(days=1)
    return total


def resolve_programme_anchor(
    enrolled_at: datetime,
    cohort_start_date: Optional[datetime] = None,
) -> datetime:
    """Resolve Day 1 anchor for Cohort or Self-Paced enrollment, excluding weekends."""
    if cohort_start_date is not None:
        base = max(enrolled_at, cohort_start_date)
    else:
        base = enrolled_at
    return next_business_day(base)


def compute_module_windows(
    anchor_dt: datetime,
    modules: List[Any],
    duration_business_days: int = DEFAULT_PROGRAMME_BUSINESS_DAYS,
) -> List[Dict[str, Any]]:
    """Algorithm A: Map modules into N business-day buckets by cumulative estimated_hours."""
    day_1 = next_business_day(anchor_dt)
    if not modules:
        return []

    ordered = sorted(modules, key=lambda m: getattr(m, "order", 0) or 0)
    hours_list = [max(float(getattr(m, "estimated_hours", None) or 1.0), 0.5) for m in ordered]
    total_hours = sum(hours_list) or 1.0

    windows: List[Dict[str, Any]] = []
    cumulative = 0.0
    for mod, mod_hours in zip(ordered, hours_list):
        start_ratio = cumulative / total_hours
        cumulative += mod_hours
        end_ratio = cumulative / total_hours

        start_day = min(duration_business_days, max(1, int(math.floor(start_ratio * duration_business_days)) + 1))
        due_day = min(duration_business_days, max(start_day, int(math.ceil(end_ratio * duration_business_days))))

        unlock_at = add_business_days(day_1, start_day - 1)
        due_at = add_business_days(day_1, due_day - 1)
        windows.append(
            {
                "module_id": getattr(mod, "module_id"),
                "order": getattr(mod, "order", 0),
                "start_day": start_day,
                "due_day": due_day,
                "unlock_at": unlock_at,
                "due_at": due_at,
            }
        )
    return windows


def compute_pace_status(
    today_date: date,
    start_at: datetime,
    end_at: datetime,
    incomplete_hours: float,
    daily_target_hours: float = DEFAULT_DAILY_TARGET_HOURS,
    duration_business_days: int = DEFAULT_PROGRAMME_BUSINESS_DAYS,
) -> Dict[str, Any]:
    """Algorithm B: Remaining-business-days horizon & pace classification."""
    start_d = start_at.date()
    end_d = end_at.date()

    business_days_elapsed = min(
        duration_business_days,
        max(1, count_business_days_inclusive(start_d, min(today_date, end_d))) if today_date >= start_d else 0,
    )
    business_days_left = count_business_days_inclusive(max(today_date, start_d), end_d)
    hours_remaining = round(max(0.0, float(incomplete_hours)), 1)

    if today_date > end_d:
        pace_status = "ended"
        required_daily_hours = hours_remaining
    else:
        required_daily_hours = round(hours_remaining / max(business_days_left, 1), 1)
        if required_daily_hours <= daily_target_hours:
            pace_status = "on_track"
        elif required_daily_hours <= daily_target_hours * 2:
            pace_status = "at_risk"
        else:
            pace_status = "behind"

    return {
        "duration_business_days": duration_business_days,
        "excludes_weekends": True,
        "start_date": start_at.isoformat(),
        "end_date": end_at.isoformat(),
        "current_business_day": business_days_elapsed,
        "business_days_left": business_days_left,
        "hours_remaining": hours_remaining,
        "required_daily_hours": required_daily_hours,
        "pace_status": pace_status,
    }
