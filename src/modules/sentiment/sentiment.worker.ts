import { SentimentService } from "./sentiment.service.js";
import { SentimentJobRepository } from "./sentiment.repository.js";

export class SentimentWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private sentimentService: SentimentService,
    private sentimentJobRepository: SentimentJobRepository,
    private pollInterval: number = 5000 // 5 seconds
  ) {}

  start(): void {
    if (this.isRunning) {
      console.log("⚠️ Sentiment worker is already running");
      return;
    }

    this.isRunning = true;
    console.log("🚀 Sentiment worker started");

    this.intervalId = setInterval(() => this.processJobs(), this.pollInterval);

    // Process immediately on start
    this.processJobs();
  }

  stop(): void {
    if (!this.isRunning) {
      console.log("⚠️ Sentiment worker is not running");
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log("🛑 Sentiment worker stopped");
  }

  private async processJobs(): Promise<void> {
    try {
      // Fetch pending jobs
      const jobs = await this.sentimentJobRepository.findPendingJobs(5);

      if (jobs.length === 0) {
        return;
      }

      console.log(`📋 Processing ${jobs.length} sentiment job(s)...`);

      // Process each job
      for (const job of jobs) {
        await this.sentimentService.processJob(job);
      }
    } catch (error) {
      console.error("❌ Error in sentiment worker:", error);
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }
}
