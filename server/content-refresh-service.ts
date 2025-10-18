import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

export interface RefreshJob {
  url: string;
  subdomain: string;
  userId: string;
  lastRefresh: Date;
  refreshInterval: number; // in days
  priority: 'low' | 'medium' | 'high';
}

export interface RefreshConfig {
  redisUrl: string;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

export class ContentRefreshService {
  private refreshQueue: Queue;
  private refreshWorker: Worker;
  private redis: Redis;
  private config: RefreshConfig;

  constructor(config: RefreshConfig) {
    this.config = config;
    this.redis = new Redis(config.redisUrl);
    
    this.refreshQueue = new Queue('content-refresh', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: config.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: config.retryDelay,
        },
      },
    });

    this.refreshWorker = new Worker(
      'content-refresh',
      this.processRefreshJob.bind(this),
      {
        connection: this.redis,
        concurrency: config.concurrency,
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Schedule content refresh for documentation
   */
  async scheduleRefresh(
    url: string,
    subdomain: string,
    userId: string,
    refreshIntervalDays: number = 30,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    try {
      console.log(`📅 Scheduling refresh for ${subdomain} (${url})`);

      const jobData: RefreshJob = {
        url,
        subdomain,
        userId,
        lastRefresh: new Date(),
        refreshInterval: refreshIntervalDays,
        priority
      };

      const job = await this.refreshQueue.add(
        'refresh-content',
        jobData,
        {
          priority: this.getPriorityValue(priority),
          repeat: {
            every: refreshIntervalDays * 24 * 60 * 60 * 1000, // Convert days to milliseconds
          },
          jobId: `${subdomain}-${userId}`, // Unique job ID
        }
      );

      console.log(`✅ Refresh scheduled: Job ${job.id}`);
      return job.id!;

    } catch (error) {
      console.error('Content refresh scheduling error:', error);
      throw error;
    }
  }

  /**
   * Process refresh job
   */
  private async processRefreshJob(job: Job<RefreshJob>): Promise<void> {
    const { url, subdomain, userId } = job.data;
    
    try {
      console.log(`🔄 Processing refresh job for ${subdomain} (${url})`);

      // Import the enhanced generator to refresh content
      const { generateEnhancedDocumentation } = await import('./enhanced-generator');
      
      // Refresh the documentation
      const result = await generateEnhancedDocumentation(url, userId, undefined, 'pro');
      
      // Update the stored documentation
      await this.updateStoredDocumentation(subdomain, result);
      
      // Log successful refresh
      console.log(`✅ Content refreshed for ${subdomain}`);
      
      // Update job data with new refresh time
      await job.updateData({
        ...job.data,
        lastRefresh: new Date()
      });

    } catch (error) {
      console.error(`❌ Refresh job failed for ${subdomain}:`, error);
      throw error;
    }
  }

  /**
   * Update stored documentation with refreshed content
   */
  private async updateStoredDocumentation(subdomain: string, refreshedContent: any): Promise<void> {
    try {
      // This would typically update the database with refreshed content
      // For now, we'll simulate the update
      console.log(`📝 Updating stored documentation for ${subdomain}`);
      
      // In a real implementation, you would:
      // 1. Update the documentation in the database
      // 2. Regenerate SEO metadata and schema markup
      // 3. Update sitemap if needed
      // 4. Notify users of the update
      
    } catch (error) {
      console.error('Documentation update error:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled refresh
   */
  async cancelRefresh(subdomain: string, userId: string): Promise<boolean> {
    try {
      const jobId = `${subdomain}-${userId}`;
      const job = await this.refreshQueue.getJob(jobId);
      
      if (job) {
        await job.remove();
        console.log(`✅ Refresh cancelled for ${subdomain}`);
        return true;
      }
      
      return false;

    } catch (error) {
      console.error('Refresh cancellation error:', error);
      return false;
    }
  }

  /**
   * Get refresh status for subdomain
   */
  async getRefreshStatus(subdomain: string, userId: string): Promise<{
    isScheduled: boolean;
    nextRefresh?: Date;
    lastRefresh?: Date;
    refreshInterval?: number;
  }> {
    try {
      const jobId = `${subdomain}-${userId}`;
      const job = await this.refreshQueue.getJob(jobId);
      
      if (!job) {
        return { isScheduled: false };
      }

      const jobData = job.data as RefreshJob;
      const nextRefresh = new Date(job.timestamp + (jobData.refreshInterval * 24 * 60 * 60 * 1000));

      return {
        isScheduled: true,
        nextRefresh,
        lastRefresh: jobData.lastRefresh,
        refreshInterval: jobData.refreshInterval
      };

    } catch (error) {
      console.error('Refresh status error:', error);
      return { isScheduled: false };
    }
  }

  /**
   * Get all scheduled refreshes for a user
   */
  async getUserRefreshJobs(userId: string): Promise<RefreshJob[]> {
    try {
      const jobs = await this.refreshQueue.getJobs(['waiting', 'delayed', 'active']);
      return jobs
        .filter(job => job.data.userId === userId)
        .map(job => job.data as RefreshJob);

    } catch (error) {
      console.error('User refresh jobs error:', error);
      return [];
    }
  }

  /**
   * Update refresh interval
   */
  async updateRefreshInterval(
    subdomain: string,
    userId: string,
    newIntervalDays: number
  ): Promise<boolean> {
    try {
      // Cancel existing job
      await this.cancelRefresh(subdomain, userId);
      
      // Get the original job data
      const jobId = `${subdomain}-${userId}`;
      const job = await this.refreshQueue.getJob(jobId);
      
      if (!job) {
        return false;
      }

      const jobData = job.data as RefreshJob;
      
      // Schedule new job with updated interval
      await this.scheduleRefresh(
        jobData.url,
        jobData.subdomain,
        jobData.userId,
        newIntervalDays,
        jobData.priority
      );

      console.log(`✅ Refresh interval updated for ${subdomain}: ${newIntervalDays} days`);
      return true;

    } catch (error) {
      console.error('Refresh interval update error:', error);
      return false;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.refreshWorker.on('completed', (job) => {
      console.log(`✅ Refresh job completed: ${job.id}`);
    });

    this.refreshWorker.on('failed', (job, err) => {
      console.error(`❌ Refresh job failed: ${job?.id}`, err);
    });

    this.refreshWorker.on('error', (err) => {
      console.error('Refresh worker error:', err);
    });
  }

  /**
   * Get priority value for job
   */
  private getPriorityValue(priority: 'low' | 'medium' | 'high'): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 5;
      case 'low': return 10;
      default: return 5;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.refreshQueue.getWaiting(),
        this.refreshQueue.getActive(),
        this.refreshQueue.getCompleted(),
        this.refreshQueue.getFailed(),
        this.refreshQueue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };

    } catch (error) {
      console.error('Queue stats error:', error);
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }
  }

  /**
   * Clean up old jobs
   */
  async cleanupOldJobs(): Promise<void> {
    try {
      await this.refreshQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // Clean completed jobs older than 24 hours
      await this.refreshQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'); // Clean failed jobs older than 7 days
      console.log('✅ Old jobs cleaned up');
    } catch (error) {
      console.error('Job cleanup error:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      await this.refreshWorker.close();
      await this.refreshQueue.close();
      await this.redis.quit();
      console.log('✅ Content refresh service shutdown complete');
    } catch (error) {
      console.error('Shutdown error:', error);
    }
  }
}

// Export singleton instance (will be initialized with proper config)
export let contentRefreshService: ContentRefreshService;

export function initializeContentRefreshService(config: RefreshConfig): void {
  contentRefreshService = new ContentRefreshService(config);
}
