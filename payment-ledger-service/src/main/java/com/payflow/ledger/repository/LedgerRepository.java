package com.payflow.ledger.repository;

import com.payflow.ledger.model.LedgerTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LedgerRepository extends JpaRepository<LedgerTransaction, Long> {
    Optional<LedgerTransaction> findByIdempotencyKey(String idempotencyKey);
    Optional<LedgerTransaction> findByTransactionRef(String transactionRef);

    @Query("SELECT t FROM LedgerTransaction t WHERE t.senderUsername = :username OR t.receiverUsername = :username ORDER BY t.createdAt DESC")
    List<LedgerTransaction> findTransactionHistoryForUser(String username);

    List<LedgerTransaction> findAllByOrderByCreatedAtDesc();
}
