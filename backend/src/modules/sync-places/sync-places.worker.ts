import { Worker, Job } from 'bullmq';
import { logger } from '../../lib/logger.js';
import { syncPlacesService } from './sync-places.service.js';
import { queueOptions } from './sync-places.queue.js';

interface RefreshCellJobData {
	cellId: string;
	level: number;
}

/**
 * Process a single cell refresh job by calling the service
 */
async function processRefreshCell(job: Job<RefreshCellJobData>): Promise<void> {
	const { cellId } = job.data;
	await syncPlacesService.refreshCell(cellId);
}

/**
 * Create and start the sync places refresh worker
 */
export function createSyncPlacesRefreshWorker(): Worker {
	const worker = new Worker<RefreshCellJobData>(
		'sync-places:refresh-cell',
		async (job) => {
			await processRefreshCell(job);
		},
		{
			connection: queueOptions.connection,
			concurrency: 5, // Process up to 5 cells in parallel
		}
	);

	worker.on('completed', (job) => {
		logger.info({ jobId: job.id, cellId: job.data.cellId }, 'Cell refresh job completed');
	});

	worker.on('failed', (job, err) => {
		logger.error(
			{ jobId: job?.id, cellId: job?.data.cellId, error: err.message },
			'Cell refresh job failed'
		);
	});

	worker.on('error', (err) => {
		logger.error({ error: err.message }, 'Worker error');
	});

	logger.info('Sync places refresh worker started');

	return worker;
}

// Export the worker instance
export const syncPlacesRefreshWorker = createSyncPlacesRefreshWorker();
