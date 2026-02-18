import { SentimentResult } from "./sentiment.entity.js";

export interface SentimentAnalyzer {
  analyze(text: string): Promise<SentimentResult>;
}

// Custom AI API sentiment analyzer (primary option)
export class CustomAISentimentAnalyzer implements SentimentAnalyzer {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async analyze(text: string): Promise<SentimentResult> {
    if (!text || text.trim().length === 0) {
      throw new Error("Sentiment text is empty");
    }
    console.log("🧠 Sentiment: calling custom AI API", {
      url: this.apiUrl,
      length: text.length,
    });
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
    console.log("🧠 Sentiment: custom AI API response", data);

    const positive = Array.isArray(data.positive_reviews)
      ? data.positive_reviews[0]
      : undefined;
    const negative = Array.isArray(data.negative_reviews)
      ? data.negative_reviews[0]
      : undefined;
    const negativeSummary = data.negative_summary || null;

    if (positive) {
      const label = this.normalizeLabel(positive.label);
      const score = this.normalizeScore(positive.confidence);
      return { label, score, negativeSummary };
    }

    if (negative) {
      const label = this.normalizeLabel(negative.label);
      const score = this.normalizeScore(negative.confidence);
      return { label, score, negativeSummary };
    }

    throw new Error("Custom AI API returned no sentiment results");
  }

  private normalizeLabel(label: unknown): string {
    if (typeof label === "string") {
      const upper = label.toUpperCase();
      if (upper === "POSITIVE" || upper === "NEGATIVE") return upper;
    }
    throw new Error("Custom AI API returned an invalid label");
  }

  private normalizeScore(score: unknown): number {
    if (typeof score === "number" && !isNaN(score)) {
      return Math.max(-1, Math.min(1, score));
    }
    return 0;
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
