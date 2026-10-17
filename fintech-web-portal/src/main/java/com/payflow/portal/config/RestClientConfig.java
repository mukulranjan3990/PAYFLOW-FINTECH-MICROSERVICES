package com.payflow.portal.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Value("${services.auth.url:http://localhost:8081}")
    private String authUrl;

    @Value("${services.wallet.url:http://localhost:8082}")
    private String walletUrl;

    @Value("${services.payment.url:http://localhost:8083}")
    private String paymentUrl;

    @Bean
    public RestClient authRestClient() {
        return RestClient.builder().baseUrl(authUrl).build();
    }

    @Bean
    public RestClient walletRestClient() {
        return RestClient.builder().baseUrl(walletUrl).build();
    }

    @Bean
    public RestClient paymentRestClient() {
        return RestClient.builder().baseUrl(paymentUrl).build();
    }
}
