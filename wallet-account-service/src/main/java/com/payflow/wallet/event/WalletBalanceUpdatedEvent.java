package com.payflow.wallet.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WalletBalanceUpdatedEvent(
        String eventType,
        String username,
        String accountNumber,
        String currency,
        BigDecimal amountChanged,
        BigDecimal newBalance,
        Long version,
        String referenceKey,
        LocalDateTime timestamp
) {}
