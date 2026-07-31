import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "exchange_rates" ALTER COLUMN "source" SET DATA TYPE text;
  ALTER TABLE "exchange_rates" ALTER COLUMN "source" SET DEFAULT 'OpenExchange'::text;
  DROP TYPE "public"."enum_exchange_rates_source";
  CREATE TYPE "public"."enum_exchange_rates_source" AS ENUM('OpenExchange', 'ExchangeRate-API', 'FawazAhmed-CDN', 'Manual');
  ALTER TABLE "exchange_rates" ALTER COLUMN "source" SET DEFAULT 'OpenExchange'::"public"."enum_exchange_rates_source";
  ALTER TABLE "exchange_rates" ALTER COLUMN "source" SET DATA TYPE "public"."enum_exchange_rates_source" USING "source"::"public"."enum_exchange_rates_source";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "exchange_rates" ALTER COLUMN "source" SET DATA TYPE text;
  ALTER TABLE "exchange_rates" ALTER COLUMN "source" SET DEFAULT 'OpenExchange'::text;
  DROP TYPE "public"."enum_exchange_rates_source";
  CREATE TYPE "public"."enum_exchange_rates_source" AS ENUM('OpenExchange', 'ECB', 'Fixer', 'Manual');
  ALTER TABLE "exchange_rates" ALTER COLUMN "source" SET DEFAULT 'OpenExchange'::"public"."enum_exchange_rates_source";
  ALTER TABLE "exchange_rates" ALTER COLUMN "source" SET DATA TYPE "public"."enum_exchange_rates_source" USING "source"::"public"."enum_exchange_rates_source";`)
}
