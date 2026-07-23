import * as migration_20260723_201901 from './20260723_201901';

export const migrations = [
  {
    up: migration_20260723_201901.up,
    down: migration_20260723_201901.down,
    name: '20260723_201901'
  },
];
