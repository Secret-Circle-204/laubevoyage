import * as migration_20260926_150614_baseline from './20260926_150614_baseline';

export const migrations = [
  {
    up: migration_20260926_150614_baseline.up,
    down: migration_20260926_150614_baseline.down,
    name: '20260926_150614_baseline'
  },
];
