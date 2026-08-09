import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { CustomerRepository } from '../domains/customer/repositories/customer-repository'

async function main() {
  console.log("Initializing Payload...");
  const payload = await getPayload({ config: configPromise });
  console.log("Payload initialized.");

  const repo = new CustomerRepository(payload);
  const customerId = 53;

  console.log(`Fetching Customer aggregate for ID ${customerId}...`);
  const aggregate = await repo.findById(customerId);

  console.log("Resulting CustomerAggregate mapping:\n");
  console.log(JSON.stringify(aggregate, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
