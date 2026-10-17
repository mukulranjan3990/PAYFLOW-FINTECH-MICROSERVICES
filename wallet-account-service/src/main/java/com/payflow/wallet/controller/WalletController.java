package com.payflow.wallet.controller;

import com.payflow.wallet.model.Wallet;
import com.payflow.wallet.service.WalletService;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/wallets")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping("/{username}")
    public ResponseEntity<List<Wallet>> getWallets(@PathVariable String username) {
        List<Wallet> wallets = walletService.getWalletsByUsername(username);
        return ResponseEntity.ok(wallets);
    }

    @PostMapping("/create")
    public ResponseEntity<?> createWallet(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String currency = request.getOrDefault("currency", "INR");
            Wallet created = walletService.createWallet(username, currency);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/debit")
    public ResponseEntity<?> debit(@RequestBody Map<String, Object> request) {
        try {
            String username = (String) request.get("username");
            String currency = (String) request.getOrDefault("currency", "INR");
            BigDecimal amount = new BigDecimal(request.get("amount").toString());
            String referenceKey = (String) request.getOrDefault("referenceKey", "TXN-" + System.currentTimeMillis());

            Wallet updated = walletService.debitWallet(username, currency, amount, referenceKey);
            return ResponseEntity.ok(updated);
        } catch (OptimisticLockingFailureException olfe) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "Concurrent transaction conflict detected. Optimistic lock validation failed.",
                    "code", "OPTIMISTIC_LOCK_COLLISION"
            ));
        } catch (IllegalStateException ise) {
            return ResponseEntity.badRequest().body(Map.of("error", ise.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/credit")
    public ResponseEntity<?> credit(@RequestBody Map<String, Object> request) {
        try {
            String username = (String) request.get("username");
            String currency = (String) request.getOrDefault("currency", "INR");
            BigDecimal amount = new BigDecimal(request.get("amount").toString());
            String referenceKey = (String) request.getOrDefault("referenceKey", "TXN-" + System.currentTimeMillis());

            Wallet updated = walletService.creditWallet(username, currency, amount, referenceKey);
            return ResponseEntity.ok(updated);
        } catch (OptimisticLockingFailureException olfe) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "Concurrent transaction conflict detected. Optimistic lock validation failed.",
                    "code", "OPTIMISTIC_LOCK_COLLISION"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
