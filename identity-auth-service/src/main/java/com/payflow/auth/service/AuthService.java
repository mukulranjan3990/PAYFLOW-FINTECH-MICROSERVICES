package com.payflow.auth.service;

import com.payflow.auth.model.Customer;
import com.payflow.auth.repository.CustomerRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    private final CustomerRepository customerRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final SecretKey signingKey;
    private final long expirationMs;

    public AuthService(
            CustomerRepository customerRepository,
            @Value("${payflow.jwt.secret:payflow-fintech-super-secure-production-256bit-secret-key-32bytes}") String jwtSecret,
            @Value("${payflow.jwt.expiration-ms:86400000}") long expirationMs) {
        this.customerRepository = customerRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    @PostConstruct
    @Transactional
    public void seedDefaultFintechAccounts() {
        if (!customerRepository.existsByUsername("alice")) {
            customerRepository.save(new Customer(
                    "alice",
                    "alice@payflow.bank",
                    passwordEncoder.encode("Password123!"),
                    "VERIFIED"
            ));
        }

        if (!customerRepository.existsByUsername("bob")) {
            customerRepository.save(new Customer(
                    "bob",
                    "bob@payflow.bank",
                    passwordEncoder.encode("Password123!"),
                    "VERIFIED"
            ));
        }
    }

    @Transactional
    public Customer register(String username, String email, String rawPassword) {
        if (customerRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists: " + username);
        }
        if (customerRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists: " + email);
        }

        String hashedPassword = passwordEncoder.encode(rawPassword);
        Customer customer = new Customer(username, email, hashedPassword, "VERIFIED");
        return customerRepository.save(customer);
    }

    public Map<String, Object> authenticate(String username, String rawPassword, String host) {
        Optional<Customer> customerOpt = customerRepository.findByUsername(username);
        if (customerOpt.isEmpty() || !passwordEncoder.matches(rawPassword, customerOpt.get().getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        Customer customer = customerOpt.get();
        String token = generateJwtToken(customer);

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("userId", customer.getId());
        response.put("username", customer.getUsername());
        response.put("email", customer.getEmail());
        response.put("kycStatus", customer.getKycStatus());
        response.put("servingHost", host != null ? host : "identity-auth-service-pod-01");
        return response;
    }

    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private String generateJwtToken(Customer customer) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(customer.getUsername())
                .claim("userId", customer.getId())
                .claim("email", customer.getEmail())
                .claim("kycStatus", customer.getKycStatus())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(signingKey)
                .compact();
    }
}
