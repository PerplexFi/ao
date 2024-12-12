import { always } from 'ramda'
import { swallow } from '../utils.js'

let timer_id = 0;

/**
 * withTimerMetrics timer only needs to implement a function called 'startTimer' that returns a function to be invoked to stop the timer.
 * some implementations such as prometheus's histogram have additional constraints such as the labels returned from 'startLabelsFrom' and 'stopLabelsFrom'
 * need to be referenced as labels passed to the histogram itself. Any additional checks in this way are up to the implementation and are details of the specific implementation.
 */
export function withTimerMetrics ({ timer, startLabelsFrom = always({}), stopLabelsFrom = always({}), tracesFrom = always({}), logger = console.warn.bind(console) } = {}) {
  if (!timer || !timer.startTimer || typeof timer.startTimer !== 'function') {
    throw new Error('Timer must implement a startTimer function')
  }
  return (func) => (...funcArgs) => {
    const startLabels = startLabelsFrom(...funcArgs)
    const traces = tracesFrom(...funcArgs)
    const stop = timer.startTimer(startLabels, traces)

    const safeStop = swallow((...args) => {
      try {
        return stop(...args)
      } catch (e) {
        logger({ log: ['METRICS ERROR: Error encountered when stopping timer, skipping metric observance.', e] })
        throw e
      }
    })

    const timerId = timer_id;
    timer_id += 1;

    return Promise.resolve()
      .then(() => {
        logger({ log: [`METRICS #${timerId}: Starting timer`, startLabels] })
      })
      .then(() => func(...funcArgs))
      .then((funcReturn) => {
        logger({ log: [`METRICS #${timerId}: Stopping timer`, startLabels, stopLabelsFrom(funcReturn)] })
        safeStop(stopLabelsFrom(funcReturn), traces)

        return funcReturn
      })
      .catch((funcReturn) => {
        logger({ log: [`METRICS #${timerId}: Stopping timer`, startLabels, stopLabelsFrom(funcReturn)] })
        safeStop(stopLabelsFrom(funcReturn), traces)

        throw funcReturn
      })
  }
}
