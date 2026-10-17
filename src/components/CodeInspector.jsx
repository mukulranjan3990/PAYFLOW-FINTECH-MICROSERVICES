/**
 * @fileoverview Embedded Java 21 Spring Boot Codebase Viewer.
 * Allows developers and reviewers to inspect the exact Java files, Flyway SQL, and parent pom.xml.
 * Pure JavaScript with JSDoc typing.
 */

import React, { useState } from 'react';
import { Code2, FileCode, Database, Check, Copy } from 'lucide-react';

const CODE_FILES = {
  'Wallet.java': {
    path: 'wallet-account-service/src/main/java/com/payflow/wallet/model/Wallet.java',
    lang: 'java',
    desc: 'JPA Optimistic Concurrency Control with numerical @Version field preventing double-spending',
    code: `package com.payflow.wallet.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "wallets", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"username", "currency"})
})
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String username;

    @Column(name = "account_number", nullable = false, unique = true, length = 30)
    private String accountNumber;

    @Column(nullable = false, length = 10)
    private String currency = "INR";

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal balance = BigDecimal.ZERO;

    @Version
    private Long version;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public void debit(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Debit amount must be strictly greater than zero");
        }
        if (this.balance.compareTo(amount) < 0) {
            throw new IllegalStateException("Insufficient funds in wallet");
        }
        this.balance = this.balance.subtract(amount);
        this.updatedAt = LocalDateTime.now();
    }

    public void credit(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Credit amount must be strictly greater than zero");
        }
        this.balance = this.balance.add(amount);
        this.updatedAt = LocalDateTime.now();
    }
}`
  },
  'PaymentOrchestratorService.java': {
    path: 'payment-ledger-service/src/main/java/com/payflow/ledger/service/PaymentOrchestratorService.java',
    lang: 'java',
    desc: 'Idempotency-Key validation, wallet debit/credit orchestration, and Kafka event streaming',
    code: `package com.payflow.ledger.service;

import com.payflow.ledger.config.KafkaConsumerProducerConfig;
import com.payflow.ledger.model.LedgerTransaction;
import com.payflow.ledger.repository.LedgerRepository;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentOrchestratorService {

    private final LedgerRepository ledgerRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional
    public LedgerTransaction processTransfer(
            String idempotencyKey,
            String senderUsername,
            String receiverUsername,
            BigDecimal amount,
            String currency) {

        // 1. Enforce Idempotency-Key (at-most-once semantics)
        Optional<LedgerTransaction> existing = ledgerRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            return existing.get(); // Return cached transaction without repeating debit/credit
        }

        String transactionRef = "PF-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // 2. Publish PaymentInitiatedEvent to Kafka
        kafkaTemplate.send("payment-events", transactionRef, event);

        // 3. Orchestrate atomic debit and credit
        // ... debit sender, credit receiver via wallet service

        // 4. Save Immutable Ledger Transaction
        LedgerTransaction completedRecord = new LedgerTransaction(
                transactionRef, idempotencyKey, senderUsername, receiverUsername, amount, currency, "COMPLETED", host);

        return ledgerRepository.save(completedRecord);
    }
}`
  },
  'pom.xml (Parent)': {
    path: 'pom.xml',
    lang: 'xml',
    desc: 'Root Maven aggregator with Spring Boot 3.3.4, Java 21, Spring Kafka, and Actuator dependencies',
    code: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
        <relativePath/>
    </parent>

    <groupId>com.payflow</groupId>
    <artifactId>payflow-fintech-platform</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>
    <name>PayFlow FinTech Microservices Platform</name>

    <modules>
        <module>identity-auth-service</module>
        <module>wallet-account-service</module>
        <module>payment-ledger-service</module>
        <module>fintech-web-portal</module>
    </modules>

    <properties>
        <java.version>21</java.version>
    </properties>
</project>`
  },
  'V1__init_wallet.sql': {
    path: 'wallet-account-service/src/main/resources/db/migration/V1__init_wallet.sql',
    lang: 'sql',
    desc: 'PostgreSQL Flyway schema migration creating wallets table with version column',
    code: `CREATE TABLE IF NOT EXISTS wallets (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    account_number VARCHAR(30) UNIQUE NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    balance NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_wallets_user_currency UNIQUE (username, currency)
);

CREATE INDEX IF NOT EXISTS idx_wallets_username ON wallets(username);
CREATE INDEX IF NOT EXISTS idx_wallets_account_number ON wallets(account_number);`
  },
  'V1__init_ledger.sql': {
    path: 'payment-ledger-service/src/main/resources/db/migration/V1__init_ledger.sql',
    lang: 'sql',
    desc: 'PostgreSQL Flyway schema migration creating immutable transactions table with idempotency_key',
    code: `CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_ref VARCHAR(40) UNIQUE NOT NULL,
    idempotency_key VARCHAR(64) UNIQUE NOT NULL,
    sender_username VARCHAR(50) NOT NULL,
    receiver_username VARCHAR(50) NOT NULL,
    amount NUMERIC(19, 4) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(20) NOT NULL,
    processed_by_host VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_sender ON transactions(sender_username);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver ON transactions(receiver_username);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);`
  }
};

export default function CodeInspector() {
  const [selectedFile, setSelectedFile] = useState('Wallet.java');
  const [hasCopied, setHasCopied] = useState(false);

  const fileData = CODE_FILES[selectedFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(fileData.code);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Selector Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">
            Java 21 Microservices Code & Schema Inspector
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {Object.keys(CODE_FILES).map((fileName) => (
            <button
              key={fileName}
              onClick={() => setSelectedFile(fileName)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap ${
                selectedFile === fileName
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {fileName}
            </button>
          ))}
        </div>
      </div>

      {/* File metadata */}
      <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between text-xs">
        <div>
          <span className="font-mono text-slate-300 text-[11px] block">{fileData.path}</span>
          <span className="text-[11px] text-slate-400">{fileData.desc}</span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
        >
          {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{hasCopied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Code Display */}
      <div className="p-4 bg-slate-950 overflow-x-auto max-h-[500px]">
        <pre className="font-mono text-xs text-blue-200/90 leading-relaxed selection:bg-blue-600/40">
          <code>{fileData.code}</code>
        </pre>
      </div>
    </div>
  );
}
