import { getGeminiClient } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { message, context, history } = await req.json();

        const genAI = getGeminiClient();
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

        const systemPrompt = `You are a helpful learning assistant. The user is reading content about "${context}". 
Help them understand the material, answer their questions, and explain concepts clearly. 
Keep responses concise but informative. Use markdown formatting when helpful.`;

        const chatHistory = (history || []).map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: 'I understand! I\'m ready to help you learn. Ask me anything about the content you\'re reading.' }] },
                ...chatHistory,
            ],
        });

        const result = await chat.sendMessage(message);
        const response = result.response.text();

        return NextResponse.json({ reply: response });
    } catch (error: any) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate response' },
            { status: 500 }
        );
    }
}
