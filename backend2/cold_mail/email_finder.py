"""
Email Finder Scraper
Takes company URLs and finds email addresses from their websites
Scrapes multiple pages: homepage, contact, about, careers
"""
import aiohttp
from typing import List, Set
from urllib.parse import urljoin, urlparse
import re
from bs4 import BeautifulSoup
import asyncio


class EmailFinder:
    def __init__(self) -> None:
        self.timeout = aiohttp.ClientTimeout(total=10)
        self.max_emails_per_company = 3

    async def find_emails(self, website: str) -> List[str]:
        """
        Find email addresses from a company website
        Scrapes multiple pages: homepage, contact, about, careers
        """
        emails: Set[str] = set()

        parsed = urlparse(website)
        base_url = f"{parsed.scheme}://{parsed.netloc}"

        pages_to_check = [
            website,
            urljoin(base_url, "/contact"),
            urljoin(base_url, "/about"),
            urljoin(base_url, "/careers"),
            urljoin(base_url, "/team"),
            urljoin(base_url, "/contact-us"),
        ]

        semaphore = asyncio.Semaphore(3)

        async def check_page(url: str) -> None:
            async with semaphore:
                page_emails = await self._scrape_emails_from_page(url)
                emails.update(page_emails)

        tasks = [check_page(url) for url in pages_to_check]
        await asyncio.gather(*tasks, return_exceptions=True)

        filtered_emails = self._filter_emails(list(emails))

        return filtered_emails[: self.max_emails_per_company]

    async def _scrape_emails_from_page(self, url: str) -> List[str]:
        """Scrape emails from a single page"""
        emails: List[str] = []

        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(url, allow_redirects=True) as response:
                    if response.status == 200:
                        html = await response.text()

                        email_pattern = (
                            r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                        )
                        found_emails = re.findall(email_pattern, html)

                        soup = BeautifulSoup(html, "html.parser")
                        mailto_links = soup.find_all(
                            "a", href=re.compile(r"^mailto:")
                        )
                        for link in mailto_links:
                            href = link.get("href", "")
                            email_match = re.search(
                                r"mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})",
                                href,
                            )
                            if email_match:
                                found_emails.append(email_match.group(1))

                        emails.extend(found_emails)

        except asyncio.TimeoutError:
            pass
        except Exception:  # noqa: BLE001
            pass

        return emails

    def _filter_emails(self, emails: List[str]) -> List[str]:
        """Filter and prioritize email addresses"""
        filtered: List[str] = []
        seen: Set[str] = set()

        skip_patterns = [
            "example.com",
            "test.com",
            "domain.com",
            "email.com",
            "noreply",
            "no-reply",
            "donotreply",
            "privacy",
            "support@",
            "help@",
            "webmaster@",
            "postmaster@",
            "abuse@",
            "security@",
            "legal@",
            "dmca@",
        ]

        priority_patterns = [
            "contact@",
            "hello@",
            "info@",
            "careers@",
            "jobs@",
            "hr@",
            "recruiting@",
            "talent@",
            "hiring@",
            "apply@",
        ]

        priority_emails: List[str] = []
        regular_emails: List[str] = []

        for email in emails:
            email_lower = email.lower()

            if any(pattern in email_lower for pattern in skip_patterns):
                continue

            if email_lower in seen:
                continue

            seen.add(email_lower)

            if any(pattern in email_lower for pattern in priority_patterns):
                priority_emails.append(email)
            else:
                regular_emails.append(email)

        return priority_emails + regular_emails


email_finder = EmailFinder()

