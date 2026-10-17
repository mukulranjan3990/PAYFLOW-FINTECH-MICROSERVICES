# PayFlow FinTech: Cloud-Native Java 21 Microservices Banking & Ledger Platform

> High-Availability, Zero-Downtime Distributed FinTech Platform with Apache Kafka Event-Driven Synchronization, Optimistic Concurrency Control, and Idempotent Ledger Processing.

[![Java 21](https://img.shields.io/badge/Java-21%20LTS-007396?logo=openjdk&logoColor=white)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-3.2+-231F20?logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Flyway](https://img.shields.io/badge/Flyway-Migrations-CC0200?logo=flyway&logoColor=white)](https://flywaydb.org/)
[![Pure JavaScript React](https://img.shields.io/badge/Frontend-Pure%20React%20JS%20(JSDoc)-61DAFB?logo=react&logoColor=black)](https://react.dev/)

---

## 1. System Architecture Diagram

```
[ Client Browser / Mobile Web ]
               │
               ▼ (HTTPS / Port 8080 or Port 3000)
[ Ingress / Application Load Balancer ]
               │
               ▼
   [ fintech-web-portal :8080 ] (Stateless Gateway & FinTech UI)
     │                 │                     │
     │ REST (JWT)      │ REST (Balance/Lock) │ REST (Idempotency-Key)
     ▼                 ▼                     ▼
┌──────────────┐  ┌────────────────┐  ┌───────────────────────┐
│identity-auth │  │ wallet-account │  │ payment-ledger        │
│service :8081 │  │ service :8082  │  │ service :8083         │
└──────┬───────┘  └───────┬────────┘  └──────────┬────────────┘
       │                  │                      │
       │                  ▼                      ▼
       │         ┌─────────────────┐   ┌──────────────────────┐
       │         │fintech_wallet_db│   │  fintech_ledger_db   │
       │         └─────────────────┘   └──────────────────────┘
       ▼
┌──────────────────┐               ▲             ▲
│ fintech_auth_db  │               │             │
└──────────────────┘               │             │
                                   ▼             ▼
                     ┌──────────────────────────────────────┐
                     │      Apache Kafka Event Broker       │
                     │  Topics:                             │
                     │    • payment-events                  │
                     │    • wallet-events                   │
                     │    • ledger-events                   │
                     └──────────────────────────────────────┘
```

---

## 2. Multi-Module Project Structure

```
payflow-fintech-platform/
|-- pom.xml                                  # Root Maven Aggregator & Parent POM
|-- README.md                                # Cloud Architecture & DevOps Specification
|
|-- identity-auth-service/                   # Microservice 1 (Port 8081)
|   |-- pom.xml
|   `-- src/
|       |-- main/java/com/payflow/auth/
|       |   |-- IdentityAuthApplication.java
|       |   |-- controller/AuthController.java
|       |   |-- model/Customer.java
|       |   |-- repository/CustomerRepository.java
|       |   `-- service/AuthService.java
|       |-- main/resources/
|       |   |-- application.yml
|       |   `-- db/migration/V1__init_auth.sql
|       `-- test/
|           |-- java/com/payflow/auth/IdentityAuthApplicationTests.java
|           `-- resources/application-test.yml
|
|-- wallet-account-service/                  # Microservice 2 (Port 8082)
|   |-- pom.xml
|   `-- src/
|       |-- main/java/com/payflow/wallet/
|       |   |-- WalletAccountApplication.java
|       |   |-- config/KafkaTopicConfig.java
|       |   |-- controller/WalletController.java
|       |   |-- event/WalletBalanceUpdatedEvent.java
|       |   |-- model/Wallet.java            # JPA @Version Optimistic Locking
|       |   |-- repository/WalletRepository.java
|       |   `-- service/WalletService.java   # Emits to 'wallet-events' topic
|       |-- main/resources/
|       |   |-- application.yml
|       |   `-- db/migration/V1__init_wallet.sql
|       `-- test/
|           |-- java/com/payflow/wallet/WalletAccountApplicationTests.java
|           `-- resources/application-test.yml
|
|-- payment-ledger-service/                  # Microservice 3 (Port 8083)
|   |-- pom.xml
|   `-- src/
|       |-- main/java/com/payflow/ledger/
|       |   |-- PaymentLedgerApplication.java
|       |   |-- config/KafkaConsumerProducerConfig.java
|       |   |-- controller/PaymentController.java
|       |   |-- event/PaymentInitiatedEvent.java
|       |   |-- event/PaymentCompletedEvent.java
|       |   |-- model/LedgerTransaction.java # Immutable Transaction Ledger
|       |   |-- repository/LedgerRepository.java
|       |   `-- service/PaymentOrchestratorService.java # Idempotency-Key Enforcer
|       |-- main/resources/
|       |   |-- application.yml
|       |   `-- db/migration/V1__init_ledger.sql
|       `-- test/
|           |-- java/com/payflow/ledger/PaymentLedgerApplicationTests.java
|           `-- resources/application-test.yml
|
`-- fintech-web-portal/                      # Microservice 4 / Gateway (Port 8080)
    |-- pom.xml
    `-- src/
        |-- main/java/com/payflow/portal/
        |   |-- FintechPortalApplication.java
        |   |-- config/RestClientConfig.java
        |   `-- controller/PortalWebController.java # /api/v1/system-status aggregator
        |-- main/resources/
        |   `-- application.yml
        `-- test/
            |-- java/com/payflow/portal/FintechPortalApplicationTests.java
            `-- resources/application-test.yml
```

---

## 3. Key FinTech & Distributed Engineering Highlights

1. **JPA Optimistic Concurrency Control (`@Version`)**:
   - The `Wallet` entity incorporates a numerical `@Version` field. During concurrent debit/credit operations, Hibernate issues `UPDATE wallets SET balance = ?, version = version + 1 WHERE id = ? AND version = ?`.
   - Any collision instantly throws an `OptimisticLockingFailureException` (returning HTTP 409 Conflict), mathematically preventing race conditions and double-spending across distributed clusters.

2. **Idempotent Payment API (`Idempotency-Key`)**:
   - The `/api/v1/payments/transfer` endpoint requires or assigns a unique UUID idempotency key.
   - If an in-flight network timeout occurs and the client retries the transfer, the `PaymentOrchestratorService` intercepts the key, skips duplicate fund movements, and returns the existing ledger record with HTTP 200/201.

3. **Apache Kafka Event-Driven Synchronization**:
   - **`payment-events`**: Emitted on transfer initialization (`PAYMENT_INITIATED`).
   - **`wallet-events`**: Emitted upon balance state mutation (`WALLET_DEBITED`, `WALLET_CREDITED`) containing exact version numbers, delta amounts, and account numbers.
   - **`ledger-events`**: Emitted upon final settlement completion (`PAYMENT_COMPLETED`, `PAYMENT_FAILED`) for non-blocking ledger updates and distributed analytics pipelines.

4. **Zero-Downtime Cloud Readiness**:
   - Graceful shutdown (`server.shutdown=graceful`) with a 30-second phase timeout (`spring.lifecycle.timeout-per-shutdown-phase=30s`) guarantees inflight HTTP requests and Kafka commits drain before pod termination.
   - Built-in Spring Boot Actuator probes (`/actuator/health/liveness` and `/actuator/health/readiness`) allow seamless Kubernetes rolling deployments.

---

## 4. Environment Variables Matrix

| Variable | Default Value | Description |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | Active Spring profile |
| `JWT_SECRET` | `payflow-fintech-super-secure...` | 256-bit HMAC secret for JWT validation |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka cluster broker endpoint |
| `AUTH_DB_HOST` | `localhost` | PostgreSQL host for identity auth |
| `WALLET_DB_HOST` | `localhost` | PostgreSQL host for multi-currency wallet |
| `LEDGER_DB_HOST` | `localhost` | PostgreSQL host for immutable transactions |
| `AUTH_SERVICE_URL` | `http://localhost:8081` | Internal DNS for Auth Service |
| `WALLET_SERVICE_URL` | `http://localhost:8082` | Internal DNS for Wallet Service |
| `PAYMENT_SERVICE_URL` | `http://localhost:8083` | Internal DNS for Payment Ledger Service |

---

## 5. Build, Test & CI Verification

```bash
# Run unit tests across all 4 microservices with self-contained H2 in-memory databases
mvn clean verify -B

# Package all production JARs
mvn clean package -DskipTests -B

# Continuous Zero-Downtime Rollout Verification probe
watch -n 0.5 "curl -s http://localhost:8080/api/v1/system-status"
```

---

## 6. Pre-Seeded Default Test Accounts

| Username | Password | Account Number | Initial Balances | KYC Status |
|---|---|---|---|---|
| `alice` | `Password123!` | `PF-INR-1001` | ₹50,000.00 INR / $600.00 USD | **VERIFIED** |
| `bob` | `Password123!` | `PF-INR-1002` | ₹25,000.00 INR / $300.00 USD | **VERIFIED** |
