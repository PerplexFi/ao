import { createSession } from 'better-sse';
import { always, compose } from 'ramda'
import { z } from 'zod';

import { withMetrics, withMiddleware, withProcessRestrictionFromPath } from './middleware/index.js'

const inputSchema = z.object({
  processId: z.string().min(1, 'a process id is required'),
})

export const withSubscribeRoutes = (app) => {
  app.get(
    '/subscribe/:processId',
    compose(
      withMiddleware,
      withMetrics({ tracesFrom: (req) => ({ process_id: req.params.processId }) }),
      withProcessRestrictionFromPath,
      always(async (req, res) => {
        const { 
          params: { processId },
          domain: { apis: { subscribe } }
        } = req;

        inputSchema.parse({ processId });

        // Take over the response to let better-sse handle it
        res.hijack();
        // Create the SSE session
        const sseSession = await createSession(req.raw, res.raw);

        await subscribe({ processId, sseSession }).toPromise();
      })
    )()
  )

  return app
}
