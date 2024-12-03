import { Channel, createChannel, Session } from "better-sse";

// NOTE: better-sse handles removing sessions from the channel when they are closed

/**
 * Map of processId -> sse Channel
 * 
 * @type {Map<string, Channel>}
 */
const subscriberChannels = new Map();

/**
 *
 * @typedef AddEvaluationSubscriberArgs
 * @property {string} processId
 * @property {Session} sseSession
 *
 * @callback AddEvaluationSubscriber
 * @param {AddEvaluationSubscriberArgs} args
 * @returns {void} result
 *
 * @returns {AddEvaluationSubscriber}
 */
export function withAddEvaluationSubscriber () {
  return ({processId, sseSession}) => {
    if (!subscriberChannels.has(processId)) {
      const newChannel = createChannel();
      subscriberChannels.set(processId, newChannel);
    }
    subscriberChannels.get(processId).register(sseSession);
  };
}

/**
 *
 * @typedef BroadcastEvaluationArgs
 * @property {string} processId
 * @property {object} messages
 *
 * @callback BroadcastEvaluation
 * @param {BroadcastEvaluationArgs} args
 * @returns {void} result
 *
 * @returns {BroadcastEvaluation}
 */
export function withBroadcastEvaluation () {
  return async ({processId, messages}) => {
    const processSubscribers = subscriberChannels.get(processId);
    if (processSubscribers && messages.length > 0) {
      // Sends messages to all sessions in the channel
      processSubscribers.broadcast({ processId, messages });
    }
  };
}
