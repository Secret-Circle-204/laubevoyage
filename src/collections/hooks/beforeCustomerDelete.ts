import type { CollectionBeforeDeleteHook } from 'payload'

export const beforeCustomerDelete: CollectionBeforeDeleteHook = async ({ req, id }) => {
  if (!id) return;
  const customerId = Number(id);

  req.payload.logger.info(`[beforeCustomerDelete] Cascading deletes for customer ID ${customerId}`)

  // 1. Delete associated point-ledger records
  await req.payload.delete({
    collection: 'point-ledger',
    where: {
      user: {
        equals: customerId,
      },
    },
    req,
  });

  // 2. Delete associated bookings
  await req.payload.delete({
    collection: 'bookings',
    where: {
      user: {
        equals: customerId,
      },
    },
    req,
  });

  // 3. Delete associated reviews
  await req.payload.delete({
    collection: 'reviews',
    where: {
      customer: {
        equals: customerId,
      },
    },
    req,
  });

  // 4. Delete associated notification-logs
  await req.payload.delete({
    collection: 'notification-logs',
    where: {
      customer: {
        equals: customerId,
      },
    },
    req,
  });

  // 5. Delete associated dashboard-projections
  await req.payload.delete({
    collection: 'dashboard-projections',
    where: {
      customer: {
        equals: customerId,
      },
    },
    req,
  });

  // 6. Delete associated customer-travelers
  await req.payload.delete({
    collection: 'customer-travelers',
    where: {
      customer: {
        equals: customerId,
      },
    },
    req,
  });

  // 7. Delete associated customer-notification-preferences
  await req.payload.delete({
    collection: 'customer-notification-preferences',
    where: {
      customer: {
        equals: customerId,
      },
    },
    req,
  });

  // 8. Delete associated customer-device-sessions
  await req.payload.delete({
    collection: 'customer-device-sessions',
    where: {
      customer: {
        equals: customerId,
      },
    },
    req,
  });

  // 9. Delete associated customer-addresses
  await req.payload.delete({
    collection: 'customer-addresses',
    where: {
      customer: {
        equals: customerId,
      },
    },
    req,
  });
};
