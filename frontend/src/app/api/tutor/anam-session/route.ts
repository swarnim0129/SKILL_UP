import { NextResponse } from 'next/server';
import { getClerkId } from '../db';

// ─── Round-Robin Key Rotation ──────────────────────────────────────────────
// Store multiple Anam API keys as comma-separated in env:
// ANAM_API_KEYS=key1,key2,key3,key4
// Falls back to single ANAM_API_KEY if ANAM_API_KEYS is not set.

let keyIndex = 0;

function getNextAnamKey(): string {
  const multiKeys = process.env.ANAM_API_KEYS;
  if (multiKeys) {
    const keys = multiKeys.split(',').map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) throw new Error('No Anam API keys configured');
    const key = keys[keyIndex % keys.length];
    keyIndex = (keyIndex + 1) % keys.length;
    console.log(`[anam-session] Using key index ${(keyIndex - 1 + keys.length) % keys.length} of ${keys.length}`);
    return key;
  }

  const singleKey = process.env.ANAM_API_KEY;
  if (!singleKey) throw new Error('No Anam API key configured');
  return singleKey;
}

// ─── Build persona config for Anam API ─────────────────────────────────────
// Reference: https://github.com/anam-org/javascript-sdk#usage-in-production
// Required fields: name, avatarId, voiceId, llmId, systemPrompt

function buildPersonaConfig(subjectName: string, chapterTitle: string, chapterDescription: string) {
  // Avatar and voice IDs from Anam Lab dashboard
  // Default values from official Anam SDK examples:
  // - avatarId: '30fa96d0-26c4-4e55-94a0-517025942e18' (Cara)
  // - voiceId: '6bfbe25a-979d-40f3-a92b-5394170af54b' (Cara's voice)
  const avatarId = process.env.ANAM_AVATAR_ID || '30fa96d0-26c4-4e55-94a0-517025942e18';
  const voiceId = process.env.ANAM_VOICE_ID || '6bfbe25a-979d-40f3-a92b-5394170af54b';

  const systemPrompt = `[STYLE] Reply in natural speech without formatting. Add pauses using '...' and very occasionally a disfluency. Keep responses concise (2-4 sentences per turn).

[PERSONALITY] You are an expert AI tutor specializing in ${subjectName}. You are currently teaching the chapter: "${chapterTitle}".

[CONTEXT] Chapter description: ${chapterDescription || chapterTitle}

[TEACHING APPROACH]
- Be conversational, friendly, and encouraging like the best university professors
- Start by introducing the topic and its importance
- Explain concepts step by step with real-world examples and analogies
- Ask the student questions to check understanding after each concept
- If the student seems confused, simplify the explanation
- Use code examples when teaching programming topics
- Summarize key takeaways at the end

[GUARDRAILS]
- Stay focused on this chapter's topic. If the student asks about unrelated topics, gently redirect them back
- Speak naturally as if in a live tutoring session, not like reading a textbook
- Address the student directly using "you"
- Be patient and supportive`;

  // Build the config — only include llmId if explicitly set in env
  // The llmId must come from your Anam Lab dashboard (lab.anam.ai → LLMs tab)
  // If not set, Anam uses the persona's default LLM
  const config: Record<string, string> = {
    name: `${subjectName} Tutor`,
    avatarId,
    voiceId,
    systemPrompt,
  };

  if (process.env.ANAM_LLM_ID) {
    config.llmId = process.env.ANAM_LLM_ID;
  }

  return config;
}

// ─── POST /api/tutor/anam-session ──────────────────────────────────────────
// Creates a short-lived session token for the Anam AI avatar.
// Reference: POST https://api.anam.ai/v1/auth/session-token

export async function POST(request: Request) {
  try {
    // Auth
    const clerkId = await getClerkId(request);
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { chapterTitle, chapterDescription, subjectName } = await request.json();

    if (!chapterTitle || !subjectName) {
      return NextResponse.json(
        { success: false, message: 'chapterTitle and subjectName are required' },
        { status: 400 }
      );
    }

    const personaConfig = buildPersonaConfig(subjectName, chapterTitle, chapterDescription || '');
    const anamKey = getNextAnamKey();

    // Request session token from Anam API
    // Reference: https://github.com/anam-org/javascript-sdk#usage-in-production
    const anamResponse = await fetch('https://api.anam.ai/v1/auth/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anamKey}`,
      },
      body: JSON.stringify({ personaConfig }),
    });

    if (!anamResponse.ok) {
      const errText = await anamResponse.text();
      console.error(`[anam-session] Anam API error (${anamResponse.status}):`, errText);

      // If this key is exhausted (429 rate limited or 402 quota), try the next key
      if (anamResponse.status === 429 || anamResponse.status === 402) {
        console.log('[anam-session] Key exhausted, trying next key...');
        const retryKey = getNextAnamKey();
        const retryResponse = await fetch('https://api.anam.ai/v1/auth/session-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${retryKey}`,
          },
          body: JSON.stringify({ personaConfig }),
        });

        if (!retryResponse.ok) {
          const retryErr = await retryResponse.text();
          console.error(`[anam-session] Retry also failed (${retryResponse.status}):`, retryErr);
          return NextResponse.json(
            { success: false, message: 'All Anam API keys exhausted or error' },
            { status: 503 }
          );
        }

        const retryData = await retryResponse.json();
        return NextResponse.json({
          success: true,
          sessionToken: retryData.sessionToken,
          personaConfig,
        });
      }

      return NextResponse.json(
        { success: false, message: `Anam API error: ${anamResponse.status} - ${errText}` },
        { status: anamResponse.status }
      );
    }

    const data = await anamResponse.json();

    return NextResponse.json({
      success: true,
      sessionToken: data.sessionToken,
      personaConfig,
    });
  } catch (error: any) {
    console.error('[anam-session] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
