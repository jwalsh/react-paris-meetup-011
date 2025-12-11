/**
 * Concurrency Utilities for React Paris Meetup #011
 *
 * Demonstrates throttle, debounce, and sequencing patterns
 * that React 19's concurrent features aim to replace/improve.
 */

// =============================================================================
// THROTTLE: Limit execution to once per time period
// =============================================================================

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let lastResult: ReturnType<T>;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      lastResult = fn(...args);
    }
    return lastResult;
  };
}

// Leading edge throttle (fires immediately, then throttles)
export function throttleLeading<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, limit - (now - lastCall));
    }
  };
}

// =============================================================================
// DEBOUNCE: Wait for pause in calls before executing
// =============================================================================

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Debounce with immediate first call
export function debounceImmediate<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isFirstCall = true;

  return (...args: Parameters<T>) => {
    if (isFirstCall) {
      isFirstCall = false;
      fn(...args);
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      isFirstCall = true;
      fn(...args);
    }, delay);
  };
}

// =============================================================================
// SEQUENCING: Execute async operations in order
// =============================================================================

export function createSequencer<T>() {
  let pending: Promise<T> = Promise.resolve() as Promise<T>;

  return (operation: () => Promise<T>): Promise<T> => {
    pending = pending.then(operation).catch(() => operation());
    return pending;
  };
}

// Queue with concurrency limit
export function createConcurrencyLimiter(limit: number) {
  let running = 0;
  const queue: (() => void)[] = [];

  const runNext = () => {
    if (running < limit && queue.length > 0) {
      running++;
      const next = queue.shift()!;
      next();
    }
  };

  return <T>(operation: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          running--;
          runNext();
        }
      });
      runNext();
    });
  };
}

// =============================================================================
// CANCELABLE PROMISES: Support for aborting operations
// =============================================================================

export interface CancelablePromise<T> extends Promise<T> {
  cancel: () => void;
}

export function makeCancelable<T>(promise: Promise<T>): CancelablePromise<T> {
  let isCanceled = false;

  const wrappedPromise = new Promise<T>((resolve, reject) => {
    promise.then(
      (val) => (isCanceled ? reject({ isCanceled: true }) : resolve(val)),
      (error) => (isCanceled ? reject({ isCanceled: true }) : reject(error))
    );
  }) as CancelablePromise<T>;

  wrappedPromise.cancel = () => {
    isCanceled = true;
  };

  return wrappedPromise;
}

// Using AbortController (modern approach)
export function fetchWithCancel(
  url: string,
  options: RequestInit = {}
): { promise: Promise<Response>; abort: () => void } {
  const controller = new AbortController();

  const promise = fetch(url, {
    ...options,
    signal: controller.signal,
  });

  return {
    promise,
    abort: () => controller.abort(),
  };
}

// =============================================================================
// EVENT LOOP UTILITIES: Yield to browser
// =============================================================================

// Yield to browser between chunks of work
export async function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    // scheduler.yield() is the modern API, setTimeout fallback
    if ('scheduler' in globalThis && 'yield' in (globalThis as any).scheduler) {
      (globalThis as any).scheduler.yield().then(resolve);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

// Process array in chunks, yielding between each
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize: number = 100
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    results.push(...chunk.map(processor));

    // Yield to browser between chunks
    if (i + chunkSize < items.length) {
      await yieldToMain();
    }
  }

  return results;
}

// =============================================================================
// PRIORITY QUEUE: Similar to React's lane-based scheduling
// =============================================================================

type Priority = 'immediate' | 'high' | 'normal' | 'low' | 'idle';

interface Task<T> {
  priority: Priority;
  execute: () => T | Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

export class PriorityScheduler {
  private queues: Map<Priority, Task<any>[]> = new Map([
    ['immediate', []],
    ['high', []],
    ['normal', []],
    ['low', []],
    ['idle', []],
  ]);

  private isProcessing = false;
  private priorityOrder: Priority[] = ['immediate', 'high', 'normal', 'low', 'idle'];

  schedule<T>(priority: Priority, execute: () => T | Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queues.get(priority)!.push({ priority, execute, resolve, reject });
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (true) {
      const task = this.getNextTask();
      if (!task) break;

      try {
        const result = await task.execute();
        task.resolve(result);
      } catch (error) {
        task.reject(error);
      }

      // Yield between tasks to allow higher priority work
      await yieldToMain();
    }

    this.isProcessing = false;
  }

  private getNextTask(): Task<any> | undefined {
    for (const priority of this.priorityOrder) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    return undefined;
  }
}

// =============================================================================
// DEMO: Comparing approaches
// =============================================================================

export async function demo() {
  console.log('=== Concurrency Utilities Demo ===\n');

  // Throttle demo
  console.log('1. Throttle (max once per 100ms):');
  const throttled = throttle((x: number) => console.log(`  Throttled: ${x}`), 100);
  for (let i = 0; i < 5; i++) {
    throttled(i);
    await new Promise((r) => setTimeout(r, 30));
  }

  await new Promise((r) => setTimeout(r, 200));

  // Debounce demo
  console.log('\n2. Debounce (wait 100ms after last call):');
  let debounceCount = 0;
  const debounced = debounce(() => console.log(`  Debounced after ${debounceCount} calls`), 100);
  for (let i = 0; i < 5; i++) {
    debounceCount++;
    debounced();
    await new Promise((r) => setTimeout(r, 30));
  }

  await new Promise((r) => setTimeout(r, 200));

  // Priority scheduler demo
  console.log('\n3. Priority Scheduler:');
  const scheduler = new PriorityScheduler();

  scheduler.schedule('low', () => console.log('  Low priority task'));
  scheduler.schedule('immediate', () => console.log('  Immediate priority task'));
  scheduler.schedule('normal', () => console.log('  Normal priority task'));
  scheduler.schedule('high', () => console.log('  High priority task'));

  await new Promise((r) => setTimeout(r, 100));

  // Chunked processing demo
  console.log('\n4. Chunked Processing:');
  const items = Array.from({ length: 10 }, (_, i) => i);
  const results = await processInChunks(
    items,
    (x) => {
      console.log(`  Processing item ${x}`);
      return x * 2;
    },
    3
  );
  console.log(`  Results: [${results.join(', ')}]`);

  console.log('\n=== Demo Complete ===');
}

// Run demo if this is the main module
if (typeof require !== 'undefined' && require.main === module) {
  demo();
}
