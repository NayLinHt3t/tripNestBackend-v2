import { SentimentResult } from "./sentiment.entity.js";

export interface SentimentAnalyzer {
  analyze(text: string): Promise<SentimentResult>;
}

// Mock AI sentiment analyzer - for testing without API
export class MockSentimentAnalyzer implements SentimentAnalyzer {
  async analyze(text: string): Promise<SentimentResult> {
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!text || text.trim().length === 0) {
      return { label: "NEUTRAL", score: 0 };
    }

    const lowerText = text.toLowerCase();

    // Simple keyword-based sentiment
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

// OpenAI-based sentiment analyzer
export class OpenAISentimentAnalyzer implements SentimentAnalyzer {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(apiKey: string, options?: { baseUrl?: string; model?: string }) {
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl || "https://api.openai.com/v1";
    this.model = options?.model || "gpt-4o-mini";
  }

  async analyze(text: string): Promise<SentimentResult> {
    if (!text || text.trim().length === 0) {
      return { label: "NEUTRAL", score: 0 };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: `You are a sentiment analysis expert. Analyze the sentiment of the given text and respond with a JSON object containing:
- "label": one of "POSITIVE", "NEGATIVE", or "NEUTRAL"
- "score": a number between -1 (most negative) and 1 (most positive)

Respond ONLY with the JSON object, no additional text.`,
            },
            {
              role: "user",
              content: text,
            },
          ],
          temperature: 0.1,
          max_tokens: 100,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`,
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      // Parse the JSON response
      const result = JSON.parse(content);

      // Validate and normalize the result
      const label = this.normalizeLabel(result.label);
      const score = this.normalizeScore(result.score);

      return { label, score };
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      // Fallback to mock analyzer on error
      const mock = new MockSentimentAnalyzer();
      return mock.analyze(text);
    }
  }

  private normalizeLabel(label: unknown): string {
    if (typeof label === "string") {
      const upper = label.toUpperCase();
      if (["POSITIVE", "NEGATIVE", "NEUTRAL"].includes(upper)) {
        return upper;
      }
    }
    return "NEUTRAL";
  }

  private normalizeScore(score: unknown): number {
    if (typeof score === "number" && !isNaN(score)) {
      return Math.max(-1, Math.min(1, score));
    }
    return 0;
  }
}

// Custom AI API sentiment analyzer (primary option)
export class CustomAISentimentAnalyzer implements SentimentAnalyzer {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async analyze(text: string): Promise<SentimentResult> {
    if (!text || text.trim().length === 0) {
      return { label: "NEUTRAL", score: 0 };
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reviews: [text] }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Custom AI API error: ${response.status} ${response.statusText} - ${errorBody}`,
      );
    }

    const data = await response.json();

    const positive = Array.isArray(data.positive_reviews)
      ? data.positive_reviews[0]
      : undefined;
    const negative = Array.isArray(data.negative_reviews)
      ? data.negative_reviews[0]
      : undefined;

    if (positive) {
      const label = this.normalizeLabel(positive.label);
      const score = this.normalizeScore(positive.confidence);
      return { label, score };
    }

    if (negative) {
      const label = this.normalizeLabel(negative.label);
      const score = this.normalizeScore(negative.confidence);
      return { label, score };
    }

    return { label: "NEUTRAL", score: 0 };
  }

  private normalizeLabel(label: unknown): string {
    if (typeof label === "string") {
      const upper = label.toUpperCase();
      if (["POSITIVE", "NEGATIVE", "NEUTRAL"].includes(upper)) {
        return upper;
      }
    }
    return "NEUTRAL";
  }

  private normalizeScore(score: unknown): number {
    if (typeof score === "number" && !isNaN(score)) {
      return Math.max(-1, Math.min(1, score));
    }
    return 0;
  }
}

// Fallback sentiment analyzer that chains multiple analyzers
export class FallbackSentimentAnalyzer implements SentimentAnalyzer {
  private analyzers: { name: string; analyzer: SentimentAnalyzer }[];

  constructor(analyzers: { name: string; analyzer: SentimentAnalyzer }[]) {
    this.analyzers = analyzers;
  }

  async analyze(text: string): Promise<SentimentResult> {
    for (const { name, analyzer } of this.analyzers) {
      try {
        const result = await analyzer.analyze(text);
        console.log(`Sentiment analysis successful using: ${name}`);
        return result;
      } catch (error) {
        console.warn(`${name} failed, trying next analyzer:`, error);
      }
    }

    // If all analyzers fail, return neutral
    console.error("All sentiment analyzers failed, returning neutral");
    return { label: "NEUTRAL", score: 0 };
  }
}

// Factory function to create the appropriate analyzer based on environment
export function createSentimentAnalyzer(): SentimentAnalyzer {
  const customApiUrl = process.env.AI_API;
  if (!customApiUrl) {
    throw new Error("AI_API is not configured in the environment");
  }

  console.log(`Custom AI API configured: ${customApiUrl}`);
  return new CustomAISentimentAnalyzer(customApiUrl);
}
