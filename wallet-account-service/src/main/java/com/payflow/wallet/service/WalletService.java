package com.payflow.wallet.service;

import com.payflow.wallet.config.KafkaTopicConfig;
import com.payflow.wallet.event.WalletBalanceUpdatedEvent;
import com.payflow.wallet.model.Wallet;
import com.payflow.wallet.repository.WalletRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class WalletService {

    private static final Logger log = LoggerFactory.getLogger(WalletService.class);

    private final WalletRepository walletRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public WalletService(WalletRepository walletRepository, KafkaTemplate<String, Object> kafkaTemplate) {
        this.walletRepository = walletRepository;
        this.kafkaTemplate = kafkaTemplate;
    }

    @PostConstruct
    @Transactional
    public void seedInitialWallets() {
        if (!walletRepository.existsByUsernameAndCurrency("alice", "INR")) {
            walletRepository.save(new Wallet("alice", "PF-INR-1001", "INR", new BigDecimal("50000.0000")));
            walletRepository.save(new Wallet("alice", "PF-USD-1001", "USD", new BigDecimal("600.0000")));
            log.info("Seeded Alice's FinTech wallets (50000.00 INR, 600.00 USD)");
        }

        if (!walletRepository.existsByUsernameAndCurrency("bob", "INR")) {
            walletRepository.save(new Wallet("bob", "PF-INR-1002", "INR", new BigDecimal("25000.0000")));
            walletRepository.save(new Wallet("bob", "PF-USD-1002", "USD", new BigDecimal("300.0000")));
            log.info("Seeded Bob's FinTech wallets (25000.00 INR, 300.00 USD)");
        }
    }

    public List<Wallet> getWalletsByUsername(String username) {
        return walletRepository.findByUsername(username);
    }

    public Optional<Wallet> getWallet(String username, String currency) {
        return walletRepository.findByUsernameAndCurrency(username, currency);
    }

    @Transactional
    public Wallet createWallet(String username, String currency) {
        if (walletRepository.existsByUsernameAndCurrency(username, currency)) {
            throw new IllegalArgumentException("Wallet already exists for username " + username + " with currency " + currency);
        }

        String accountNumber = "PF-" + currency + "-" + (1000 + (int)(Math.random() * 9000));
        Wallet wallet = new Wallet(username, accountNumber, currency, BigDecimal.ZERO);
        return walletRepository.save(wallet);
    }

    @Transactional
    public Wallet debitWallet(String username, String currency, BigDecimal amount, String referenceKey) {
        Wallet wallet = walletRepository.findByUsernameAndCurrency(username, currency)
                .orElseThrow(() -> new IllegalArgumentException("Wallet not found for " + username + " (" + currency + ")"));

        wallet.debit(amount);
        Wallet saved = walletRepository.saveAndFlush(wallet);

        // Publish event to Kafka
        publishBalanceEvent("WALLET_DEBITED", saved, amount.negate(), referenceKey);
        return saved;
    }

    @Transactional
    public Wallet creditWallet(String username, String currency, BigDecimal amount, String referenceKey) {
        Wallet wallet = walletRepository.findByUsernameAndCurrency(username, currency)
                .orElseThrow(() -> new IllegalArgumentException("Wallet not found for " + username + " (" + currency + ")"));

        wallet.credit(amount);
        Wallet saved = walletRepository.saveAndFlush(wallet);

        // Publish event to Kafka
        publishBalanceEvent("WALLET_CREDITED", saved, amount, referenceKey);
        return saved;
    }

    private void publishBalanceEvent(String eventType, Wallet wallet, BigDecimal amountChanged, String referenceKey) {
        try {
            WalletBalanceUpdatedEvent event = new WalletBalanceUpdatedEvent(
                    eventType,
                    wallet.getUsername(),
                    wallet.getAccountNumber(),
                    wallet.getCurrency(),
                    amountChanged,
                    wallet.getBalance(),
                    wallet.getVersion(),
                    referenceKey,
                    LocalDateTime.now()
            );
            kafkaTemplate.send(KafkaTopicConfig.WALLET_EVENTS_TOPIC, wallet.getUsername(), event);
            log.info("Emitted Kafka event to [{}]: user={}, version={}", KafkaTopicConfig.WALLET_EVENTS_TOPIC, wallet.getUsername(), wallet.getVersion());
        } catch (Exception ex) {
            log.warn("Kafka event publish skipped (standalone mode fallback): {}", ex.getMessage());
        }
    }
}
