import { backoff, joinUrl, okRes } from '../utils.js'
import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'

const NON_WALLET_IDS = [
  "mA6XRUaN6RFHgKbAbStUDMjk-b99dG5h867guIgl7t4",
  "v2I1YY4BhSpUESKrWAy-7T8LBQX0tizSib_nZyplt1o",
  "wF0hsrp-TOoWOmaOnCnA4i3ga3K6u2OyDzMP7dSixBQ",
  "uGrcAxdb6KloZsQH-7HQsP8bC2cK7USWaRdTmHt6K-4",
  "lYWMAev5Qzb-vRPuASh4AuJfcjKyLxvjWuYn5vvQef8",
  "Eb5Si_xx64vKXM29M5v1BzJgFn7rUEVrqjM2egXSsaM",
  "er9E2ydIb24wGW00ZcVwV6V9jyXVEjQr5rsIV40nwCE",
  "XytVw0c7nj_0IVBspHa08DgnEq4xBJHMDVT6NVFxOOs",
  "acnc4yEuP7e5W9WCa0m-P4bg7I-6lcPd1TKvudZgmZI",
  "YG7gVJpSGPlgsfpiImTxJnfBC2Qj8KHBb_fnjY284Rs",
  "1mxexsu3W2dQZgEyPQ59swt4QAQj9vi0Wfnj_bXgWIo"
]

function isWalletWith ({
  fetch,
  histogram,
  ARWEAVE_URL,
  logger,
  setById,
  getById
}) {
  const walletFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'isWallet'
    }),
    logger
  })

  /**
   * @name isWallet
   * Given an id, check if it is a process or a wallet.
   * First, check the cache. Then, check Arweave.
   *
   * @param id - The id to check if it is a process or a wallet
   * @param logId - The logId to aggregate the logs by
   * @returns isWallet - If the id is a wallet, return true. Otherwise, return false.
   */
  return async (id, logId) => {
    logger({ log: `Checking if id is a wallet ${id}`, logId })

    if (NON_WALLET_IDS.includes(id)) {
      logger({ log: `id: ${id} is not a wallet`, logId })
      return false
    }

    const cachedIsWallet = await getById(id)

    if (cachedIsWallet !== null && cachedIsWallet !== undefined) {
      logger({ log: `Found id: ${id} in cache with value: ${cachedIsWallet.isWallet}`, logId })
      return cachedIsWallet.isWallet
    }

    logger({ log: `id: ${id} not cached checking arweave for tx`, logId })

    /*
      Only if this is actually a tx will this
      return true. That means if it doesn't its
      either a wallet or something else.
    */
    return backoff(
      () =>
        walletFetch(joinUrl({ url: ARWEAVE_URL, path: `/${id}` }), { method: 'HEAD' })
          .then(okRes),
      {
        maxRetries: 6,
        delay: 500,
        log: logger,
        logId,
        name: `isWallet(${id})`
      }
    )
      .then((res) => {
        logger({log: `id: ${id} is a wallet: ${!res.ok}`});
        return setById(id, { isWallet: !res.ok }).then(() => {
          return !res.ok
        })
      })
      .catch((_err) => {
        logger({log: `id: ${id} is a wallet: true`});
        return setById(id, { isWallet: true }).then(() => {
          return true
        })
      })
  }
}

export default {
  isWalletWith
}
