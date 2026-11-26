# Claims Management System (`ClaimsSystem`)

A full-stack insurance claims tracking application built with **.NET 8**, **SQLite**, **Apache Kafka**, and **Angular**. 

This system allows policyholders to submit claims, claims staff to review and approve or reject them, and managers to monitor live financial exposure totals.

---

## 1. System Overview & Architecture

The application uses a **modular monolith** backend paired with an **event-driven background worker**:

* **Synchronous REST API (.NET 8 + SQLite):** Handles all core claim actions (`Submit`, `Assign`, `Approve`, `Reject`) immediately so users see instant feedback and strict status validation.
* **Asynchronous Event Pipeline (Apache Kafka):** Whenever a claim is created, assigned, or settled, the backend publishes an event to the `claim-events` topic. A background listener (`MetricsConsumerService`) reads those events and recalculates `ManagerMetrics` in SQLite without slowing down user requests.
* **Single-Page Frontend (Angular):** Provides a simple top role switcher (**Claimant**, **Claims Staff**, **Manager**) using pre-seeded accounts so the entire workflow can be tested without login friction.

---

## 2. Database Design (4 Normalized Tables)

Instead of storing everything in one flat table, the database separates user profiles, claims, and reporting totals:

1. **`Claimants` (Pre-seeded):** Stores policyholder info (`Id`, `FullName`, `PolicyNumber`, `Email`).
2. **`ClaimsStaff` (Pre-seeded):** Stores adjuster info (`Id`, `FullName`, `Specialization`).
3. **`Claims`:** Stores each claim (`Id`, `ClaimantId`, `AssignedStaffId`, `ClaimType`, `Description`, `ClaimAmount`, `Status`, `DecisionNotes`, `CreatedAt`).
   * **Valid Lifecycle:** `Submitted` $\rightarrow$ `Assigned` $\rightarrow$ `Approved` or `Rejected` (terminal states cannot be edited).
4. **`ManagerMetrics`:** Stores aggregated totals (`PendingExposureAmount`, `ApprovedLiabilityAmount`, `OpenClaimsCount`, `TotalClaimsCount`, `LastUpdatedAt`), updated asynchronously via Kafka.

---

## 3. Prerequisites

Before running the project locally, make sure you have:
* **Docker Desktop** (running)
* **.NET 8 SDK**
* **Node.js (LTS)** & **Angular CLI** (`npm install -g @angular/cli`)

---

## 4. How to Run Locally

Open three terminals in the root `ClaimsSystem` folder and run these steps in order:

### Terminal 1: Start Apache Kafka
```bash
docker compose up -d
```

### Terminal 2: Start the .NET 8 Backend
```bash
cd backend
dotnet run
```
On first startup, SQLite (claims.db) is created automatically with sample claimants, staff, claims, and initial metrics.

Swagger API docs are available at http://localhost:5xxx/swagger (check terminal output for your exact port).

### Terminal 3: Start the Angular Frontend
```bash
cd frontend
npm install
ng serve
```
Open http://localhost:4200 in your browser.

---
## Scope & Trade-Offs (3-Hour Time Cap)

To deliver a reliable, working end-to-end system within the time limit:

- Included: Full claim state validation, normalized relational schema, real Kafka producer/consumer event flow, idempotent manager exposure math, and a working 3-role UI.

- Intentionally Deferred: User login/JWT authentication (replaced with pre-seeded dropdowns), file uploads for receipts, and cloud deployment.

- Next Steps for Production: Add role-based authentication, implement the Transactional Outbox pattern so database writes and Kafka events never go out of sync, and add automated xUnit integration tests.