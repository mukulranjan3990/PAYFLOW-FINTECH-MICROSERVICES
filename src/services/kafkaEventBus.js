/**
 * @fileoverview Apache Kafka Event Bus Engine for PayFlow FinTech platform.
 * Models topics, partitions, consumer groups, and offset sequence logs
 * for real-time event-driven synchronization between services.
 * Fully typed with JSDoc annotations.
 */

/**
 * @typedef {'payment-events' | 'wallet-events' | 'ledger-events'} KafkaTopic
 */

/**
 * @typedef {Object} KafkaRecord
 * @property {string} id - Unique message identifier.
 * @property {KafkaTopic} topic - Target Kafka topic.
 * @property {string} key - Partition routing key (e.g. username or txn reference).
 * @property {number} partition - Assigned partition index (0, 1, or 2).
 * @property {number} offset - Monotonically increasing offset within partition.
 * @property {string} timestamp - Message publishing timestamp (ISO).
 * @property {Object} payload - Serialized JSON event body.
 * @property {string} producerService - Emitting microservice name.
 */

/**
 * @callback KafkaEventListener
 * @param {KafkaRecord} record
 * @returns {void}
 */

class KafkaEventBusEngine {
  constructor() {
    /** @type {KafkaRecord[]} */
    this.eventLog = [];

    /** @type {Object.<string, number>} Partition offset tracking */
    this.partitionOffsets = {
      'payment-events:0': 0,
      'payment-events:1': 0,
      'payment-events:2': 0,
      'wallet-events:0': 0,
      'wallet-events:1': 0,
      'wallet-events:2': 0,
      'ledger-events:0': 0,
      'ledger-events:1': 0,
      'ledger-events:2': 0,
    };

    /** @type {Set<KafkaEventListener>} */
    this.listeners = new Set();

    /** @type {boolean} */
    this.isPaused = false;
  }

  /**
   * Hashes a message key to deterministically select a partition index (0..2).
   *
   * @param {string} key - Routing key.
   * @returns {number} Partition index.
   */
  getPartition(key) {
    if (!key) return 0;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 3;
  }

  /**
   * Publishes an event record to a Kafka topic.
   *
   * @param {KafkaTopic} topic - Target topic.
   * @param {string} key - Partition routing key.
   * @param {Object} payload - Event data payload.
   * @param {string} producerService - Emitting service.
   * @returns {KafkaRecord} Produced Kafka record.
   */
  publish(topic, key, payload, producerService = 'payment-ledger-service') {
    const partition = this.getPartition(key);
    const partitionKey = `${topic}:${partition}`;
    const offset = this.partitionOffsets[partitionKey] || 0;
    this.partitionOffsets[partitionKey] = offset + 1;

    /** @type {KafkaRecord} */
    const record = {
      id: `kmsg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      topic,
      key,
      partition,
      offset,
      timestamp: new Date().toISOString(),
      payload,
      producerService,
    };

    if (!this.isPaused) {
      this.eventLog.unshift(record);
      // Retain latest 200 events for smooth UI rendering
      if (this.eventLog.length > 200) {
        this.eventLog.pop();
      }

      this.listeners.forEach((listener) => {
        try {
          listener(record);
        } catch (err) {
          console.error('Kafka listener error:', err);
        }
      });
    }

    return record;
  }

  /**
   * Subscribes a listener callback to real-time Kafka events.
   *
   * @param {KafkaEventListener} listener - Event consumer callback.
   * @returns {function(): void} Unsubscribe cleanup function.
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Returns current event logs with optional topic filtering.
   *
   * @param {KafkaTopic} [topicFilter] - Optional topic filter.
   * @returns {KafkaRecord[]} Filtered event array.
   */
  getEvents(topicFilter) {
    if (!topicFilter || topicFilter === 'ALL') {
      return [...this.eventLog];
    }
    return this.eventLog.filter((e) => e.topic === topicFilter);
  }

  /**
   * Toggles pause/resume state for event intake.
   *
   * @param {boolean} paused - Whether event streaming should be paused.
   */
  setPaused(paused) {
    this.isPaused = paused;
  }

  /**
   * Clears the event log buffer.
   */
  clear() {
    this.eventLog = [];
  }
}

export const kafkaBus = new KafkaEventBusEngine();
