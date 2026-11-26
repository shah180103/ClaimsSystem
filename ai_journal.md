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

### Claimant View Filtering (Claims History)
- **Asked AI:** To filter the Claimant view's claim history table so it only displays claims belonging to the currently selected policyholder.
- **Accepted:** Filtered the list on the frontend by matching `claimantId` to the dropdown selection, keeping full cross-company visibility intact for Claims Staff and Managers.
- **Overrode:** Kept the filtering in the frontend instead of creating a new backend endpoint (`GET /api/claims/claimant/{id}`), avoiding extra API routes and duplicate 5-second polling calls since the app already loads the active claims list.

### Claimant Status Change Notifications
- **Asked AI:** To alert policyholders in the Claimant view whenever one of their claims changes status to `Approved` or `Rejected`, including the staff's decision notes.
- **Accepted:** Tracked previous claim statuses across Angular's 5-second refresh cycles and displayed a dismissible banner at the top of the Claimant page upon status transition.
- **Overrode:** Handled status change detection directly in the frontend using the existing polling loop instead of adding SignalR websockets or email/Kafka notification workers, avoiding extra backend infrastructure while still giving instant user feedback.

### Final Scope & State Machine Decision 
- **Asked AI:** How to handle the staff-to-claimant additional information request requirement cleanly within the remaining time limit.
- **Accepted:** Documented the `InfoRequested` status and `ClaimComments` table in `README.md` under deferred scope and production next steps.
- **Overrode:** Rejected adding a frontend-only `localStorage` workaround so that 100% of claim states remain backed by real SQLite persistence and backend validation guards rather than unpersisted browser state.

### Claims Staff Queue Filtering 
- **Asked AI:** To add filter tabs in the Claims Staff view so adjusters can quickly isolate unassigned tasks and their own active claims without scrolling past closed records or other staff members' queues.
- **Accepted:** Added four frontend filter tabs (`Actionable`, `Available`, `My Queue`, and `All`) above the staff table, defaulting to `Actionable` so unassigned `Submitted` claims and the selected officer's `Assigned` claims appear immediately.
- **Overrode:** Implemented the queue filters directly in the Angular component over the already-loaded claims list instead of adding new query parameters or endpoints on the .NET API, keeping the backend API surface clean and avoiding extra HTTP requests.