package com.payflow.ledger.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
@EnableKafka
public class KafkaConsumerProducerConfig {

    public static final String PAYMENT_EVENTS_TOPIC = "payment-events";
    public static final String LEDGER_EVENTS_TOPIC = "ledger-events";

    @Bean
    public NewTopic paymentEventsTopic() {
        return TopicBuilder.name(PAYMENT_EVENTS_TOPIC)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic ledgerEventsTopic() {
        return TopicBuilder.name(LEDGER_EVENTS_TOPIC)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
