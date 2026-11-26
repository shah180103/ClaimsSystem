# AI Working Journal

### Problem Decomposition & Initial Setup 
- **Asked AI:** How to break down the claims system into core entities, backend boundaries, and sync vs. async flows
- **Accepted:** Used a modular monolith (.NET 8 + SQLite) with Apache Kafka (`claim-events`) to separate synchronous claim writes from async manager exposure metrics.
- **Overrode:** Rejected a flat 2-table design and added normalized `Claimants` and `ClaimsStaff` lookup tables with foreign keys, while skipping auth CRUD to save time.

### .NET 8 Backend, SQLite & Kafka Pipeline 
- **Asked AI:** To create the .NET 8 API, SQLite database tables, state-validated REST endpoints, and and Kafka sender/receiver code.
- **Accepted:** Built the claim status rules (`Submitted` -> `Assigned` -> `Approved`/`Rejected`) and a background worker that recalculates manager totals when Kafka events arrive.
- **Overrode:** Deleted the default `WeatherForecast` sample files and made sure the Kafka listener runs in the background without slowing down the API startup.