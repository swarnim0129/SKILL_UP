import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

// Get MongoDB client for transcript lookup
let cachedClient: MongoClient | null = null;
async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) return cachedClient;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  cachedClient = new MongoClient(uri);
  await cachedClient.connect();
  return cachedClient;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📞 Vapi Tool Call Received:", JSON.stringify(body, null, 2));

    // Extract tool call info
    const toolCall = body.message?.toolCalls?.[0];
    if (!toolCall) {
      return NextResponse.json({ error: "No tool call found" }, { status: 400 });
    }

    const functionName = toolCall.function.name;
    // Handle both string (from curl test) and object (from Vapi) formats
    const rawArgs = toolCall.function.arguments;
    const args = typeof rawArgs === 'string' ? JSON.parse(rawArgs || "{}") : (rawArgs || {});
    
    // Extract variables - Vapi puts them in different places depending on context
    const variableValues = 
      body.message?.call?.assistantOverrides?.variableValues ||
      body.message?.assistant?.variableValues ||
      body.message?.call?.variableValues ||
      {};
    const { videoId, youtubeVideoId, sessionId } = variableValues;

    console.log(`🔧 Tool: ${functionName}`, { args, videoId, youtubeVideoId, sessionId });

    // ============================================
    // TOOL: jump_to_video_timestamp
    // ============================================
    if (functionName === "jump_to_video_timestamp") {
      const query = args.query?.toLowerCase() || "";
      let jumpSeconds = args.timestamp_seconds || 0;
      let matchSource = "";
      let matchTitle = "";

      // Strategy: Search YT_transcript chapters (roadmap flow)
      if (youtubeVideoId) {
        try {
          const client = await getMongoClient();
          const db = client.db("SkillUP");
          const transcriptDoc = await db.collection("transcripts").findOne(
            { youtube_video_id: youtubeVideoId },
            { sort: { created_at: -1 } }
          );

          if (transcriptDoc && transcriptDoc.topics) {
            const topics = transcriptDoc.topics as any[];
            
            // Search topics for matching query
            if (query) {
              const match = topics.find((t: any) =>
                t.title?.toLowerCase().includes(query) ||
                t.summary?.toLowerCase().includes(query) ||
                t.keywords?.some((kw: string) => kw.toLowerCase().includes(query))
              );

              if (match) {
                jumpSeconds = Math.floor(match.start_ms / 1000);
                matchSource = "transcript_topic";
                matchTitle = match.title;
              }
            }

            // If no match found, list available topics
            if (!matchSource && query) {
              const availableTopics = topics.slice(0, 6).map((t: any) => t.title).join(", ");
              return NextResponse.json({
                results: [{
                  toolCallId: toolCall.id,
                  result: `I couldn't find a section about "${args.query}". Available topics are: ${availableTopics}. Try asking for one of those!`
                }]
              });
            }
          }
        } catch (err) {
          console.error("Transcript lookup error:", err);
        }
      }

      // Fallback: Direct timestamp provided
      if (!matchSource && args.timestamp_seconds) {
        jumpSeconds = Math.floor(args.timestamp_seconds);
        matchSource = "direct_timestamp";
        matchTitle = `${formatTime(jumpSeconds)}`;
      }

      if (!matchSource) {
        return NextResponse.json({
          results: [{
            toolCallId: toolCall.id,
            result: `I couldn't find a section about "${args.query}". Try asking about a specific topic from the video, or provide a timestamp.`
          }]
        });
      }

      const responseText = matchSource === "transcript_topic"
        ? `Found the topic "${matchTitle}". The video is now jumping to ${formatTime(jumpSeconds)}. [JUMP:${jumpSeconds}]`
        : `Jumping to ${formatTime(jumpSeconds)} in the video. [JUMP:${jumpSeconds}]`;

      return NextResponse.json({
        results: [{
          toolCallId: toolCall.id,
          result: responseText
        }]
      });
    }

    // ============================================
    // TOOL: get_lesson_context
    // ============================================
    if (functionName === "get_lesson_context") {
      const currentTime = args.current_time || 0;
      let contextResponse = "";

      // Try transcript-based context
      if (youtubeVideoId) {
        try {
          const client = await getMongoClient();
          const db = client.db("SkillUP");
          const transcriptDoc = await db.collection("transcripts").findOne(
            { youtube_video_id: youtubeVideoId },
            { sort: { created_at: -1 } }
          );

          if (transcriptDoc && transcriptDoc.topics) {
            const topics = transcriptDoc.topics as any[];
            const currentMs = currentTime * 1000;

            // Find current topic
            let currentTopic = null;
            for (let i = topics.length - 1; i >= 0; i--) {
              if (currentMs >= topics[i].start_ms) {
                currentTopic = topics[i];
                break;
              }
            }

            if (currentTopic) {
              contextResponse += `CURRENT TOPIC (at ${formatTime(currentTime)}): "${currentTopic.title}"\n`;
              contextResponse += `TOPIC SUMMARY: ${currentTopic.summary}\n`;
              contextResponse += `KEYWORDS: ${currentTopic.keywords?.join(", ")}\n\n`;
            }

            if (transcriptDoc.overall_summary) {
              contextResponse += `VIDEO SUMMARY: ${transcriptDoc.overall_summary}\n`;
            }
          }
        } catch (err) {
          console.error("Context lookup error:", err);
        }
      }

      return NextResponse.json({
        results: [{
          toolCallId: toolCall.id,
          result: contextResponse || "No transcript context available at this timestamp."
        }]
      });
    }

    // Unknown tool
    return NextResponse.json({
      results: [{
        toolCallId: toolCall.id,
        result: `Unknown tool: ${functionName}`
      }]
    });

  } catch (error) {
    console.error("❌ Vapi Tool Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to format seconds as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
