# AI Working Journal

### Problem Decomposition & Initial Setup 
- **Asked AI:** How to break down the claims system into core entities, backend boundaries, and sync vs. async flows
- **Accepted:** Used a modular monolith (.NET 8 + SQLite) with Apache Kafka (`claim-events`) to separate synchronous claim writes from async manager exposure metrics.
- **Overrode:** Rejected a flat 2-table design and added normalized `Claimants` and `ClaimsStaff` lookup tables with foreign keys, while skipping auth CRUD to save time.

### .NET 8 Backend, SQLite & Kafka Pipeline 
- **Asked AI:** To create the .NET 8 API, SQLite database tables, state-validated REST endpoints, and and Kafka sender/receiver code.
- **Accepted:** Built the claim status rules (`Submitted` -> `Assigned` -> `Approved`/`Rejected`) and a background worker that recalculates manager totals when Kafka events arrive.
- **Overrode:** Deleted the default `WeatherForecast` sample files and made sure the Kafka listener runs in the background without slowing down the API startup.

### Angular Frontend & End-to-End Wiring 
- **Asked AI:** To create a single-page Angular UI with a role switcher for Claimant, Claims Staff, and Manager views connected to the .NET API.
- **Accepted:** Built one clean component with dropdowns for seeded claimants/staff, action buttons for claim transitions, and auto-refreshing manager summary cards.
- **Overrode:** Kept all three views in a single page with a role toggle instead of adding complex routing or login screens, ensuring the full workflow works smoothly within the time limit and easier testing process.

### Project documentation in readme.md
- **Asked AI:** To write a clear, easy-to-read `README.md` explaining the system design, 4-table database, local setup steps, and 3-hour trade-offs.
- **Accepted:** Documented the exact startup commands for Docker, .NET, and Angular alongside a plain-English explanation of the sync vs. async Kafka flow.
- **Overrode:** Deleted the default `frontend/README.md` Angular template file so to avoid confusion.

### Staff Specialization Indicator 
- **Asked AI:** To add a "Recommended Match" badge in the Claims Staff view when a claim's type matches the selected staff member's specialization.
- **Accepted:** Added a blue visual badge next to matching claim types to guide staff toward their specialty area.
- **Overrode:** Kept the "Assign to Me" button enabled for all submitted claims instead of blocking cross-type assignments, allowing staff to help clear backlog spikes in other categories.