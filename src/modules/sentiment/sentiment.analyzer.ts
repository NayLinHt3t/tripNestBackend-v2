import { SentimentResult } from "./sentiment.entity.js";

export interface SentimentAnalyzer {
  analyze(text: string): Promise<SentimentResult>;
}

// Mock AI sentiment analyzer - replace with actual AI service
export class MockSentimentAnalyzer implements SentimentAnalyzer {
  async analyze(text: string): Promise<SentimentResult> {
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!text || text.trim().length === 0) {
      return { label: "NEUTRAL", score: 0 };
    }

    const lowerText = text.toLowerCase();

    // Simple keyword-based sentiment (replace with real AI)
    const positiveWords = [
      "amazing",
      "great",
      "excellent",
      "wonderful",
      "fantastic",
      "love",
      "best",
      "awesome",
      "good",
      "perfect",
    ];
    const negativeWords = [
      "terrible",
      "awful",
      "horrible",
      "worst",
      "bad",
      "hate",
      "disappointing",
      "poor",
      "waste",
      "boring",
    ];

    let score = 0;
    for (const word of positiveWords) {
      if (lowerText.includes(word)) score += 0.2;
    }
    for (const word of negativeWords) {
      if (lowerText.includes(word)) score -= 0.2;
    }

    score = Math.max(-1, Math.min(1, score));

    let label: string;
    if (score > 0.2) label = "POSITIVE";
    else if (score < -0.2) label = "NEGATIVE";
    else label = "NEUTRAL";

    return { label, score };
  }
}

// OpenAI-based sentiment analyzer (example implementation)
export class OpenAISentimentAnalyzer implements SentimentAnalyzer {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyze(text: string): Promise<SentimentResult> {
    // Implement actual OpenAI API call here
    // For now, fall back to mock
    const mock = new MockSentimentAnalyzer();
    return mock.analyze(text);
  }
}
