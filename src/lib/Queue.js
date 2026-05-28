import Bee from 'bee-queue';
import CancelationMail from '../app/jobs/CancelationMail';
import redisConfig from '../config/redis';

const jobs = [CancelationMail];

class Queue {
  constructor() {
    this.queues = {};

    this.init();
  }

  init() {
    jobs.forEach(({ key, handle }) => {
      const bee = new Bee(key, {
        redis: redisConfig,
      });

      bee.on('error', err => {
        console.log(`Queue ${key}: ERROR`, err);
      });

      this.queues[key] = {
        bee,
        handle,
      };
    });
  }

  add(queue, job) {
    return this.queues[queue].bee.createJob(job).save();
  }

  processQueue() {
    jobs.forEach(job => {
      const { bee, handle } = this.queues[job.key];

      bee.on('failed', this.handleFailure).process(handle);
    });
  }

  handleFailure(job, err) {
    console.log(`Queue ${job.queue.name}: FAILED`, err);
  }
}

export default new Queue();
