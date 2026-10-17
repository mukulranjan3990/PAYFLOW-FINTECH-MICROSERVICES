package com.payflow.ledger.controller;

import com.payflow.ledger.model.LedgerTransaction;
import com.payflow.ledger.service.PaymentOrchestratorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final PaymentOrchestratorService paymentOrchestratorService;

    public PaymentController(PaymentOrchestratorService paymentOrchestratorService) {
        this.paymentOrchestratorService = paymentOrchestratorService;
    }

    @PostMapping("/transfer")
    public ResponseEntity<?> transfer(
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKeyHeader,
            @RequestBody Map<String, Object> request) {

        try {
            String idempotencyKey = idempotencyKeyHeader != null && !idempotencyKeyHeader.isBlank()
                    ? idempotencyKeyHeader
                    : (String) request.getOrDefault("idempotencyKey", UUID.randomUUID().toString());

            String sender = (String) request.get("senderUsername");
            String receiver = (String) request.get("receiverUsername");
            String currency = (String) request.getOrDefault("currency", "INR");
            BigDecimal amount = new BigDecimal(request.get("amount").toString());

            LedgerTransaction transaction = paymentOrchestratorService.processTransfer(
                    idempotencyKey,
                    sender,
                    receiver,
                    amount,
                    currency
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(transaction);

        } catch (IllegalArgumentException iae) {
            return ResponseEntity.badRequest().body(Map.of("error", iae.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/history/{username}")
    public ResponseEntity<List<LedgerTransaction>> getHistory(@PathVariable String username) {
        return ResponseEntity.ok(paymentOrchestratorService.getTransactionHistory(username));
    }

    @GetMapping("/history")
    public ResponseEntity<List<LedgerTransaction>> getAllHistory() {
        return ResponseEntity.ok(paymentOrchestratorService.getAllTransactions());
    }

    @GetMapping("/telemetry")
    public ResponseEntity<Map<String, Object>> getTelemetry() {
        return ResponseEntity.ok(paymentOrchestratorService.getTelemetry());
    }
}
