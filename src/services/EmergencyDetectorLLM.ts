export interface EmergencyAnalysis {
  isEmergency: boolean;
  confidence: number;
  emergencyType?: string;
  severity?: 'low' | 'medium' | 'high';
  reasoning?: string;
}

export class EmergencyDetectorLLM {
  private llm: any;

  constructor(llmClient: any) {
    this.llm = llmClient;
  }

  async analyzeMessage(
    messageHistory: string[],
    currentMessage: string
  ): Promise<EmergencyAnalysis> {
    // Construct prompt for emergency detection
    const prompt = `
      You are an emergency detection system. Analyze the following conversation, 
      especially the latest message, to determine if there's an emergency situation 
      that requires immediate attention. Consider context, emotional state, and implicit signals.
      
      Previous messages:
      ${messageHistory.join('\n')}
      
      Latest message:
      ${currentMessage}
      
      Provide your analysis in JSON format with the following structure:
      {
        "isEmergency": boolean,
        "confidence": number (0-1),
        "emergencyType": string (if applicable),
        "severity": "low" | "medium" | "high",
        "reasoning": string (brief explanation)
      }
    `;

    try {
      const response = await this.llm.complete({
        prompt,
        temperature: 0.1, // Low temperature for more consistent results
        max_tokens: 200,
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Failed to analyze emergency situation:', error);
      // Fallback to safe default
      return {
        isEmergency: false,
        confidence: 0,
        severity: 'low',
        reasoning: 'Failed to analyze message',
      };
    }
  }
}
