"""
Interview Agent feature
-----------------------

This module is adapted from the standalone "Interview Agent" project.
It provides endpoints to:
- Start an AI-powered mock interview (OpenAI + Vapi)
- Receive Vapi callbacks and persist interview metadata
- Generate and fetch structured evaluation reports

The OpenAI and Vapi API keys are ONLY used inside this module.
All other SkillSphere features continue to use Gemini or their existing providers.
"""

