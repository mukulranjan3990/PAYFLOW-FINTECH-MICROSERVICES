package com.payflow.ledger.service;

import com.payflow.ledger.config.KafkaConsumerProducerConfig;
import com.payflow.ledger.event.PaymentCompletedEvent;
import com.payflow.ledger.event.PaymentInitiatedEvent;
import com.payflow.ledger.model.LedgerTransaction;
import com.payflow.ledger.repository.LedgerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class PaymentOrchestratorService {

    private static final Logger log = LoggerFactory.getLogger(PaymentOrchestratorService.class);

    private final LedgerRepository ledgerRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final RestClient restClient;
    private final String walletServiceUrl;
    private final AtomicLong totalTransactionsProcessed = new AtomicLong(0);

    public PaymentOrchestratorService(
            LedgerRepository ledgerRepository,
            KafkaTemplate<String, Object> kafkaTemplate,
            @Value("${services.wallet-account.url:http://localhost:8082}") String walletServiceUrl) {
        this.ledgerRepository = ledgerRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.walletServiceUrl = walletServiceUrl;
        this.restClient = RestClient.builder().baseUrl(walletServiceUrl).build();
    }

    @Transactional
    public LedgerTransaction processTransfer(
            String idempotencyKey,
            String senderUsername,
            String receiverUsername,
            BigDecimal amount,
            String currency) {

        // 1. Enforce Idempotency-Key
        Optional<LedgerTransaction> existing = ledgerRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            log.info("Idempotent request intercepted for key [{}]. Returning cached ledger record.", idempotencyKey);
            return existing.get();
        }

        if (senderUsername.equalsIgnoreCase(receiverUsername)) {
            throw new IllegalArgumentException("Cannot transfer funds to the same account");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transfer amount must be strictly greater than zero");
        }

        String transactionRef = "PF-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String currentHost = resolveCurrentHostname();

        // 2. Publish PaymentInitiatedEvent to Kafka
        publishPaymentInitiated(transactionRef, idempotencyKey, senderUsername, receiverUsername, amount, currency);

        // 3. Orchestrate atomic debit and credit with wallet-account-service
        try {
            // Debit Sender
            Map<String, Object> debitRequest = Map.of(
                    "username", senderUsername,
                    "currency", currency,
                    "amount", amount,
                    "referenceKey", transactionRef
            );

            ResponseEntity<Void> debitResp = restClient.post()
                    .uri("/api/v1/wallets/debit")
                    .body(debitRequest)
                    .retrieve()
                    .toBodilessEntity();

            if (!debitResp.getStatusCode().is2xxSuccessful()) {
                throw new IllegalStateException("Debit operation rejected by wallet-account-service");
            }

            // Credit Receiver
            Map<String, Object> creditRequest = Map.of(
                    "username", receiverUsername,
                    "currency", currency,
                    "amount", amount,
                    "referenceKey", transactionRef
            );

            restClient.post()
                    .uri("/api/v1/wallets/credit")
                    .body(creditRequest)
                    .retrieve()
                    .toBodilessEntity();

            // 4. Record Immutable Ledger Transaction (COMPLETED)
            LedgerTransaction completedRecord = new LedgerTransaction(
                    transactionRef,
                    idempotencyKey,
                    senderUsername,
                    receiverUsername,
                    amount,
                    currency,
                    "COMPLETED",
                    currentHost
            );

            LedgerTransaction saved = ledgerRepository.save(completedRecord);
            totalTransactionsProcessed.incrementAndGet();

            // 5. Emit PaymentCompletedEvent to Kafka
            publishPaymentCompleted(saved);

            return saved;

        } catch (Exception ex) {
            log.error("Transfer failed for txn [{}]: {}", transactionRef, ex.getMessage());

            // Record FAILED transaction audit in ledger
            LedgerTransaction failedRecord = new LedgerTransaction(
                    transactionRef,
                    idempotencyKey,
                    senderUsername,
                    receiverUsername,
                    amount,
                    currency,
                    "FAILED",
                    currentHost
            );
            ledgerRepository.save(failedRecord);
            totalTransactionsProcessed.incrementAndGet();
            throw new RuntimeException("Fund transfer could not be settled: " + ex.getMessage(), ex);
        }
    }

    public List<LedgerTransaction> getTransactionHistory(String username) {
        return ledgerRepository.findTransactionHistoryForUser(username);
    }

    public List<LedgerTransaction> getAllTransactions() {
        return ledgerRepository.findAllByOrderByCreatedAtDesc();
    }

    public Map<String, Object> getTelemetry() {
        return Map.of(
                "service", "payment-ledger-service",
                "version", "1.0.0",
                "hostname", resolveCurrentHostname(),
                "totalTransactionsProcessed", totalTransactionsProcessed.get(),
                "activeEngine", "Kafka Event-Driven Orchestrator with Spring Actuator",
                "timestamp", LocalDateTime.now()
        );
    }

    @KafkaListener(topics = KafkaConsumerProducerConfig.PAYMENT_EVENTS_TOPIC, groupId = "payment-ledger-audit-group")
    public void consumePaymentEvents(Object event) {
        log.info("Kafka Consumer [payment-ledger-audit-group] received event from topic {}: {}",
                KafkaConsumerProducerConfig.PAYMENT_EVENTS_TOPIC, event);
    }

    private void publishPaymentInitiated(String ref, String idempKey, String sender, String receiver, BigDecimal amount, String currency) {
        try {
            PaymentInitiatedEvent event = new PaymentInitiatedEvent(ref, idempKey, sender, receiver, amount, currency, LocalDateTime.now());
            kafkaTemplate.send(KafkaConsumerProducerConfig.PAYMENT_EVENTS_TOPIC, ref, event);
        } catch (Exception e) {
            log.warn("Kafka event publish skipped (standalone fallback): {}", e.getMessage());
        }
    }

    private void publishPaymentCompleted(LedgerTransaction tx) {
        try {
            PaymentCompletedEvent event = new PaymentCompletedEvent(
                    tx.getTransactionRef(),
                    tx.getIdempotencyKey(),
                    tx.getSenderUsername(),
                    tx.getReceiverUsername(),
                    tx.getAmount(),
                    tx.getCurrency(),
                    tx.getStatus(),
                    tx.getProcessedByHost(),
                    LocalDateTime.now()
            );
            kafkaTemplate.send(KafkaConsumerProducerConfig.LEDGER_EVENTS_TOPIC, tx.getTransactionRef(), event);
        } catch (Exception e) {
            log.warn("Kafka ledger event publish skipped: {}", e.getMessage());
        }
    }

    private String resolveCurrentHostname() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (UnknownHostException e) {
            return "payment-ledger-pod-01";
        }
    }
}
