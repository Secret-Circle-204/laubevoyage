import * as migration_20260723_201901 from './20260723_201901';
import * as migration_20260724_123704 from './20260724_123704';
import * as migration_20260724_163137_add_languages_domain_collection from './20260724_163137_add_languages_domain_collection';
import * as migration_20260724_185854_add_system_settings_global from './20260724_185854_add_system_settings_global';
import * as migration_20260725_144323_add_departure_slots_collection from './20260725_144323_add_departure_slots_collection';
import * as migration_20260725_144943_add_capacity_total_to_experiences from './20260725_144943_add_capacity_total_to_experiences';
import * as migration_20260725_153250_clean_single_source_of_truth from './20260725_153250_clean_single_source_of_truth';
import * as migration_20260726_171618_alter_experience_price_nullable from './20260726_171618_alter_experience_price_nullable';

export const migrations = [
  {
    up: migration_20260723_201901.up,
    down: migration_20260723_201901.down,
    name: '20260723_201901',
  },
  {
    up: migration_20260724_123704.up,
    down: migration_20260724_123704.down,
    name: '20260724_123704',
  },
  {
    up: migration_20260724_163137_add_languages_domain_collection.up,
    down: migration_20260724_163137_add_languages_domain_collection.down,
    name: '20260724_163137_add_languages_domain_collection',
  },
  {
    up: migration_20260724_185854_add_system_settings_global.up,
    down: migration_20260724_185854_add_system_settings_global.down,
    name: '20260724_185854_add_system_settings_global',
  },
  {
    up: migration_20260725_144323_add_departure_slots_collection.up,
    down: migration_20260725_144323_add_departure_slots_collection.down,
    name: '20260725_144323_add_departure_slots_collection',
  },
  {
    up: migration_20260725_144943_add_capacity_total_to_experiences.up,
    down: migration_20260725_144943_add_capacity_total_to_experiences.down,
    name: '20260725_144943_add_capacity_total_to_experiences',
  },
  {
    up: migration_20260725_153250_clean_single_source_of_truth.up,
    down: migration_20260725_153250_clean_single_source_of_truth.down,
    name: '20260725_153250_clean_single_source_of_truth',
  },
  {
    up: migration_20260726_171618_alter_experience_price_nullable.up,
    down: migration_20260726_171618_alter_experience_price_nullable.down,
    name: '20260726_171618_alter_experience_price_nullable'
  },
];
