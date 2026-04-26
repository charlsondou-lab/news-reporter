/**
 * instrumentation.ts
 * This file runs when the Next.js server starts.
 * Used here to initialize the background cron jobs for fetching and cleanup.
 */

function humanToCron(input: string): string {
  if (!input) return '';
  const trimmed = input.trim().toLowerCase();
  
  // Already a cron expression? (starts with digit or *)
  if (/^[\d\*]/.test(trimmed) && trimmed.split(' ').length >= 5) {
    return trimmed;
  }

  // Handle common shorthand
  if (trimmed === 'daily') return '0 0 * * *';
  if (trimmed === 'hourly') return '0 * * * *';

  // Handle duration patterns like "4h", "30m", "3d"
  const match = trimmed.match(/^(\d+)(h|m|d)$/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 'h') return `0 */${value} * * *`;
    if (unit === 'm') return `*/${value} * * * *`;
    if (unit === 'd') return `0 0 */${value} * *`;
  }

  return input; // Fallback to raw string
}

export async function register() {
  // Only run this on the Node.js runtime (server-side)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron');
    const { runFetchTask, runCleanupTask } = await import('./lib/cron-tasks');

    // Get intervals from environment variables (fallback to defaults)
    const fetchInterval = humanToCron(process.env.FETCH_INTERVAL_CRON || '4h');
    const cleanupInterval = humanToCron(process.env.CLEANUP_INTERVAL_CRON || 'daily');
    const cronTimezone = process.env.CRON_TIMEZONE || 'Asia/Hong_Kong';

    console.log(`[System] Initializing Background Services...`);
    console.log(`[System] Fetch Schedule: ${fetchInterval} (${process.env.FETCH_INTERVAL_CRON || 'default 4h'})`);
    console.log(`[System] Cleanup Schedule: ${cleanupInterval} (${process.env.CLEANUP_INTERVAL_CRON || 'default daily'})`);
    console.log(`[System] Cron Timezone: ${cronTimezone}`);

    // Schedule Fetch Task
    cron.schedule(fetchInterval, async () => {
      try {
        await runFetchTask();
      } catch (err) {
        console.error('[BG-Worker] Scheduled fetch failed:', err);
      }
    }, { timezone: cronTimezone });

    // Schedule Cleanup Task
    cron.schedule(cleanupInterval, async () => {
      try {
        await runCleanupTask();
      } catch (err) {
        console.error('[BG-Worker] Scheduled cleanup failed:', err);
      }
    }, { timezone: cronTimezone });

    console.log(`[System] All background tasks registered successfully.`);
  }
}
