from __future__ import annotations
"""
Tavily-powered Job Scraper
Searches the web for latest job postings.
"""

import hashlib
import logging
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List

import httpx

logger = logging.getLogger(__name__)


class TavilyJobScraper:
    """Scrape job postings using Tavily API."""

    def __init__(self) -> None:
        self.api_key = os.getenv("TAVILY_API_KEY")
        self.base_url = "https://api.tavily.com/search"
        self.cache_duration = timedelta(hours=24)

        if not self.api_key:
            logger.warning("⚠ TAVILY_API_KEY not found")
        else:
            logger.info("✓ Tavily Job Scraper initialized")

    async def search_jobs(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """
        Search for jobs using Tavily API.
        Searches broadly for actual job postings, not restricted to specific domains.
        """
        if not self.api_key:
            logger.error("❌ Tavily API key not configured")
            return []

        try:
            logger.info("🔎 Searching: '%s' (max %d results)", query, max_results)
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "api_key": self.api_key,
                    "query": query + " job posting hiring apply",
                    "search_depth": "advanced",
                    "max_results": max_results,
                    "include_answer": False,
                    "include_raw_content": True,
                }

                response = await client.post(self.base_url, json=payload)
                response.raise_for_status()
                data = response.json()

                results = data.get("results", [])

                filtered_results: List[Dict[str, Any]] = []
                for result in results:
                    url = result.get("url", "")
                    title = result.get("title", "").lower()

                    if any(x in url.lower() for x in ["/jobs?", "/jobs/", "/q-", "/search"]):
                        if any(
                            x in title
                            for x in ["jobs in", "jobs near", "jobs employment"]
                        ):
                            continue

                    filtered_results.append(result)

                logger.info(
                    "✓ Found %d actual job postings for '%s'",
                    len(filtered_results),
                    query,
                )
                return filtered_results

        except Exception as e:  # noqa: BLE001
            logger.error("✗ Tavily search failed for '%s': %s", query, e)
            return []

    async def scrape_jobs_by_keywords(self, keywords: List[str]) -> List[Dict[str, Any]]:
        """Scrape jobs for multiple keywords/job titles."""
        logger.info("🔍 Starting scrape for %d keywords...", len(keywords))
        all_jobs: List[Dict[str, Any]] = []

        for i, keyword in enumerate(keywords, 1):
            query = f"{keyword} jobs hiring 2026"
            logger.info("   [%d/%d] Searching: %s", i, len(keywords), keyword)
            results = await self.search_jobs(query, max_results=5)
            all_jobs.extend(results)

        logger.info(
            "📥 Total raw results scraped: %d from %d keywords",
            len(all_jobs),
            len(keywords),
        )
        return all_jobs

    async def parse_job_posting(self, raw_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse Tavily result into structured job data using regex and text parsing.
        No AI required - pure text extraction.
        """
        try:
            url = raw_result.get("url", "")
            title = raw_result.get("title", "")
            content = raw_result.get("content", "")
            raw_content = raw_result.get("raw_content", "")

            full_text = f"{title} {content} {raw_content}"

            source = "other"
            if "linkedin.com" in url:
                source = "linkedin"
            elif "indeed.com" in url:
                source = "indeed"
            elif "internshala.com" in url:
                source = "internshala"
            elif "greenhouse.io" in url:
                source = "greenhouse"
            elif "lever.co" in url:
                source = "lever"
            elif "workday.com" in url:
                source = "workday"

            company = "Unknown Company"
            company_patterns = [
                r"([A-Z][A-Za-z0-9\s&\.]{2,30})\s+is\s+(?:hiring|looking|seeking)",
                r"Join\s+([A-Z][A-Za-z0-9\s&\.]{2,30})\s+(?:as|team)",
                r"Company:\s*([A-Z][A-Za-z0-9\s&\.]{2,30})",
                r"at\s+([A-Z][A-Za-z0-9\s&\.]{2,30})\s*[-|·•]",
                r"Work\s+(?:at|for)\s+([A-Z][A-Za-z0-9\s&\.]{2,30})",
            ]
            for pattern in company_patterns:
                match = re.search(pattern, full_text)
                if match:
                    company = match.group(1).strip()
                    company = re.sub(r"[\s\-|·•]+$", "", company)
                    break

            if company == "Unknown Company":
                title_company_match = re.search(
                    r"\s+[-–|]\s+([A-Z][A-Za-z0-9\s&\.]{2,30})(?:\s|$)", title
                )
                if title_company_match:
                    company = title_company_match.group(1).strip()

            location = "Not specified"
            location_patterns = [
                r"Location:\s*([A-Z][a-z]+(?:,\s*[A-Z][A-Za-z\s]+)?)",
                r"(?:in|at)\s+([A-Z][a-z]+,\s*[A-Z]{2}(?:\s|,|$))",
                r"([A-Z][a-z]+,\s*(?:USA|Canada|India|UK|Germany|France))",
                r"\b(Remote|Hybrid|On-site)\b",
                r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s+([A-Z]{2,})\b",
            ]
            for pattern in location_patterns:
                match = re.search(pattern, full_text, re.IGNORECASE)
                if match:
                    location = match.group(1).strip()
                    break

            skill_keywords = [
                "Python",
                "Java",
                "JavaScript",
                "TypeScript",
                "C++",
                "C#",
                "Ruby",
                "Go",
                "Rust",
                "PHP",
                "React",
                "Angular",
                "Vue",
                "Node.js",
                "Express",
                "Django",
                "Flask",
                "Spring",
                "FastAPI",
                "AWS",
                "Azure",
                "GCP",
                "Docker",
                "Kubernetes",
                "Jenkins",
                "Git",
                "CI/CD",
                "SQL",
                "MongoDB",
                "PostgreSQL",
                "MySQL",
                "Redis",
                "Elasticsearch",
                "Machine Learning",
                "AI",
                "Deep Learning",
                "TensorFlow",
                "PyTorch",
                "Data Science",
                "REST API",
                "GraphQL",
                "Microservices",
                "Agile",
                "Scrum",
                "HTML",
                "CSS",
                "Tailwind",
                "Bootstrap",
                "SASS",
                "Linux",
                "Bash",
                "Shell",
                "DevOps",
                "Terraform",
                "Ansible",
            ]
            required_skills: List[str] = []
            for skill in skill_keywords:
                if re.search(
                    r"\b" + re.escape(skill) + r"\b", full_text, re.IGNORECASE
                ):
                    required_skills.append(skill)

            salary: str | None = None
            salary_patterns = [
                r"\$\s*(\d+[,\d]*)\s*-\s*\$?\s*(\d+[,\d]*)",
                r"(\d+[,\d]*)\s*-\s*(\d+[,\d]*)\s*(?:USD|INR|EUR)",
                r"salary:\s*\$?(\d+[,\d]*)",
            ]
            for pattern in salary_patterns:
                match = re.search(pattern, full_text, re.IGNORECASE)
                if match:
                    salary = match.group(0)
                    break

            job_type = "full-time"
            if re.search(r"\b(internship|intern)\b", full_text, re.IGNORECASE):
                job_type = "internship"
            elif re.search(r"\b(part[- ]time)\b", full_text, re.IGNORECASE):
                job_type = "part-time"
            elif re.search(r"\b(contract|freelance)\b", full_text, re.IGNORECASE):
                job_type = "contract"

            experience_level: str | None = None
            if re.search(
                r"\b(entry[- ]level|junior|fresher|0[- ]2 years)\b",
                full_text,
                re.IGNORECASE,
            ):
                experience_level = "entry"
            elif re.search(
                r"\b(senior|lead|principal|architect|staff)\b",
                full_text,
                re.IGNORECASE,
            ):
                experience_level = "senior"
            elif re.search(
                r"\b(mid[- ]level|intermediate|2[- ]5 years)\b",
                full_text,
                re.IGNORECASE,
            ):
                experience_level = "mid"

            job_id = hashlib.md5(url.encode()).hexdigest()[:16] if url else hashlib.md5(
                full_text.encode()
            ).hexdigest()[:16]

            job_data: Dict[str, Any] = {
                "job_id": job_id,
                "title": title,
                "company": company,
                "location": location,
                "description": content[:300] if content else "No description available",
                "required_skills": required_skills[:10],
                "url": url,
                "salary": salary,
                "job_type": job_type,
                "experience_level": experience_level,
                "source": source,
                "posted_date": None,
                "scraped_at": datetime.utcnow().isoformat(),
            }
            return job_data

        except Exception as e:  # noqa: BLE001
            logger.error("Failed to parse job: %s", e)
            url = raw_result.get("url", "")
            source = "unknown"
            if "linkedin.com" in url:
                source = "linkedin"
            elif "indeed.com" in url:
                source = "indeed"
            elif "internshala.com" in url:
                source = "internshala"

            return {
                "job_id": hashlib.md5(url.encode()).hexdigest()[:16] if url else "",
                "title": raw_result.get("title", "Job Posting"),
                "company": "Unknown",
                "location": "Not specified",
                "description": raw_result.get("content", "")[:300],
                "required_skills": [],
                "url": url,
                "salary": None,
                "job_type": "unspecified",
                "experience_level": None,
                "source": source,
                "posted_date": None,
                "scraped_at": datetime.utcnow().isoformat(),
            }

    async def fetch_and_parse_jobs(self, keywords: List[str]) -> List[Dict[str, Any]]:
        """Complete pipeline: search jobs then parse each result."""
        raw_results = await self.scrape_jobs_by_keywords(keywords)
        logger.info("🤖 Parsing %d job postings...", len(raw_results))
        parsed_jobs: List[Dict[str, Any]] = []

        for i, result in enumerate(raw_results, 1):
            logger.info(
                "   [%d/%d] Parsing: %s",
                i,
                len(raw_results),
                (result.get("title", "Unknown") or "")[:60],
            )
            job_data = await self.parse_job_posting(result)
            parsed_jobs.append(job_data)

        logger.info("✅ Successfully parsed %d jobs", len(parsed_jobs))
        internships = sum(1 for j in parsed_jobs if j.get("job_type") == "internship")
        full_time = sum(1 for j in parsed_jobs if j.get("job_type") == "full-time")
        logger.info(
            "📊 Summary: %d internships, %d full-time positions", internships, full_time
        )
        return parsed_jobs


tavily_scraper = TavilyJobScraper()

