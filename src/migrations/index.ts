import * as migration_20260926_150614_baseline from './20260926_150614_baseline';
import * as migration_20260927_173000_canonical_traveler_registry from './20260927_173000_canonical_traveler_registry';
import * as migration_20260927_174500_sync_payload_internal_travelers_schema from './20260927_174500_sync_payload_internal_travelers_schema';
import * as migration_20260927_193500_traveler_uniqueness_and_legacy_cleanup from './20260927_193500_traveler_uniqueness_and_legacy_cleanup';

export const migrations = [
  {
    up: migration_20260926_150614_baseline.up,
    down: migration_20260926_150614_baseline.down,
    name: '20260926_150614_baseline'
  },
  {
    up: migration_20260927_173000_canonical_traveler_registry.up,
    down: migration_20260927_173000_canonical_traveler_registry.down,
    name: '20260927_173000_canonical_traveler_registry'
  },
  {
    up: migration_20260927_174500_sync_payload_internal_travelers_schema.up,
    down: migration_20260927_174500_sync_payload_internal_travelers_schema.down,
    name: '20260927_174500_sync_payload_internal_travelers_schema'
  },
  {
    up: migration_20260927_193500_traveler_uniqueness_and_legacy_cleanup.up,
    down: migration_20260927_193500_traveler_uniqueness_and_legacy_cleanup.down,
    name: '20260927_193500_traveler_uniqueness_and_legacy_cleanup'
  },
];
