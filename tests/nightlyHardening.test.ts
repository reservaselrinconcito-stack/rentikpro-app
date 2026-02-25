import { describe, it, expect } from 'vitest';
import { withRetry } from '../src/utils/async';
import { dbQueue } from '../src/services/dbQueue';
import { on, emit } from '../src/services/events';
import { tableHasColumn } from '../src/services/schema';
import { beginMaintenance, endMaintenance } from '../src/services/maintenance';

describe('nightly hardening: async + dbQueue + events + schema', () => {
  it('withRetry retries and returns value', async () => {
    let tries = 0;
    const v = await withRetry(async () => {
      tries++;
      if (tries < 3) throw new Error('nope');
      return 'ok';
    }, 5, 1);
    expect(v).toBe('ok');
    expect(tries).toBe(3);
  });

  it('dbQueue serializes tasks and survives failures', async () => {
    const order: string[] = [];

    const a = dbQueue(async () => {
      order.push('a:start');
      await new Promise((r) => setTimeout(r, 5));
      order.push('a:end');
      return 1;
    });

    const b = dbQueue(async () => {
      order.push('b');
      throw new Error('boom');
    });

    const c = dbQueue(async () => {
      order.push('c');
      return 3;
    });

    await expect(a).resolves.toBe(1);
    await expect(b).rejects.toThrow('boom');
    await expect(c).resolves.toBe(3);

    expect(order).toEqual(['a:start', 'a:end', 'b', 'c']);
  });

  it('events on/emit delivers payload and can unsubscribe', () => {
    const got: any[] = [];
    const off = on('x', (p) => got.push(p));
    emit('x', { a: 1 });
    off();
    emit('x', { a: 2 });
    expect(got).toEqual([{ a: 1 }]);
  });

  it('tableHasColumn supports queryAll and exec shapes', async () => {
    const dbQueryAll = {
      queryAll: async () => [{ name: 'id' }, { name: 'deleted_at' }],
    };
    await expect(tableHasColumn(dbQueryAll, 't', 'deleted_at')).resolves.toBe(true);
    await expect(tableHasColumn(dbQueryAll, 't', 'missing')).resolves.toBe(false);

    const dbExec = {
      exec: async () => [{ values: [[0, 'id'], [1, 'deleted_at']] }],
    };
    await expect(tableHasColumn(dbExec, 't', 'deleted_at')).resolves.toBe(true);
    await expect(tableHasColumn(dbExec, 't', 'missing')).resolves.toBe(false);
  });

  it('maintenance mode blocks dbQueue tasks', async () => {
    beginMaintenance('restore');
    await expect(dbQueue(async () => 123)).rejects.toThrow(/maintenance/i);
    endMaintenance();
    await expect(dbQueue(async () => 123)).resolves.toBe(123);
  });
});
