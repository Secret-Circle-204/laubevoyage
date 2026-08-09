import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'
import { getDomainServices } from '../domains/factory'
import { bootstrapWebApplication } from '../domains/bootstrap'
import { EventBus } from '../domains/events/event-bus'
import { CustomerRepository } from '../domains/customer/repositories/customer-repository'

async function main() {
  console.log("Initializing Payload...");
  const payload = await getPayload({ config: configPromise });
  console.log("Payload initialized.");

  console.log("Bootstrapping Web Application (Compose and Wire Subscribers)...");
  await bootstrapWebApplication();

  const services = await getDomainServices();
  const customerRepo = new CustomerRepository(payload);
  const customerId = 53;
  const eventId = `test_recovery_event_${Date.now()}`;
  const subscriberName = 'CustomerSubscriber.grantWelcomeBonus';
  const inboxKey = `${eventId}:${subscriberName}`;

  // Helper to count welcome ledger entries for customer 53
  const countWelcomeLedgerEntries = async (): Promise<number> => {
    const res = await payload.find({
      collection: 'point-ledger',
      where: {
        user: { equals: customerId },
        type: { equals: 'welcome_bonus' },
      },
    });
    return res.totalDocs;
  };

  console.log("\n=================== TEST CASE 1: Stale Projection Recovery (Customer 53) ===================");

  // 1. Force state: Customer cache = 0, Ledger = 100, Inbox does not have eventId
  console.log("Resetting customer 53's points cache to 0...");
  await payload.update({
    collection: 'customers',
    id: customerId,
    data: {
      loyalty: {
        tier: 'explorer',
        points: 0,
        totalSpent: 0,
      },
    },
  });

  // Verify initial state
  let welcomeLedgerCount = await countWelcomeLedgerEntries();
  console.log(`Initial Welcome Ledger entries for customer 53: ${welcomeLedgerCount}`);
  if (welcomeLedgerCount === 0) {
    console.log("No welcome ledger entry found. Appending one manually to simulate crash after ledger write but before projection update.");
    await payload.create({
      collection: 'point-ledger',
      data: {
        user: customerId,
        type: 'welcome_bonus',
        amount: 100,
        balance: 100,
        reason: 'Welcome bonus for registering email account',
        referenceType: 'system_welcome',
        referenceId: String(customerId),
        ledgerVersion: 1,
      },
    });
    welcomeLedgerCount = await countWelcomeLedgerEntries();
  }

  const initialCust = await customerRepo.findById(customerId);
  console.log(`Initial Customer cache points: ${initialCust.loyalty?.points}`);
  
  // 2. Publish CUSTOMER_REGISTERED event
  console.log(`Publishing CUSTOMER_REGISTERED event (eventId: ${eventId})...`);
  await EventBus.getInstance().publish({
    type: 'CUSTOMER_REGISTERED',
    eventId,
    correlationId: 'test_correlation',
    eventVersion: 1,
    customerId,
    email: 'test-2@mail.com',
  });

  // Wait a moment for event loop to process async subscribers
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 3. Verify assertions
  const updatedCust = await customerRepo.findById(customerId);
  const finalLedgerCount = await countWelcomeLedgerEntries();
  console.log(`Final Customer cache points: ${updatedCust.loyalty?.points}`);
  console.log(`Final Welcome Ledger entries for customer 53: ${finalLedgerCount}`);

  // Check event-inbox record
  const inboxRes = await payload.find({
    collection: 'event-inbox',
    where: { idempotencyKey: { equals: inboxKey } },
  });
  console.log(`Inbox record created: ${inboxRes.totalDocs > 0}`);

  if (updatedCust.loyalty?.points === 100 && finalLedgerCount === 1 && inboxRes.totalDocs > 0) {
    console.log("✅ TEST CASE 1 PASSED!");
  } else {
    console.error("❌ TEST CASE 1 FAILED!");
    process.exit(1);
  }

  console.log("\n=================== TEST CASE 2: Duplicate Event Delivery Protection ===================");

  // 1. Publish the exact same event again
  console.log(`Publishing CUSTOMER_REGISTERED event again (eventId: ${eventId})...`);
  await EventBus.getInstance().publish({
    type: 'CUSTOMER_REGISTERED',
    eventId,
    correlationId: 'test_correlation',
    eventVersion: 1,
    customerId,
    email: 'test-2@mail.com',
  });

  await new Promise(resolve => setTimeout(resolve, 1500));

  // 2. Assert no duplicate ledger entries or changes
  const dupCust = await customerRepo.findById(customerId);
  const dupLedgerCount = await countWelcomeLedgerEntries();
  console.log(`Ledger entries count: ${dupLedgerCount}`);
  console.log(`Customer cache points: ${dupCust.loyalty?.points}`);

  if (dupCust.loyalty?.points === 100 && dupLedgerCount === 1) {
    console.log("✅ TEST CASE 2 PASSED!");
  } else {
    console.error("❌ TEST CASE 2 FAILED!");
    process.exit(1);
  }

  console.log("\n=================== TEST CASE 3: Transactional Inbox Rollback on Failure ===================");

  // 1. Force failure by causing the subscriber to throw an error
  const failEventId = `test_fail_event_${Date.now()}`;
  const failInboxKey = `${failEventId}:${subscriberName}`;

  // We temporarily corrupt CustomerRepository to throw an error on updateLoyaltyProfile
  const originalUpdate = customerRepo.updateLoyaltyProfile;
  customerRepo.updateLoyaltyProfile = async () => {
    throw new Error("Simulated Database Failure during Projection Update");
  };

  // Re-inject customer service to use our mocked repo
  (services.customer as any).repository = customerRepo;

  console.log(`Publishing CUSTOMER_REGISTERED event (eventId: ${failEventId}) which will fail...`);
  try {
    await EventBus.getInstance().publish({
      type: 'CUSTOMER_REGISTERED',
      eventId: failEventId,
      correlationId: 'test_correlation',
      eventVersion: 1,
      customerId,
      email: 'test-2@mail.com',
    });
  } catch (err: any) {
    console.log(`Caught expected error: ${err.message}`);
  }

  await new Promise(resolve => setTimeout(resolve, 1500));

  // Restore repository method
  customerRepo.updateLoyaltyProfile = originalUpdate;
  (services.customer as any).repository = customerRepo;

  // 2. Assert: Inbox record was NOT created (rolled back)
  const failInboxRes = await payload.find({
    collection: 'event-inbox',
    where: { idempotencyKey: { equals: failInboxKey } },
  });
  console.log(`Inbox record for failed event exists: ${failInboxRes.totalDocs > 0}`);

  if (failInboxRes.totalDocs === 0) {
    console.log("✅ TEST CASE 3 PASSED! Inbox record successfully rolled back on failure.");
  } else {
    console.error("❌ TEST CASE 3 FAILED! Inbox record was committed despite failure!");
    process.exit(1);
  }

  console.log("\nAll tests completed successfully.");
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
