import * as migration_20260317_182633_excursions_media_rel from './20260317_182633_excursions_media_rel';
import * as migration_20260317_fix_enum from './20260317_fix_enum';
import * as migration_20260404_160745_order_reorder_column from './20260404_160745_order_reorder_column';
import * as migration_20260404_173344_AboutPageSchemaUpdate from './20260404_173344_AboutPageSchemaUpdate';
import * as migration_20260408_153944_loyalty_settings from './20260408_153944_loyalty_settings';

export const migrations = [
  {
    up: migration_20260317_182633_excursions_media_rel.up,
    down: migration_20260317_182633_excursions_media_rel.down,
    name: '20260317_182633_excursions_media_rel',
  },
  {
    up: migration_20260317_fix_enum.up,
    down: migration_20260317_fix_enum.down,
    name: '20260317_fix_enum',
  },
  {
    up: migration_20260404_160745_order_reorder_column.up,
    down: migration_20260404_160745_order_reorder_column.down,
    name: '20260404_160745_order_reorder_column',
  },
  {
    up: migration_20260404_173344_AboutPageSchemaUpdate.up,
    down: migration_20260404_173344_AboutPageSchemaUpdate.down,
    name: '20260404_173344_AboutPageSchemaUpdate',
  },
  {
    up: migration_20260408_153944_loyalty_settings.up,
    down: migration_20260408_153944_loyalty_settings.down,
    name: '20260408_153944_loyalty_settings'
  },
];
