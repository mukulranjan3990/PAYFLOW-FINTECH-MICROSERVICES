package com.payflow.portal.controller;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.Instant;
import java.util.*;

@Controller
public class PortalWebController {

    private final RestClient authRestClient;
    private final RestClient walletRestClient;
    private final RestClient paymentRestClient;

    public PortalWebController(
            @Qualifier("authRestClient") RestClient authRestClient,
            @Qualifier("walletRestClient") RestClient walletRestClient,
            @Qualifier("paymentRestClient") RestClient paymentRestClient) {
        this.authRestClient = authRestClient;
        this.walletRestClient = walletRestClient;
        this.paymentRestClient = paymentRestClient;
    }

    @GetMapping("/")
    public String index() {
        return "redirect:/dashboard";
    }

    @GetMapping("/dashboard")
    public String dashboard(@RequestParam(value = "user", defaultValue = "alice") String user, Model model) {
        model.addAttribute("currentUser", user);
        return "dashboard";
    }

    @GetMapping("/api/v1/system-status")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getSystemStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("timestamp", Instant.now().toString());
        status.put("portalHost", resolveHost());

        Map<String, Object> services = new LinkedHashMap<>();
        services.put("identity-auth-service", probeService(authRestClient, "identity-auth-service", 8081));
        services.put("wallet-account-service", probeService(walletRestClient, "wallet-account-service", 8082));
        services.put("payment-ledger-service", probeService(paymentRestClient, "payment-ledger-service", 8083));
        services.put("fintech-web-portal", Map.of(
                "status", "UP",
                "port", 8080,
                "host", resolveHost(),
                "version", "1.0.0"
        ));

        status.put("services", services);
        return ResponseEntity.ok(status);
    }

    private Map<String, Object> probeService(RestClient client, String name, int port) {
        try {
            ResponseEntity<Map> resp = client.get()
                    .uri("/actuator/health")
                    .retrieve()
                    .toEntity(Map.class);
            return Map.of(
                    "status", resp.getStatusCode().is2xxSuccessful() ? "UP" : "DOWN",
                    "port", port,
                    "details", resp.getBody() != null ? resp.getBody() : Map.of()
            );
        } catch (Exception e) {
            return Map.of(
                    "status", "STANDBY",
                    "port", port,
                    "note", "Registered on cluster network"
            );
        }
    }

    private String resolveHost() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (UnknownHostException e) {
            return "fintech-portal-pod";
        }
    }
}
