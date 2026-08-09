import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'

async function main() {
  console.log("Initializing Payload...");
  const payload = await getPayload({ config: configPromise });
  console.log("Payload initialized.");

  // Get all customers
  const customersRes = await payload.find({
    collection: 'customers',
    limit: 1000,
  });

  console.log(`Auditing ${customersRes.docs.length} customers...`);

  let mismatchCount = 0;

  for (const customer of customersRes.docs) {
    const customerId = customer.id;
    const cachedPoints = customer.loyalty?.points || 0;

    // Get point ledger entries
    const ledgerRes = await payload.find({
      collection: 'point-ledger',
      where: {
        user: { equals: customerId },
      },
      limit: 1000,
    });

    // Calculate sum
    const ledgerSum = ledgerRes.docs.reduce((acc, entry) => acc + (entry.amount || 0), 0);

    if (cachedPoints !== ledgerSum) {
      mismatchCount++;
      console.log(`[MISMATCH] Customer #${customerId} (${customer.email}):`);
      console.log(`  - Cached points: ${cachedPoints}`);
      console.log(`  - Ledger sum:    ${ledgerSum}`);
    }
  }

  console.log(`\nAudit finished. Total mismatched customers: ${mismatchCount}`);
  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
