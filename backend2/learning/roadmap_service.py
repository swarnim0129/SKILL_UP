from __future__ import annotations
"""
Roadmap generation and course fetching service.
Ported from HACKSYNC's roadmap_service and adapted to ProjectMorpheus.
"""

import os
from datetime import datetime
from typing import Any, Dict, List

import httpx
import yt_dlp
from exa_py import Exa

from gemini_service import gemini_service
from logger import get_logger


logger = get_logger(__name__)


class RoadmapService:
    """
    Service to generate learning roadmaps and fetch resources.
    Uses Gemini for roadmap generation and YouTube + Udemy + Coursera for resources.
    """

    def __init__(self) -> None:
        self.gemini = gemini_service
        self.tavily_api_key = os.getenv("TAVILY_API_KEY")
        self.exa_api_key = os.getenv("EXA_API_KEY")
        self.exa: Exa | None = None

        if self.exa_api_key:
            try:
                self.exa = Exa(api_key=self.exa_api_key)
                logger.info("Roadmap service initialised with Exa AI client")
            except Exception as exc:  # pragma: no cover - defensive
                logger.error("Failed to initialise Exa client: %s", exc)
                self.exa = None

        logger.info("Roadmap service initialized")

    async def _generate_text(self, prompt: str) -> str:
        """
        Generate plain-text content using the shared Gemini HTTP service.
        """
        response_json = await self.gemini.generate(prompt)

        candidates = response_json.get("candidates", [])
        if not candidates:
            raise ValueError("No candidates in Gemini response")

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise ValueError("No content parts in Gemini response")

        return (parts[0].get("text") or "").strip()

    async def generate_roadmap(self, topic: str) -> Dict[str, Any]:
        """
        Generate learning roadmap using Gemini AI.
        Returns Mermaid code and list of node topics.
        """
        prompt = f"""Generate a comprehensive learning roadmap for: {topic}

STRICT REQUIREMENTS:
1. Create a progressive learning path from beginner to advanced
2. Include 8-12 nodes (topics/concepts)
3. Allow branching where concepts can be learned in parallel
4. Use ONLY this Mermaid syntax format:

flowchart TB
    A[Topic Name]
    B[Next Topic]
    C[Another Topic]
    A --> B
    A --> C
    B --> D[Advanced Topic]
    C --> D

RULES:
- Start with node A (fundamentals)
- Use square brackets [Topic Name] for regular nodes
- Use arrows --> to connect nodes
- Keep topic names short (2-4 words max)
- Include branching where appropriate (e.g., two paths converge later)
- End with advanced/specialized topics

Return ONLY the Mermaid code, nothing else, for the topic: {topic}.
"""

        mermaid_code = await self._generate_text(prompt)

        # Remove markdown code fences if Gemini wrapped the response
        if mermaid_code.startswith("```"):
            parts = mermaid_code.split("```")
            if len(parts) >= 2:
                mermaid_code = parts[1]
                if mermaid_code.lstrip().startswith("mermaid"):
                    mermaid_code = mermaid_code.lstrip()[7:].strip()

        topics = self._extract_topics_from_mermaid(mermaid_code)

        logger.info(
            "Generated roadmap for %s with %d nodes", topic, len(topics)
        )
        return {"mermaid_code": mermaid_code, "topics": topics}

    def _extract_topics_from_mermaid(self, mermaid_code: str) -> List[str]:
        """
        Extract topic names from Mermaid code (both [square] and {{diamond}} nodes).
        """
        import re

        topics: List[str] = []

        patterns = [
            r"[A-Z]+\[([^\]]+)\]",
            r"[A-Z]+\{\{([^}]+)\}\}",
        ]

        for pattern in patterns:
            matches = re.findall(pattern, mermaid_code)
            topics.extend(matches)

        # De-duplicate while preserving order
        seen = set()
        unique_topics: List[str] = []
        for topic in topics:
            clean = topic.strip()
            if clean and clean not in seen:
                seen.add(clean)
                unique_topics.append(clean)

        return unique_topics

    def fetch_youtube_resources(self, topic: str, max_results: int = 6) -> List[Dict[str, Any]]:
        """
        Fetch YouTube video resources using yt-dlp (no API key needed).
        """
        try:
            search_query = f"ytsearch{max_results}:{topic} tutorial"

            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "extract_flat": True,
                "force_generic_extractor": False,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                search_results = ydl.extract_info(search_query, download=False)

            resources: List[Dict[str, Any]] = []
            if search_results and "entries" in search_results:
                for video in search_results["entries"]:
                    if not video:
                        continue

                    duration_sec = video.get("duration", 0)
                    duration = "N/A"
                    if duration_sec:
                        hours = duration_sec // 3600
                        minutes = (duration_sec % 3600) // 60
                        seconds = duration_sec % 60
                        if hours > 0:
                            duration = f"{hours}h {minutes}m"
                        elif minutes > 0:
                            duration = f"{minutes}m {seconds}s"
                        else:
                            duration = f"{seconds}s"

                    video_id = video.get("id", "")
                    thumbnail = video.get(
                        "thumbnail",
                        f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
                        if video_id
                        else None,
                    )

                    resources.append(
                        {
                            "title": video.get("title", "Unknown"),
                            "url": f"https://www.youtube.com/watch?v={video_id}",
                            "platform": "YouTube",
                            "thumbnail": thumbnail,
                            "duration": duration,
                            "is_free": True,
                            "rating": None,
                            "instructor": video.get("channel", "Unknown"),
                        }
                    )

            logger.info(
                "Fetched %d YouTube resources for %s", len(resources), topic
            )
            return resources
        except Exception as exc:  # pragma: no cover - best-effort
            logger.error("YouTube search error for %s: %s", topic, exc)
            return []

    async def _search_tavily(
        self, query: str, include_domains: List[str], max_results: int
    ) -> List[Dict[str, Any]]:
        """
        Helper to query Tavily for course/resources (Coursera, Reddit, etc.).
        """
        if not self.tavily_api_key:
            logger.warning(
                "TAVILY_API_KEY not set; skipping Tavily search for '%s'",
                query,
            )
            return []

        payload = {
            "api_key": self.tavily_api_key,
            "query": query,
            "search_depth": "advanced",
            "max_results": max_results,
            "include_domains": include_domains,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post("https://api.tavily.com/search", json=payload)
                resp.raise_for_status()
                data = resp.json()
                return data.get("results", [])
        except Exception as exc:  # pragma: no cover
            logger.error("Tavily search failed for '%s': %s", query, exc)
            return []

    async def fetch_udemy_resources(
        self, topic: str, max_results: int = 8
    ) -> List[Dict[str, Any]]:
        """
        Fetch Udemy-style course resources via Exa AI (mirroring the harsh branch).
        Falls back to empty list if EXA_API_KEY is not configured.
        """
        if not self.exa:
            logger.warning("EXA_API_KEY not set; skipping Udemy Exa search for %s", topic)
            return []

        try:
            # Use Exa semantic search restricted to Udemy course pages
            search_query = f"{topic} site:udemy.com/course/ best course 2026"
            results = self.exa.search_and_contents(
                search_query,
                # Ask Exa for more results than we finally keep so we can filter.
                num_results=max_results * 2,
            )

            resources: List[Dict[str, Any]] = []
            for doc in results.results:
                url = getattr(doc, "url", "") or ""
                if "udemy.com" not in url:
                    continue

                # Exa's Result objects typically don't expose thumbnails directly;
                # we keep thumbnail=None so the frontend falls back gracefully.
                resources.append(
                    {
                        "title": getattr(doc, "title", None) or "Udemy Course",
                        "url": url,
                        "platform": "Udemy",
                        "thumbnail": None,
                        "duration": None,
                        "is_free": False,
                        "rating": None,
                        "instructor": None,
                    }
                )

            logger.info("Fetched %d Udemy courses via Exa for %s", len(resources), topic)
            return resources
        except Exception as exc:  # pragma: no cover
            logger.error("Udemy Exa search failed for '%s': %s", topic, exc)
            return []

    async def fetch_coursera_resources(
        self, topic: str, max_results: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Fetch Coursera-style course resources via Tavily (similar to harsh branch's coursera scraper).
        """
        results = await self._search_tavily(
            # Encourage Tavily to return actual course detail pages instead of articles
            f"best Coursera courses for {topic} 2026 site:coursera.org/learn OR site:coursera.org/specializations OR site:coursera.org/professional-certificates",
            ["coursera.org"],
            max_results * 2,
        )
        resources: List[Dict[str, Any]] = []

        for result in results:
            url = result.get("url", "")
            if "coursera.org" not in url:
                continue

            # Prefer canonical course URLs like /learn/, /specializations/, /professional-certificates
            path = url.split("coursera.org")[-1]
            if not any(
                segment in path
                for segment in ("/learn/", "/specializations/", "/professional-certificates/")
            ):
                continue

            # Tavily may expose thumbnails under different keys; try a few.
            thumbnail = (
                result.get("image_url")
                or result.get("thumbnail")
                or result.get("image")
                or result.get("favicon")
            )

            resources.append(
                {
                    "title": result.get("title", "Coursera Course"),
                    "url": url,
                    "platform": "Coursera",
                    "thumbnail": thumbnail,
                    "duration": None,
                    # Coursera is typically a paid experience (even if audit is free)
                    "is_free": False,
                    "rating": None,
                    "instructor": None,
                }
            )

        return resources

    async def fetch_reddit_resources(
        self, topic: str, max_results: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Fetch highly upvoted Reddit discussion threads for the topic.
        These give community perspective similar to the harsh branch's social signals.
        """
        results = await self._search_tavily(
            f"best reddit threads for learning {topic}",
            ["reddit.com"],
            max_results,
        )
        resources: List[Dict[str, Any]] = []

        for result in results:
            url = result.get("url", "")
            if "reddit.com" not in url:
                continue

            resources.append(
                {
                    "title": result.get("title", "Reddit discussion"),
                    "url": url,
                    "platform": "Reddit",
                    "thumbnail": None,
                    "duration": None,
                    "is_free": True,
                    "rating": None,
                    "instructor": None,
                }
            )

        return resources

    async def fetch_blog_resources(
        self, topic: str, max_results: int = 6
    ) -> List[Dict[str, Any]]:
        """
        Fetch high-quality blog posts (Medium, Dev.to, etc.) for the topic.
        This answers "where are the blogs" by surfacing long-form reading.
        """
        results = await self._search_tavily(
            f"best in-depth blog posts for learning {topic}",
            ["medium.com", "dev.to", "towardsdatascience.com"],
            max_results,
        )

        resources: List[Dict[str, Any]] = []
        for result in results:
            url = result.get("url", "")
            if not url:
                continue

            host = ""
            try:
                import urllib.parse

                host = urllib.parse.urlparse(url).netloc
            except Exception:
                host = "Blog"

            thumbnail = (
                result.get("image_url")
                or result.get("thumbnail")
                or result.get("image")
                or result.get("favicon")
            )

            resources.append(
                {
                    "title": result.get("title", "Blog post"),
                    "url": url,
                    "platform": host or "Blog",
                    "thumbnail": thumbnail,
                    "duration": None,
                    "is_free": True,
                    "rating": None,
                    "instructor": None,
                }
            )

        return resources

    async def fetch_all_resources(self, topic: str) -> List[Dict[str, Any]]:
        """
        Fetch resources from YouTube, Udemy, Coursera and Reddit in parallel.
        Mirrors the intent of the `harsh` branch: multi-platform, rich thumbnails when available.
        """
        import asyncio
        
        # Run all API calls in parallel for much faster execution
        youtube_res, udemy_res, coursera_res, reddit_res, blog_res = await asyncio.gather(
            asyncio.to_thread(self.fetch_youtube_resources, topic, max_results=8),
            self.fetch_udemy_resources(topic, max_results=6),
            self.fetch_coursera_resources(topic, max_results=6),
            self.fetch_reddit_resources(topic, max_results=4),
            self.fetch_blog_resources(topic, max_results=6),
            return_exceptions=True  # Don't fail entire fetch if one source fails
        )
        
        # Handle any exceptions from individual fetchers
        youtube_res = youtube_res if not isinstance(youtube_res, Exception) else []
        udemy_res = udemy_res if not isinstance(udemy_res, Exception) else []
        coursera_res = coursera_res if not isinstance(coursera_res, Exception) else []
        reddit_res = reddit_res if not isinstance(reddit_res, Exception) else []
        blog_res = blog_res if not isinstance(blog_res, Exception) else []

        all_res = youtube_res + udemy_res + coursera_res + reddit_res + blog_res
        logger.info(
            "Total %d resources fetched for %s (YouTube=%d, Udemy=%d, Coursera=%d, Reddit=%d, Blogs=%d)",
            len(all_res),
            topic,
            len(youtube_res),
            len(udemy_res),
            len(coursera_res),
            len(reddit_res),
            len(blog_res),
        )
        return all_res


    async def generate_remedial_node(
        self, original_topic: str, failed_concept: str
    ) -> Dict[str, Any]:
        """
        Agent-to-Agent Handoff: The Planning Agent generates a targeted remedial
        learning node when the Quiz Agent reports a failure.

        Uses Gemini to create a focused crash-course sub-topic and then fetches
        real multi-platform resources for that sub-topic.
        """
        prompt = f"""A student is learning "{original_topic}" and just FAILED a quiz on "{failed_concept}".

As an expert learning coach, generate ONE focused remedial crash-course topic title that will
help the student bridge their knowledge gap.

RULES:
- The topic must be specific to the concept they failed, not the whole subject.
- Keep it under 6 words.
- It should be actionable (e.g., "SQL Joins: Visual Deep Dive" not just "SQL Joins").
- Return ONLY the topic title, nothing else."""

        try:
            remedial_topic = await self._generate_text(prompt)
            # Strip quotes/whitespace
            remedial_topic = remedial_topic.strip().strip('"').strip("'").strip()
            if not remedial_topic or len(remedial_topic) < 3:
                remedial_topic = f"{failed_concept} — Crash Course"
        except Exception as exc:
            logger.error("Gemini remedial topic generation failed: %s", exc)
            remedial_topic = f"{failed_concept} — Crash Course"

        # Fetch real resources for this remedial topic
        try:
            resources = await self.fetch_all_resources(remedial_topic)
        except Exception as exc:
            logger.error("Resource fetch failed for remedial node: %s", exc)
            resources = []

        node = {
            "topic": f"🔁 {remedial_topic}",
            "resources": resources,
            "fetched_at": datetime.utcnow().isoformat(),
            "is_remedial": True,
            "triggered_by": failed_concept,
            "original_topic": original_topic,
        }

        logger.info(
            "Planning Agent generated remedial node: '%s' (triggered by failure in '%s')",
            remedial_topic,
            failed_concept,
        )
        return node


roadmap_service = RoadmapService()

