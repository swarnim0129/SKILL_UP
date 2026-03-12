from __future__ import annotations
"""
Job Matching Algorithm
Calculates relevance score between user skills and job requirements.
"""

from typing import Any, Dict, List
import logging

logger = logging.getLogger(__name__)


class JobMatcher:
    """Match jobs to user skills with advanced scoring."""

    @staticmethod
    def is_nan_or_empty(value: Any) -> bool:
        """Check if a value is NaN, None, empty, or placeholder text."""
        if value is None:
            return True

        str_value = str(value).strip().lower()
        nan_values = [
            "",
            "nan",
            "none",
            "null",
            "n/a",
            "na",
            "not specified",
            "unknown",
            "unknown company",
            "not available",
            "undefined",
        ]
        return str_value in nan_values

    @staticmethod
    def count_nan_fields(job: Dict[str, Any]) -> int:
        """
        Count number of important fields that are NaN/empty.
        Lower count = better data quality.
        """
        nan_count = 0
        important_fields = [
            "company",
            "location",
            "title",
            "job_type",
            "experience_level",
            "salary",
            "description",
        ]

        for field in important_fields:
            value = job.get(field)
            if JobMatcher.is_nan_or_empty(value):
                nan_count += 1
            elif (
                field == "description"
                and isinstance(value, str)
                and len(value.strip()) < 50
            ):
                nan_count += 0.5

        return nan_count

    @staticmethod
    def calculate_data_completeness_score(job: Dict[str, Any]) -> int:
        """
        Calculate completeness score (0-20) based on available job data.
        Prioritizes jobs with complete information and no NaN values.
        """
        score = 0

        company = job.get("company")
        if not JobMatcher.is_nan_or_empty(company):
            score += 5

        location = job.get("location")
        if not JobMatcher.is_nan_or_empty(location):
            score += 4

        salary = job.get("salary")
        if not JobMatcher.is_nan_or_empty(salary):
            score += 3

        job_type = job.get("job_type")
        if not JobMatcher.is_nan_or_empty(job_type):
            score += 2

        exp_level = job.get("experience_level")
        if not JobMatcher.is_nan_or_empty(exp_level):
            score += 2

        company_info = job.get("company_info")
        if company_info and isinstance(company_info, dict) and len(company_info) > 0:
            score += 2

        description = job.get("description")
        if (
            not JobMatcher.is_nan_or_empty(description)
            and isinstance(description, str)
            and len(description.strip()) > 100
        ):
            score += 2

        return score

    @staticmethod
    def calculate_skill_match_score(
        user_skills: List[str], job_skills: List[str]
    ) -> Dict[str, Any]:
        """
        Calculate detailed skill match score (0-70) with weighted matching.
        """
        if not user_skills or not isinstance(user_skills, list):
            user_skills = []
        if not job_skills or not isinstance(job_skills, list):
            job_skills = []

        user_skills = [s for s in user_skills if s and isinstance(s, str)]
        job_skills = [s for s in job_skills if s and isinstance(s, str)]

        if not user_skills:
            return {
                "match_score": 0,
                "matched_skills": [],
                "missing_skills": job_skills,
                "match_percentage": 0,
            }

        if not job_skills:
            return {
                "match_score": 35,
                "matched_skills": [],
                "missing_skills": [],
                "match_percentage": 50,
            }

        user_skills_normalized = {s.lower().strip(): s for s in user_skills}
        job_skills_normalized = [(s, s.lower().strip()) for s in job_skills]

        exact_matches: List[str] = []
        partial_matches: List[str] = []
        missing: List[str] = []

        for job_skill, job_skill_normalized in job_skills_normalized:
            matched = False

            if job_skill_normalized in user_skills_normalized:
                exact_matches.append(job_skill)
                matched = True
            else:
                for user_skill_norm, _ in user_skills_normalized.items():
                    if job_skill_normalized in user_skill_norm or user_skill_norm in job_skill_normalized:
                        partial_matches.append(job_skill)
                        matched = True
                        break

            if not matched:
                missing.append(job_skill)

        total_required = len(job_skills)
        exact_weight = 1.0
        partial_weight = 0.7

        weighted_matches = len(exact_matches) * exact_weight + len(
            partial_matches
        ) * partial_weight

        if total_required > 0:
            match_percentage = (weighted_matches / total_required) * 100
            base_score = (match_percentage / 100) * 60
        else:
            match_percentage = 50
            base_score = 30

        matched_count = len(exact_matches) + len(partial_matches)
        if matched_count > 0:
            extra_skills = len(user_skills) - matched_count
            if extra_skills > 0:
                bonus = min(10, extra_skills * 1.5)
                base_score += bonus

        final_score = min(70, base_score)
        all_matched = exact_matches + partial_matches

        return {
            "match_score": round(final_score, 1),
            "matched_skills": all_matched,
            "missing_skills": missing,
            "match_percentage": round(match_percentage, 1),
        }

    @staticmethod
    def calculate_title_relevance_score(
        job_title: str, user_skills: List[str], user_interests: List[str] | None = None
    ) -> int:
        """Calculate relevance based on job title matching user profile (0-10)."""
        if not job_title or not isinstance(job_title, str):
            return 0

        title_lower = job_title.strip().lower()
        if not title_lower:
            return 0

        score = 0

        user_skills_lower = [s.lower() for s in user_skills] if user_skills else []
        for skill in user_skills_lower:
            if skill in title_lower:
                score += 3
                break

        if user_interests:
            user_interests_lower = [i.lower() for i in user_interests]
            for interest in user_interests_lower:
                if interest in title_lower:
                    score += 3
                    break

        if len(user_skills) >= 8 and any(
            term in title_lower
            for term in ["senior", "lead", "principal", "staff"]
        ):
            score += 2

        if len(user_skills) <= 3 and any(
            term in title_lower for term in ["junior", "entry", "intern", "graduate"]
        ):
            score += 2

        return min(10, score)

    @staticmethod
    def calculate_comprehensive_match_score(
        job: Dict[str, Any],
        user_skills: List[str],
        user_interests: List[str] | None = None,
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive match score (1-100) combining:
        - Skill matching: 0-70
        - Data completeness: 0-20
        - Title relevance: 0-10
        """
        job_skills = job.get("required_skills", []) or []
        job_title = job.get("title", "") or ""

        if not isinstance(job_skills, list):
            job_skills = []
        if not isinstance(job_title, str):
            job_title = ""

        skill_match = JobMatcher.calculate_skill_match_score(user_skills, job_skills)
        completeness_score = JobMatcher.calculate_data_completeness_score(job)
        title_score = JobMatcher.calculate_title_relevance_score(
            job_title, user_skills, user_interests
        )

        total_score = skill_match["match_score"] + completeness_score + title_score

        if total_score < 1 and (user_skills or job_skills):
            total_score = 1

        total_score = min(100, round(total_score, 1))

        return {
            "match_score": total_score,
            "matched_skills": skill_match["matched_skills"],
            "missing_skills": skill_match["missing_skills"],
            "match_percentage": skill_match["match_percentage"],
            "completeness_score": completeness_score,
            "title_relevance_score": title_score,
            "skill_match_score": skill_match["match_score"],
        }

    @staticmethod
    def rank_jobs(
        jobs: List[Dict[str, Any]],
        user_skills: List[str],
        user_interests: List[str] | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Rank jobs with priority:
        1. Jobs with no NaN values first (sorted by match score)
        2. Jobs with fewer NaN values next
        3. Jobs with many NaN values last
        """
        ranked_jobs: List[Dict[str, Any]] = []

        for job in jobs:
            try:
                nan_count = JobMatcher.count_nan_fields(job)
                match_data = JobMatcher.calculate_comprehensive_match_score(
                    job, user_skills, user_interests
                )

                ranked_job = {
                    **job,
                    "match_score": match_data["match_score"],
                    "matched_skills": match_data["matched_skills"],
                    "missing_skills": match_data["missing_skills"],
                    "match_percentage": match_data.get("match_percentage", 0),
                    "completeness_score": match_data["completeness_score"],
                    "nan_count": nan_count,
                    "has_complete_data": nan_count == 0,
                    "has_good_data": nan_count <= 2,
                }
                ranked_jobs.append(ranked_job)
            except Exception as e:  # noqa: BLE001
                logger.error(
                    "Error scoring job %s: %s",
                    job.get("job_id", "unknown"),
                    str(e),
                )
                ranked_jobs.append(
                    {
                        **job,
                        "match_score": 1,
                        "matched_skills": [],
                        "missing_skills": [],
                        "match_percentage": 0,
                        "completeness_score": 0,
                        "nan_count": 99,
                        "has_complete_data": False,
                        "has_good_data": False,
                    }
                )

        ranked_jobs.sort(key=lambda x: (x["nan_count"], -x["match_score"]))

        complete_count = sum(1 for j in ranked_jobs if j["has_complete_data"])
        good_count = sum(1 for j in ranked_jobs if j["has_good_data"])

        logger.info("Ranked %d jobs by data quality and match score", len(ranked_jobs))
        logger.info("Perfect jobs (no NaN): %d", complete_count)
        logger.info("Good jobs (≤2 NaN): %d", good_count)

        return ranked_jobs


job_matcher = JobMatcher()

