import { Queue, type QueueOptions } from 'bullmq';
import { config } from '../../lib/config.js';

const connection = {
	host: new URL(config.REDIS_URL).hostname,
	port: Number(new URL(config.REDIS_URL).port) || 6379,
};

export const queueOptions: QueueOptions = {
	connection,
	defaultJobOptions: {
		removeOnComplete: true,
		removeOnFail: false,
		attempts: 3,
		backoff: {
			type: 'exponential',
			delay: 1000,
		},
	},
};

export const syncPlacesRefreshQueue = new Queue('sync-places:refresh-cell', queueOptions);
