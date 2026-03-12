"""
Job Scraper using JobSpy library
Scrapes jobs from LinkedIn, Indeed, ZipRecruiter, and Glassdoor.
"""

from datetime import datetime
import hashlib
import logging
from typing import Any, Dict, List, Optional

try:
    from jobspy import scrape_jobs
except ImportError:
    scrape_jobs = None

logger = logging.getLogger(__name__)


class JobSpyScraper:
    def __init__(self) -> None:
        self.supported_sites = ["linkedin", "indeed", "zip_recruiter", "glassdoor"]

    def scrape_jobs(
        self,
        search_term: str,
        location: str = "",
        results_wanted: int = 20,
        site_name: Optional[List[str]] = None,
        job_type: Optional[str] = None,
        is_remote: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Scrape jobs using JobSpy library.
        """
        try:
            if site_name is None:
                site_name = ["linkedin", "indeed"]

            logger.info(
                "🔍 Scraping jobs for: %s in %s",
                search_term,
                location or "All Locations",
            )
            logger.info(
                "📊 Target: %d jobs from %s", results_wanted, ", ".join(site_name)
            )
            logger.info("🏠 Remote only: %s", is_remote)

            if scrape_jobs is None:
                logger.warning("JobSpy not installed. Skipping LinkedIn/Indeed scrape.")
                return []

            jobs_df = scrape_jobs(
                site_name=site_name,
                search_term=search_term,
                location=location,
                results_wanted=results_wanted,
                hours_old=72,
                country_indeed="India" if "india" in location.lower() else "USA",
                job_type=job_type,
                is_remote=is_remote,
            )

            if jobs_df is None or jobs_df.empty:
                logger.warning("⚠️ No jobs found for %s", search_term)
                return []

            jobs_list = jobs_df.to_dict("records")
            logger.info("✅ Found %d jobs", len(jobs_list))
            return jobs_list

        except Exception as e:  # noqa: BLE001
            logger.error("❌ Error scraping jobs: %s", str(e))
            import traceback

            logger.error(traceback.format_exc())
            return []

    def parse_jobspy_result(self, job_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse JobSpy result into our job schema format.
        """
        try:
            title = str(job_data.get("title", "")).strip()
            company = str(job_data.get("company", "Unknown Company")).strip()
            location = str(job_data.get("location", "Not specified")).strip()
            description = str(job_data.get("description", ""))
            url = str(job_data.get("job_url", ""))

            salary: Optional[str] = None
            min_salary = job_data.get("min_amount")
            max_salary = job_data.get("max_amount")
            interval = job_data.get("interval", "")
            currency = job_data.get("currency", "")

            if min_salary and max_salary:
                salary = f"{currency}{min_salary:,.0f} - {currency}{max_salary:,.0f} {interval}"
            elif min_salary:
                salary = f"{currency}{min_salary:,.0f}+ {interval}"

            job_type = str(job_data.get("job_type", "fulltime")).lower()
            if job_type == "fulltime":
                job_type = "full-time"
            elif job_type == "parttime":
                job_type = "part-time"

            experience_level = "Not specified"
            is_remote = bool(job_data.get("is_remote", False))

            description_lower = description.lower()
            title_lower = title.lower()

            if any(term in title_lower for term in ["intern", "internship"]):
                experience_level = "Internship"
                job_type = "internship"
            elif any(
                term in title_lower + description_lower
                for term in ["entry", "junior", "graduate", "fresher"]
            ):
                experience_level = "Entry level"
            elif any(
                term in title_lower for term in ["senior", "sr.", "lead", "principal", "staff"]
            ):
                experience_level = "Senior"
            elif any(
                term in title_lower + description_lower
                for term in ["mid", "intermediate"]
            ):
                experience_level = "Mid-Senior level"

            skill_keywords = [
                "Python",
                "Java",
                "JavaScript",
                "TypeScript",
                "React",
                "Node.js",
                "Angular",
                "Vue.js",
                "C++",
                "C#",
                "Go",
                "Rust",
                "Swift",
                "Kotlin",
                "PHP",
                "Ruby",
                "Scala",
                "AWS",
                "Azure",
                "GCP",
                "Docker",
                "Kubernetes",
                "Jenkins",
                "CI/CD",
                "SQL",
                "MongoDB",
                "PostgreSQL",
                "MySQL",
                "Redis",
                "Elasticsearch",
                "Machine Learning",
                "Deep Learning",
                "TensorFlow",
                "PyTorch",
                "NLP",
                "React Native",
                "Flutter",
                "iOS",
                "Android",
                "Mobile Development",
                "Git",
                "Agile",
                "Scrum",
                "REST API",
                "GraphQL",
                "Microservices",
                "Django",
                "Flask",
                "FastAPI",
                "Spring Boot",
                "Express.js",
                "HTML",
                "CSS",
                "Sass",
                "Tailwind",
                "Bootstrap",
                "Linux",
                "Unix",
                "Bash",
                "Shell Scripting",
                "Data Science",
                "Data Analysis",
                "Pandas",
                "NumPy",
                "Tableau",
                "Power BI",
                "AI",
                "Artificial Intelligence",
                "LLM",
                "Generative AI",
            ]

            required_skills: List[str] = []
            full_text = f"{title} {description}".lower()

            for skill in skill_keywords:
                if skill.lower() in full_text:
                    required_skills.append(skill)

            required_skills = list(set(required_skills))

            job_id = str(
                job_data.get(
                    "job_id",
                    hashlib.md5(f"{company}_{title}_{url}".encode()).hexdigest(),
                )
            )

            source = str(job_data.get("site", "unknown")).lower()

            date_posted = job_data.get("date_posted")
            if date_posted and hasattr(date_posted, "isoformat"):
                posted_date = date_posted.isoformat()
            else:
                posted_date = (
                    str(date_posted) if date_posted else datetime.utcnow().isoformat()
                )

            company_url = str(job_data.get("company_url", ""))

            parsed_job: Dict[str, Any] = {
                "job_id": job_id,
                "title": title,
                "company": company,
                "location": location,
                "description": description,
                "required_skills": required_skills,
                "salary": salary,
                "job_type": job_type,
                "experience_level": experience_level,
                "url": url,
                "apply_link": url,
                "source": source,
                "posted_date": posted_date,
                "scraped_at": datetime.utcnow().isoformat(),
                "is_remote": is_remote,
                "company_info": {
                    "name": company,
                    "url": company_url,
                }
                if company_url
                else None,
            }

            return parsed_job

        except Exception as e:  # noqa: BLE001
            logger.error("❌ Error parsing job: %s", str(e))
            logger.error("Job data: %s", job_data)
            return None

    async def scrape_jobs_by_keywords(
        self,
        keywords_list: List[str],
        locations: List[str] = [""],
        max_jobs_per_search: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        Scrape jobs for multiple keywords and locations.
        """
        import asyncio

        all_jobs: List[Dict[str, Any]] = []
        loop = asyncio.get_event_loop()

        for keyword in keywords_list:
            for location in locations:
                try:
                    logger.info("🔍 Searching: %s in %s", keyword, location or "All Locations")
                    raw_jobs = await loop.run_in_executor(
                        None,
                        self.scrape_jobs,
                        keyword,
                        location,
                        max_jobs_per_search,
                        ["linkedin", "indeed"],
                        None,
                        False,
                    )

                    for raw_job in raw_jobs:
                        parsed_job = self.parse_jobspy_result(raw_job)
                        if parsed_job:
                            all_jobs.append(parsed_job)

                    await asyncio.sleep(1)

                except Exception as e:  # noqa: BLE001
                    logger.error("❌ Error scraping %s in %s: %s", keyword, location, str(e))
                    continue

        unique_jobs: Dict[str, Dict[str, Any]] = {}
        for job in all_jobs:
            unique_jobs[job["job_id"]] = job

        logger.info("✅ Total unique jobs scraped: %d", len(unique_jobs))
        return list(unique_jobs.values())


job_scraper = JobSpyScraper()

