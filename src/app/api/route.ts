import { OpenAIStream, StreamingTextResponse } from 'ai';
import { NextResponse } from 'next/server';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { z } from 'zod';

import { openai } from '@/lib/openai';
import {
  generateSystemPrompt,
  generateEmergencyPrompt,
  generateEmergencyContextPrompt,
} from '@/lib/prompts';
import { whatsAppService } from '@/services/WhatsAppService';

export interface EmergencyAnalysis {
  isEmergency: boolean;
  confidence: number;
  emergencyType?: string;
  severity?: 'low' | 'medium' | 'high';
  reasoning?: string;
}

export async function analyzeEmergency(
  messages: ChatCompletionMessageParam[]
): Promise<EmergencyAnalysis> {
  const emergencyPrompt = generateEmergencyPrompt();

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      temperature: 0.1,
      messages: [...messages, emergencyPrompt],
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Failed to analyze emergency:', error);
    return {
      isEmergency: false,
      confidence: 0,
      severity: 'low',
      reasoning: 'Failed to analyze message',
    };
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const bodySchema = z.object({
    prompt: z.string(),
    messages: z.array(z.any()).optional(),
    userId: z.string().optional(),
    userName: z.string().optional(),
  });

  const {
    prompt,
    messages = [],
    userId = 'anonymous',
    userName = 'User',
  } = bodySchema.parse(body);
  const systemPrompt = generateSystemPrompt();

  try {
    // First, analyze for emergency
    const emergencyAnalysis = await analyzeEmergency([
      systemPrompt,
      ...messages,
      { role: 'user', content: prompt },
    ]);

    // If emergency detected with high confidence, add emergency response
    if (emergencyAnalysis.isEmergency && emergencyAnalysis.confidence > 0.7) {
      // Log emergency
      console.log('Emergency detected:', emergencyAnalysis);

      // Add emergency context to the conversation
      const emergencyResponse = generateEmergencyContextPrompt(
        emergencyAnalysis.emergencyType,
        emergencyAnalysis.severity
      );

      // Create stream with emergency context
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-16k',
        temperature: 0.5,
        messages: [
          systemPrompt,
          emergencyResponse,
          ...messages,
          { role: 'user', content: prompt },
        ],
        stream: true,
      });

      const stream = OpenAIStream(response);
      return new StreamingTextResponse(stream);
    }

    // Normal flow if no emergency
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      temperature: 0.5,
      messages: [systemPrompt, { role: 'user', content: prompt }],
      stream: true,
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.log('error', error);
    return new NextResponse(JSON.stringify({ error }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
