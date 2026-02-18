export interface SentimentJob {
  id: string;
  reviewId: string;
  status: JobStatus;
  attempts: number;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum JobStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  DONE = "DONE",
  FAILED = "FAILED",
}

export enum SentimentStatus {
  PENDING = "PENDING",
  ANALYZED = "ANALYZED",
  FAILED = "FAILED",
}

export interface SentimentResult {
  label: string;
  score: number;
  negativeSummary?: string | null;
}

export interface SentimentAnalysisResult {
  reviewId: string;
  label: string;
  score: number;
  class: number;
}
