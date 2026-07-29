import * as migration_20260723_201901 from './20260723_201901';
import * as migration_20260724_123704 from './20260724_123704';
import * as migration_20260724_163137_add_languages_domain_collection from './20260724_163137_add_languages_domain_collection';
import * as migration_20260724_185854_add_system_settings_global from './20260724_185854_add_system_settings_global';
import * as migration_20260725_144323_add_departure_slots_collection from './20260725_144323_add_departure_slots_collection';
import * as migration_20260725_144943_add_capacity_total_to_experiences from './20260725_144943_add_capacity_total_to_experiences';
import * as migration_20260725_153250_clean_single_source_of_truth from './20260725_153250_clean_single_source_of_truth';
import * as migration_20260726_171618_alter_experience_price_nullable from './20260726_171618_alter_experience_price_nullable';
import * as migration_20260727_164841_EventInbox from './20260727_164841_EventInbox';
import * as migration_20260727_183134 from './20260727_183134';
import * as migration_20260727_183349_create_maintenance_leases from './20260727_183349_create_maintenance_leases';
import * as migration_20260728_131603 from './20260728_131603';
import * as migration_20260728_164241_create_loyalty_programs from './20260728_164241_create_loyalty_programs';
import * as migration_20260728_165414 from './20260728_165414';
import * as migration_20260728_170912 from './20260728_170912';
import * as migration_20260728_171042 from './20260728_171042';
import * as migration_20260728_174211 from './20260728_174211';
import * as migration_20260729_142840 from './20260729_142840';
import * as migration_20260729_155209 from './20260729_155209';
import * as migration_20260729_155308_add_country_default_lang from './20260729_155308_add_country_default_lang';
import * as migration_20260729_164215_add_language_default_currency from './20260729_164215_add_language_default_currency';
import * as migration_20260729_172246_rename_language_default_currency from './20260729_172246_rename_language_default_currency';

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
    name: '20260726_171618_alter_experience_price_nullable',
  },
  {
    up: migration_20260727_164841_EventInbox.up,
    down: migration_20260727_164841_EventInbox.down,
    name: '20260727_164841_EventInbox',
  },
  {
    up: migration_20260727_183134.up,
    down: migration_20260727_183134.down,
    name: '20260727_183134',
  },
  {
    up: migration_20260727_183349_create_maintenance_leases.up,
    down: migration_20260727_183349_create_maintenance_leases.down,
    name: '20260727_183349_create_maintenance_leases',
  },
  {
    up: migration_20260728_131603.up,
    down: migration_20260728_131603.down,
    name: '20260728_131603',
  },
  {
    up: migration_20260728_164241_create_loyalty_programs.up,
    down: migration_20260728_164241_create_loyalty_programs.down,
    name: '20260728_164241_create_loyalty_programs',
  },
  {
    up: migration_20260728_165414.up,
    down: migration_20260728_165414.down,
    name: '20260728_165414',
  },
  {
    up: migration_20260728_170912.up,
    down: migration_20260728_170912.down,
    name: '20260728_170912',
  },
  {
    up: migration_20260728_171042.up,
    down: migration_20260728_171042.down,
    name: '20260728_171042',
  },
  {
    up: migration_20260728_174211.up,
    down: migration_20260728_174211.down,
    name: '20260728_174211',
  },
  {
    up: migration_20260729_142840.up,
    down: migration_20260729_142840.down,
    name: '20260729_142840',
  },
  {
    up: migration_20260729_155209.up,
    down: migration_20260729_155209.down,
    name: '20260729_155209',
  },
  {
    up: migration_20260729_155308_add_country_default_lang.up,
    down: migration_20260729_155308_add_country_default_lang.down,
    name: '20260729_155308_add_country_default_lang',
  },
  {
    up: migration_20260729_164215_add_language_default_currency.up,
    down: migration_20260729_164215_add_language_default_currency.down,
    name: '20260729_164215_add_language_default_currency',
  },
  {
    up: migration_20260729_172246_rename_language_default_currency.up,
    down: migration_20260729_172246_rename_language_default_currency.down,
    name: '20260729_172246_rename_language_default_currency'
  },
];
