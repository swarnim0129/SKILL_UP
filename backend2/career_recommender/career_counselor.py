"""
Career Counselor Integration Service
Orchestrates user data + Tavily web intelligence + Gemini AI.
Ported from HACKSYNC and adapted to use ProjectMorpheus GeminiService.
"""

from typing import Dict, List, Optional, AsyncGenerator, Tuple

from gemini_service import gemini_service

from .tavily_service import tavily_service


class CareerCounselorService:
    def __init__(self) -> None:
        self.gemini = gemini_service
        print("✓ Career Counselor initialized")

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

    async def generate_response(
        self,
        user_message: str,
        user_profile: Optional[Dict] = None,
        conversation_history: Optional[List[Dict]] = None,
        attachments: Optional[List[Dict]] = None,
    ) -> Tuple[str, List[Dict]]:
        """
        Generate AI counseling response with web intelligence.
        Returns: (response_text, tavily_references)
        """
        tavily_data = await self._gather_intelligence(user_message, user_profile)
        references = tavily_service.format_references(tavily_data)

        prompt = self._build_counseling_prompt(
            user_message=user_message,
            user_profile=user_profile,
            tavily_data=tavily_data,
            conversation_history=conversation_history or [],
            attachments=attachments or [],
        )

        response_text = await self._generate_text(prompt)
        return response_text, references

    async def generate_streaming_response(
        self,
        user_message: str,
        user_profile: Optional[Dict] = None,
        conversation_history: Optional[List[Dict]] = None,
        attachments: Optional[List[Dict]] = None,
    ) -> AsyncGenerator[Tuple[str, List[Dict]], None]:
        """
        Stream AI counseling response in small chunks.
        We don't have true streaming from Gemini in this project,
        so we generate the full response once and then yield it in pieces.
        """
        tavily_data = await self._gather_intelligence(user_message, user_profile)
        references = tavily_service.format_references(tavily_data)

        prompt = self._build_counseling_prompt(
            user_message=user_message,
            user_profile=user_profile,
            tavily_data=tavily_data,
            conversation_history=conversation_history or [],
            attachments=attachments or [],
        )

        full_text = await self._generate_text(prompt)

        chunk_size = 120
        first = True
        for i in range(0, len(full_text), chunk_size):
            chunk = full_text[i : i + chunk_size]
            yield chunk, (references if first else [])
            first = False

    async def _gather_intelligence(
        self,
        user_message: str,
        user_profile: Optional[Dict],
    ) -> Dict:
        """
        Decide what to search based on user query and profile.
        """
        message_lower = user_message.lower()

        # Career suggestion queries
        if any(
            keyword in message_lower
            for keyword in ["suggest", "recommend", "career", "job", "profession"]
        ):
            if user_profile and user_profile.get("skills"):
                skills = user_profile.get("skills", [])
                interests = user_profile.get("interests", [])
                return await tavily_service.search_career_trends(skills, interests)
            return await tavily_service.search_career_trends(
                ["technology"], ["innovation"]
            )

        # Specific career queries
        if any(
            keyword in message_lower
            for keyword in ["tell me about", "what is", "how to become"]
        ):
            return await tavily_service.search_specific_career(user_message)

        # Skill demand queries
        if "demand" in message_lower or "market" in message_lower:
            if user_profile and user_profile.get("skills"):
                skills = user_profile.get("skills", [])
                return await tavily_service.search_skill_demand(skills)
            return await tavily_service.search_skill_demand(
                ["programming", "AI", "data science"]
            )

        # Default: broad search
        if user_profile and user_profile.get("skills"):
            skills = user_profile.get("skills", [])[:2]
            interests = user_profile.get("interests", [])[:1]
            return await tavily_service.search_career_trends(skills, interests)

        return await tavily_service.search_career_trends(
            ["technology"], ["career growth"]
        )

    def _build_counseling_prompt(
        self,
        user_message: str,
        user_profile: Optional[Dict],
        tavily_data: Dict,
        conversation_history: Optional[List[Dict]],
        attachments: Optional[List[Dict]],
    ) -> str:
        """
        Build comprehensive prompt for Gemini.
        """
        prompt_parts: List[str] = [
            "You are an empathetic AI Career Counselor helping professionals navigate their career paths.",
            "Your role is to provide personalized, actionable, and encouraging career guidance.",
            "",
        ]

        # User profile
        if user_profile:
            prompt_parts.append("=== USER PROFILE ===")
            prompt_parts.append(f"Skills: {', '.join(user_profile.get('skills', []))}")
            prompt_parts.append(
                f"Interests: {', '.join(user_profile.get('interests', []))}"
            )
            prompt_parts.append(
                f"Education: {user_profile.get('education', 'Not specified')}"
            )
            prompt_parts.append(
                f"Experience: {user_profile.get('experience_years', 0)} years"
            )
            prompt_parts.append("")

        # Web intelligence
        if tavily_data.get("results"):
            prompt_parts.append("=== CURRENT MARKET INTELLIGENCE (2026) ===")
            for result in tavily_data["results"][:5]:
                prompt_parts.append(
                    f"- {result.get('title', '')}: "
                    f"{result.get('content', '')[:150]}"
                )
            prompt_parts.append("")

        # Conversation history (last 10 messages)
        if conversation_history:
            prompt_parts.append("=== CONVERSATION HISTORY ===")
            for msg in conversation_history[-10:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                prompt_parts.append(f"{role.upper()}: {content[:200]}")
            prompt_parts.append("")

        # Attachments
        if attachments:
            prompt_parts.append("=== USER ATTACHMENTS ===")
            for att in attachments:
                prompt_parts.append(
                    f"- {att.get('type', 'unknown')}: "
                    f"{att.get('filename', 'unnamed')}"
                )
            prompt_parts.append("")

        # Instructions
        prompt_parts.extend(
            [
                "=== INSTRUCTIONS ===",
                "1. Consider the user's profile data, but use your judgment on what's relevant.",
                "2. Reference the market intelligence naturally (don't just list sources).",
                "3. Be conversational, empathetic, and encouraging.",
                "4. Provide specific, actionable advice with clear next steps.",
                "5. If suggesting careers, explain WHY they're a good fit.",
                "6. Handle career anxiety with empathy and realistic optimism.",
                "7. Keep responses concise but comprehensive (aim for 150-250 words).",
                "8. IMPORTANT: Format your response using Markdown/HTML for better readability:",
                "   - Use bullet points (• or -) for lists and key points",
                "   - Use **bold** for emphasis on important terms",
                "   - Use headings (##) to organize sections when appropriate",
                "   - Structure your response with clear paragraphs and bullet points",
                "   - Make it visually scannable and easy to read",
                "",
                "=== USER QUESTION ===",
                user_message,
                "",
                "Now provide your counseling response in well-formatted Markdown with bullet points:",
            ]
        )

        return "\n".join(prompt_parts)


career_counselor = CareerCounselorService()

