# AI Working Journal

### Problem Decomposition & Initial Setup 
- **Asked AI:** How to break down the claims system into core entities, backend boundaries, and sync vs. async flows
- **Accepted:** Used a modular monolith (.NET 8 + SQLite) with Apache Kafka (`claim-events`) to separate synchronous claim writes from async manager exposure metrics.
- **Challenged:** Rejected a flat 2-table design and added normalized `Claimants` and `ClaimsStaff` lookup tables with foreign keys, while skipping auth CRUD to save time.

