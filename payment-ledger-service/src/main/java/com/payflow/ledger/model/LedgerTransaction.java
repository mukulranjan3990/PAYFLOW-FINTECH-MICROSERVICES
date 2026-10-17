package com.payflow.ledger.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class LedgerTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_ref", nullable = false, unique = true, length = 40)
    private String transactionRef;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 64)
    private String idempotencyKey;

    @Column(name = "sender_username", nullable = false, length = 50)
    private String senderUsername;

    @Column(name = "receiver_username", nullable = false, length = 50)
    private String receiverUsername;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    private String currency = "INR";

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "processed_by_host", nullable = false, length = 100)
    private String processedByHost;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public LedgerTransaction() {}

    public LedgerTransaction(String transactionRef, String idempotencyKey, String senderUsername,
                             String receiverUsername, BigDecimal amount, String currency,
                             String status, String processedByHost) {
        this.transactionRef = transactionRef;
        this.idempotencyKey = idempotencyKey;
        this.senderUsername = senderUsername;
        this.receiverUsername = receiverUsername;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
        this.processedByHost = processedByHost;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getTransactionRef() { return transactionRef; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public String getSenderUsername() { return senderUsername; }
    public String getReceiverUsername() { return receiverUsername; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getProcessedByHost() { return processedByHost; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
