package com.payflow.ledger.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentInitiatedEvent(
        String transactionRef,
        String idempotencyKey,
        String senderUsername,
        String receiverUsername,
        BigDecimal amount,
        String currency,
        LocalDateTime initiatedAt
) {}
