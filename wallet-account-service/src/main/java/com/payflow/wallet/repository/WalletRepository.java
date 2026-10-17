package com.payflow.wallet.repository;

import com.payflow.wallet.model.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, Long> {
    List<Wallet> findByUsername(String username);
    Optional<Wallet> findByUsernameAndCurrency(String username, String currency);
    Optional<Wallet> findByAccountNumber(String accountNumber);
    boolean existsByUsernameAndCurrency(String username, String currency);
}
