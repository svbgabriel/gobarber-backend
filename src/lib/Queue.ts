import Bee from 'bee-queue';
import CancelationMail from '../app/jobs/CancelationMail';
import redisConfig from '../config/redis';

interface Job {
  key: string;
  handle(job: Bee.Job<any>): Promise<void>;
}

const jobs: Job[] = [CancelationMail];

interface QueueData {
  bee: Bee;
  handle(job: Bee.Job<any>): Promise<void>;
}

interface Queues {
  [key: string]: QueueData;
}

class Queue {
  private queues: Queues = {};

  constructor() {
    this.init();
  }

  init(): void {
    jobs.forEach(({ key, handle }) => {
      const bee = new Bee(key, {
        redis: {
          host: redisConfig.host || '127.0.0.1',
          port: Number(redisConfig.port) || 6379,
        },
      });

      bee.on('error', (err: Error) => {
        console.log(`Queue ${key}: ERROR`, err);
      });

      this.queues[key] = {
        bee,
        handle,
      };
    });
  }

  add(queue: string, job: any): Promise<Bee.Job<any>> {
    return this.queues[queue].bee.createJob(job).save();
  }

  processQueue(): void {
    jobs.forEach(job => {
      const { bee, handle } = this.queues[job.key];

      bee.on('failed', this.handleFailure).process(handle);
    });
  }

  handleFailure(job: Bee.Job<any>, err: Error): void {
    console.log(`Queue ${job.queue.name}: FAILED`, err);
  }
}

export default new Queue();
