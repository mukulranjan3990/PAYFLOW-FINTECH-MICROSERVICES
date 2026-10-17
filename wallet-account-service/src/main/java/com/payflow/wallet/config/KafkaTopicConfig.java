package com.payflow.wallet.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    public static final String WALLET_EVENTS_TOPIC = "wallet-events";

    @Bean
    public NewTopic walletEventsTopic() {
        return TopicBuilder.name(WALLET_EVENTS_TOPIC)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
