import { fromPromise } from 'hyper-async';
import { Session } from 'better-sse';

import { addEvaluationSubscriberSchema } from '../dal.js';

/**
 * @typedef Env
 *
 * @typedef SubscribeArgs
 * @property {string} processId
 * @property {Session} sseSession
 *
 * @callback Subscribe
 * @param {SubscribeArgs} args
 * @returns {Task<void>} result
 *
 * @param {Env} env - the environment
 * @returns {Subscribe}
 */
export function subscribeWith(env) {
  const logger = env.logger
  const addEvaluationSubscriber = fromPromise(addEvaluationSubscriberSchema.implement(env.addEvaluationSubscriber))

  return ({ processId, sseSession }) => {
    logger.debug('subscribing to evaluations of process id: %s', processId)

    return addEvaluationSubscriber({ processId, sseSession });
  };
}
