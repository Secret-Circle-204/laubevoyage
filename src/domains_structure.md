# src/domains Directory & Files Structure

Below is the complete recursive list of all files and subdirectories within the `src/domains` layer:

```text
src/domains/
├── admin
│   ├── policies
│   │   └── admin-policy.ts
│   ├── audit-log-service.ts
│   ├── booking-operations.ts
│   ├── customer-operations.ts
│   ├── experience-operations.ts
│   ├── loyalty-operations.ts
│   ├── maintenance-operations.ts
│   ├── payment-operations.ts
│   ├── policy.ts
│   ├── repository.ts
│   ├── service.ts
│   ├── types.ts
│   └── workflow.ts
├── booking
│   ├── cancellation.ts
│   ├── capacity-hold.ts
│   ├── completion.ts
│   ├── confirmation.ts
│   ├── creator.ts
│   ├── expiration.ts
│   ├── history.ts
│   ├── number-generator.ts
│   ├── payment-attempts.ts
│   ├── policy.ts
│   ├── queries.ts
│   ├── repository.ts
│   ├── service.ts
│   ├── state-machine.ts
│   ├── types.ts
│   └── workflow.ts
├── content
│   ├── cache-manager.ts
│   ├── media-service.ts
│   ├── page-engine.ts
│   ├── policy.ts
│   ├── repository.ts
│   ├── search-indexer.ts
│   ├── seo-engine.ts
│   ├── service.ts
│   ├── slug-service.ts
│   ├── translation-bridge.ts
│   ├── types.ts
│   └── workflow.ts
├── currency
│   ├── contracts
│   │   └── exchange-rate-provider.ts
│   ├── providers
│   │   ├── composite-provider.ts
│   │   ├── exchangerate-api.ts
│   │   ├── fawazahmed-provider.ts
│   │   ├── openexchange.ts
│   │   ├── openexchangerates-provider.ts
│   │   ├── rate-provider.ts
│   │   └── types.ts
│   ├── catalog-registry.ts
│   ├── facade.ts
│   ├── pipeline.ts
│   ├── rate-registry.ts
│   ├── repository.ts
│   ├── rounding.ts
│   ├── service.ts
│   └── types.ts
├── customer
│   ├── identity
│   │   ├── authentication.ts
│   │   ├── identity-facade.ts
│   │   ├── password.ts
│   │   ├── registration.ts
│   │   └── verification.ts
│   ├── policies
│   │   └── customer-policy.ts
│   ├── repositories
│   │   ├── address-repository.ts
│   │   ├── customer-repository.ts
│   │   ├── session-repository.ts
│   │   └── traveler-repository.ts
│   ├── aggregate.ts
│   ├── device-sessions.ts
│   ├── gdpr-consent.ts
│   ├── policy.ts
│   ├── preferences-manager.ts
│   ├── profile-manager.ts
│   ├── queries.ts
│   ├── repository.ts
│   ├── service.ts
│   ├── state-machine.ts
│   ├── types.ts
│   └── workflow.ts
├── dashboard
│   ├── booking-hub.ts
│   ├── documents-hub.ts
│   ├── loyalty-hub.ts
│   ├── metrics.ts
│   ├── overview-aggregator.ts
│   ├── policy.ts
│   ├── profile-hub.ts
│   ├── query-bus.ts
│   ├── repository.ts
│   ├── service.ts
│   ├── types.ts
│   ├── widget-provider.ts
│   └── workflow.ts
├── destination
│   ├── repository.ts
│   ├── service.ts
│   └── types.ts
├── events
│   ├── subscribers
│   │   ├── customer-subscriber.ts
│   │   ├── dashboard-subscriber.ts
│   │   ├── inventory-subscriber.ts
│   │   ├── loyalty-notification-subscriber.ts
│   │   ├── loyalty-subscriber.ts
│   │   ├── notification-subscriber.ts
│   │   └── payment-subscriber.ts
│   ├── admin-events.ts
│   ├── booking-events.ts
│   ├── content-events.ts
│   ├── customer-events.ts
│   ├── event-bus.ts
│   ├── experience-events.ts
│   ├── loyalty-events.ts
│   ├── maintenance-events.ts
│   ├── master-system-events.ts
│   ├── notification-events.ts
│   ├── outbox.ts
│   ├── payment-events.ts
│   └── search-events.ts
├── experience
│   ├── aggregate.ts
│   ├── availability-policy.ts
│   ├── base-price-resolver.ts
│   ├── blackout-policy.ts
│   ├── bookable-departure-assembler.ts
│   ├── bookable-departure.ts
│   ├── departure-slot.ts
│   ├── inventory.ts
│   ├── policy.ts
│   ├── pricing-policy-registry.ts
│   ├── pricing-rules.ts
│   ├── promotion-engine.ts
│   ├── queries.ts
│   ├── repository.ts
│   ├── search.ts
│   ├── service.ts
│   ├── state-machine.ts
│   ├── types.ts
│   └── workflow.ts
├── languages
│   ├── index.ts
│   ├── repository.ts
│   ├── service.ts
│   └── types.ts
├── localization
│   └── service.ts
├── loyalty
│   ├── admin-adjustment.ts
│   ├── aggregate.ts
│   ├── campaign-provider.ts
│   ├── ledger-validator.ts
│   ├── point-hold.ts
│   ├── points-calculator.ts
│   ├── points-earner.ts
│   ├── points-expirer.ts
│   ├── points-redeemer.ts
│   ├── points-refunder.ts
│   ├── policy.ts
│   ├── projection-rebuilder.ts
│   ├── projection.ts
│   ├── queries.ts
│   ├── repository.ts
│   ├── service.ts
│   ├── state-machine.ts
│   ├── tier-config.ts
│   ├── tier-evaluator.ts
│   ├── tier-policy.ts
│   ├── tier-rebuilder.ts
│   ├── types.ts
│   └── workflow.ts
├── maintenance
│   ├── admin-facade.ts
│   ├── checkpoint-tracker.ts
│   ├── circuit-breaker.ts
│   ├── dlq-recovery.ts
│   ├── engine.ts
│   ├── health-service.ts
│   ├── lease-service.ts
│   ├── policy.ts
│   ├── reconciliation.ts
│   ├── repository.ts
│   ├── retention.ts
│   ├── scheduler.ts
│   ├── service.ts
│   ├── types.ts
│   └── workflow.ts
├── notification
│   ├── contracts
│   │   └── notification-channel-provider.ts
│   ├── providers
│   │   ├── email-adapter.ts
│   │   ├── failover-provider.ts
│   │   ├── provider.interface.ts
│   │   ├── push-adapter.ts
│   │   ├── sms-adapter.ts
│   │   └── whatsapp-adapter.ts
│   ├── attachment-generator.ts
│   ├── dispatcher.ts
│   ├── policy.ts
│   ├── queue.ts
│   ├── rate-limiter.ts
│   ├── repository.ts
│   ├── scheduler.ts
│   ├── service.ts
│   ├── template-engine.ts
│   ├── types.ts
│   ├── worker.ts
│   └── workflow.ts
├── payment
│   ├── adapters
│   │   ├── adapter.interface.ts
│   │   ├── bnpl.ts
│   │   ├── factory.ts
│   │   └── stripe.ts
│   ├── contracts
│   │   └── payment-provider.ts
│   ├── factory
│   │   └── payment-provider-factory.ts
│   ├── providers
│   │   ├── bnpl-provider.ts
│   │   ├── paymob-provider.ts
│   │   └── stripe-provider.ts
│   ├── aggregate.ts
│   ├── ledger.ts
│   ├── policy.ts
│   ├── queries.ts
│   ├── refund-processor.ts
│   ├── repository.ts
│   ├── service.ts
│   ├── session-creator.ts
│   ├── state-machine.ts
│   ├── types.ts
│   ├── webhook-processor.ts
│   └── workflow.ts
├── search
│   ├── availability-filter.ts
│   ├── facet-engine.ts
│   ├── geography-engine.ts
│   ├── policy.ts
│   ├── query-pipeline.ts
│   ├── repository.ts
│   ├── service.ts
│   ├── types.ts
│   └── workflow.ts
├── shared
│   ├── events
│   │   ├── event-bus.interface.ts
│   │   └── in-memory-event-bus.ts
│   ├── exceptions
│   │   └── domain-exception.ts
│   └── idempotency
│       └── idempotency-manager.ts
├── system
│   ├── global-error-boundary.ts
│   ├── master-event-bus.ts
│   ├── master-telemetry.ts
│   ├── readiness-checker.ts
│   ├── repository.ts
│   ├── service.ts
│   ├── settings-registry.ts
│   ├── types.ts
│   └── workflow.ts
├── translation
│   ├── factory
│   │   └── translation-provider-factory.ts
│   ├── providers
│   │   ├── google-provider.ts
│   │   ├── libre-provider.ts
│   │   └── provider.interface.ts
│   ├── dictionary.ts
│   ├── engine.ts
│   ├── repository.ts
│   ├── service.ts
│   └── types.ts
├── factory.ts
└── index.ts
```
