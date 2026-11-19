#!/usr/bin/python3
"""Automated GitHub repository pre-check service.

Deterministic phase: validates the GitHub URL, fetches repository metadata and
file tree from the public GitHub REST API, and extracts key files/stack signals.
Latent phase: calls Groq (via `domains.ai.services.groq_client`) to produce a
3-bullet readiness check against the project's description and required_skills,
with a deterministic fallback if the LLM is unavailable.
"""
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import httpx

from domains.ai.services import groq_client

logger = logging.getLogger(__name__)

_GITHUB_HOSTS = {"github.com", "www.github.com"}
_MANIFEST_FILES = {
    "package.json": "Node.js / JS",
    "requirements.txt": "Python",
    "pyproject.toml": "Python",
    "pipfile": "Python",
    "go.mod": "Go",
    "cargo.toml": "Rust",
    "pom.xml": "Java",
    "gemfile": "Ruby",
    "composer.json": "PHP",
}
_KEY_SOURCE_CANDIDATES = (
    "readme.md",
    "main.py",
    "app.py",
    "api/main.py",
    "src/main.py",
    "src/index.ts",
    "src/index.js",
    "src/app.tsx",
    "app/page.tsx",
    "index.html",
    "package.json",
    "requirements.txt",
)


def parse_github_repo_url(url: str) -> Optional[Tuple[str, str]]:
    """Extract (owner, repo) from a public GitHub URL, or return None."""
    if not url or not isinstance(url, str):
        return None
    raw = url.strip()
    if not raw:
        return None
    if not raw.startswith(("http://", "https://")):
        raw = f"https://{raw}"
    parsed = urlparse(raw)
    if parsed.netloc.lower() not in _GITHUB_HOSTS:
        return None
    parts = [p for p in parsed.path.split("/") if p]
    if len(parts) < 2:
        return None
    owner = parts[0]
    repo = parts[1]
    if repo.endswith(".git"):
        repo = repo[:-4]
    if not re.match(r"^[A-Za-z0-9_.-]+$", owner) or not re.match(r"^[A-Za-z0-9_.-]+$", repo):
        return None
    return owner, repo


def _github_headers() -> Dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "ai-mentor-repo-precheck",
    }
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _build_blocked_response(
    repo_full_name: Optional[str],
    summary: str,
    bullets: List[str],
    is_valid_github_url: bool = True,
    is_public: bool = False,
    is_empty: bool = False,
) -> Dict[str, Any]:
    return {
        "is_valid_github_url": is_valid_github_url,
        "repo_full_name": repo_full_name,
        "is_public": is_public,
        "is_empty": is_empty,
        "default_branch": None,
        "file_count": 0,
        "has_readme": False,
        "detected_stack": [],
        "key_files": [],
        "readiness_status": "blocked",
        "summary": summary,
        "bullets": bullets[:3],
    }


def _extract_deterministic_signals(
    repo_meta: Dict[str, Any],
    tree_paths: List[str],
) -> Dict[str, Any]:
    lower_map = {p.lower(): p for p in tree_paths}
    has_readme = any(name.startswith("readme") for name in lower_map)
    has_gitignore = ".gitignore" in lower_map
    has_tests = any("test" in p.lower() or "spec" in p.lower() for p in tree_paths)

    detected_stack: List[str] = []
    primary_lang = repo_meta.get("language")
    if primary_lang:
        detected_stack.append(str(primary_lang))

    for manifest, stack_name in _MANIFEST_FILES.items():
        if any(p.lower().endswith(f"/{manifest}") or p.lower() == manifest for p in tree_paths):
            if stack_name not in detected_stack:
                detected_stack.append(stack_name)

    key_files: List[str] = []
    for candidate in _KEY_SOURCE_CANDIDATES:
        if candidate in lower_map and lower_map[candidate] not in key_files:
            key_files.append(lower_map[candidate])
    for path in tree_paths:
        if len(key_files) >= 12:
            break
        if path not in key_files and not path.startswith("."):
            key_files.append(path)

    return {
        "has_readme": has_readme,
        "has_gitignore": has_gitignore,
        "has_tests": has_tests,
        "detected_stack": detected_stack,
        "key_files": key_files[:12],
    }


def _deterministic_fallback_bullets(
    project: Any,
    signals: Dict[str, Any],
    file_count: int,
) -> Tuple[str, List[str]]:
    bullets: List[str] = []
    needs_attention = False

    key_files = signals["key_files"]
    sample_list = ", ".join(key_files[:4]) if key_files else "source files"
    bullets.append(
        f"Public repository verified with {file_count} files (including {sample_list})."
    )

    if signals["has_readme"]:
        bullets.append("README documentation is present for your mentor to review setup steps.")
    else:
        needs_attention = True
        bullets.append("Missing a README.md — add setup and run instructions before submitting to your mentor.")

    required_skills = [str(s) for s in (getattr(project, "required_skills", None) or [])]
    if not signals["has_tests"]:
        needs_attention = True
        bullets.append("No test files detected yet — consider adding basic verification tests or edge-case checks.")
    elif required_skills:
        bullets.append(f"Confirm your implementation covers the project requirements ({', '.join(required_skills[:3])}).")
    else:
        bullets.append("Repository structure looks clean and ready for mentor review.")

    status = "needs_attention" if needs_attention else "ready"
    return status, bullets


def _parse_llm_bullets(raw: Optional[str]) -> Optional[List[str]]:
    if not raw:
        return None
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", cleaned)
        cleaned = re.sub(r"\n?```$", "", cleaned).strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            items = [str(x).strip() for x in parsed if str(x).strip()]
            if len(items) >= 3:
                return items[:3]
    except Exception:
        pass
    lines = [
        re.sub(r"^[-*\d.)\s]+", "", line).strip()
        for line in cleaned.splitlines()
        if line.strip()
    ]
    if len(lines) >= 3:
        return lines[:3]
    return None


async def run_github_precheck(project: Any, repo_url: str) -> Dict[str, Any]:
    """Run deterministic GitHub API inspection + AI readiness feedback."""
    parsed = parse_github_repo_url(repo_url)
    if not parsed:
        return _build_blocked_response(
            repo_full_name=None,
            is_valid_github_url=False,
            summary="Please enter a valid public GitHub repository URL (https://github.com/owner/repo).",
            bullets=[
                "URL does not match https://github.com/<username>/<repository>.",
                "Automated pre-check only inspects public GitHub repositories.",
                "You can still submit non-GitHub links (like CodeSandbox or live demos) directly if needed.",
            ],
        )

    owner, repo = parsed
    full_name = f"{owner}/{repo}"
    headers = _github_headers()

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            meta_resp = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
            if meta_resp.status_code == 404:
                return _build_blocked_response(
                    repo_full_name=full_name,
                    summary=f"Repository {full_name} was not found or is private.",
                    bullets=[
                        f"GitHub returned 404 for {full_name} — check the repo name or make sure it is set to Public.",
                        "Mentors cannot review private repositories without access.",
                        "Once public, run Pre-Check again before submitting.",
                    ],
                )
            if meta_resp.status_code in (403, 429):
                return _build_blocked_response(
                    repo_full_name=full_name,
                    is_public=True,
                    summary="GitHub API rate limit reached while checking repository.",
                    bullets=[
                        "GitHub temporarily rate-limited unauthenticated repo inspection.",
                        "Double-check that your repo is public and contains a README.md.",
                        "You can retry in a minute or submit directly to your mentor.",
                    ],
                )
            if meta_resp.status_code >= 400:
                return _build_blocked_response(
                    repo_full_name=full_name,
                    summary=f"GitHub returned status {meta_resp.status_code} for {full_name}.",
                    bullets=[
                        "Could not read repository metadata from GitHub.",
                        "Verify the repository URL opens in an incognito browser tab.",
                        "Retry the pre-check once the repository is accessible.",
                    ],
                )

            repo_meta = meta_resp.json()
            if repo_meta.get("private"):
                return _build_blocked_response(
                    repo_full_name=full_name,
                    summary=f"Repository {full_name} is private.",
                    bullets=[
                        "Switch repository visibility to Public in GitHub Settings.",
                        "Ensure your latest commits are pushed to the default branch.",
                        "Re-run Pre-Check once public.",
                    ],
                )

            default_branch = repo_meta.get("default_branch") or "main"
            if repo_meta.get("size", 0) == 0:
                return _build_blocked_response(
                    repo_full_name=full_name,
                    is_public=True,
                    is_empty=True,
                    summary=f"Repository {full_name} is public but currently empty.",
                    bullets=[
                        "No commits or files were found on GitHub yet.",
                        "Push your project files and a README.md to the main branch.",
                        "Re-run Pre-Check after pushing your first commit.",
                    ],
                )

            tree_resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1",
                headers=headers,
            )
            tree_paths: List[str] = []
            if tree_resp.status_code == 200:
                tree_data = tree_resp.json()
                tree_paths = [
                    item["path"]
                    for item in tree_data.get("tree", [])
                    if item.get("type") == "blob" and item.get("path")
                ][:200]

            if not tree_paths:
                return _build_blocked_response(
                    repo_full_name=full_name,
                    is_public=True,
                    is_empty=True,
                    summary=f"Repository {full_name} has no committed files on branch '{default_branch}'.",
                    bullets=[
                        f"Branch '{default_branch}' appears empty.",
                        "Commit and push your code plus a README.md.",
                        "Re-run Pre-Check once files are visible on GitHub.",
                    ],
                )

            signals = _extract_deterministic_signals(repo_meta, tree_paths)

            # Sample up to 2 small files (README + 1 code/config file) for deeper AI check
            file_snippets: List[str] = []
            sample_targets = [
                p for p in signals["key_files"]
                if p.lower().endswith((".md", ".py", ".ts", ".tsx", ".js", ".json"))
            ][:2]
            for path in sample_targets:
                try:
                    raw_resp = await client.get(
                        f"https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/{path}",
                        headers={"User-Agent": "ai-mentor-repo-precheck"},
                    )
                    if raw_resp.status_code == 200 and raw_resp.text:
                        file_snippets.append(f"--- {path} ---\n{raw_resp.text[:1800]}")
                except Exception:
                    pass

    except httpx.TimeoutException:
        return _build_blocked_response(
            repo_full_name=full_name,
            summary="Timed out connecting to GitHub API.",
            bullets=[
                "GitHub took too long to respond.",
                "Confirm your link is valid and retry in a few seconds.",
                "You may still submit directly to your mentor.",
            ],
        )
    except Exception as exc:
        logger.error(f"GitHub precheck network error for {full_name}: {exc}")
        return _build_blocked_response(
            repo_full_name=full_name,
            summary="Could not inspect repository right now.",
            bullets=[
                "Unexpected error while querying GitHub.",
                "Confirm the repository is public and retry.",
                "You can still submit directly to your mentor.",
            ],
        )

    fallback_status, fallback_bullets = _deterministic_fallback_bullets(
        project=project,
        signals=signals,
        file_count=len(tree_paths),
    )

    project_title = getattr(project, "title", "Student Project")
    project_desc = (getattr(project, "description", "") or "")[:900]
    required_skills = ", ".join(getattr(project, "required_skills", None) or []) or "Not specified"

    system_prompt = (
        "You are a concise, supportive engineering mentor running a pre-submission check on a student's GitHub repo. "
        "Return ONLY a JSON array of exactly 3 short, specific readiness bullets (strings, max 140 chars each). "
        "Bullet 1: what key files/stack you found. "
        "Bullet 2: what looks solid against the project requirements. "
        "Bullet 3: the single most important gap or improvement (or confirmation it's ready to submit)."
    )
    user_prompt = (
        f"Project: {project_title}\n"
        f"Required Skills: {required_skills}\n"
        f"Description: {project_desc}\n\n"
        f"Repo: {full_name} (branch: {default_branch}, {len(tree_paths)} files)\n"
        f"Detected Stack: {', '.join(signals['detected_stack']) or 'Unknown'}\n"
        f"Has README: {signals['has_readme']}, Has Tests: {signals['has_tests']}\n"
        f"Files: {', '.join(tree_paths[:25])}\n\n"
        f"Snippets:\n{chr(10).join(file_snippets) if file_snippets else 'None sampled'}"
    )

    ai_raw = await groq_client.generate_text(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=280,
        temperature=0.3,
    )
    ai_bullets = _parse_llm_bullets(ai_raw)
    bullets = ai_bullets or fallback_bullets

    readiness_status = fallback_status
    if not signals["has_readme"] or len(tree_paths) < 2:
        readiness_status = "needs_attention"

    summary = (
        f"Inspected {full_name}: {len(tree_paths)} files on '{default_branch}'."
        if readiness_status == "ready"
        else f"Inspected {full_name}: {len(tree_paths)} files found, review the items below before submitting."
    )

    return {
        "is_valid_github_url": True,
        "repo_full_name": full_name,
        "is_public": True,
        "is_empty": False,
        "default_branch": default_branch,
        "file_count": len(tree_paths),
        "has_readme": signals["has_readme"],
        "detected_stack": signals["detected_stack"],
        "key_files": signals["key_files"],
        "readiness_status": readiness_status,
        "summary": summary,
        "bullets": bullets,
    }
