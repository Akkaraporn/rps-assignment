export type ProbeStatus = 'up' | 'down';

export interface HealthReport {
  status: 'ok' | 'error';
  checks: Record<string, ProbeStatus>;
}

export async function probe(check: () => Promise<unknown>, timeoutMs = 1000): Promise<ProbeStatus> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });

  try {
    await Promise.race([check(), timeout]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

export function toHealthReport(checks: Record<string, ProbeStatus>): HealthReport {
  const healthy = Object.values(checks).every((status) => status === 'up');
  return { status: healthy ? 'ok' : 'error', checks };
}