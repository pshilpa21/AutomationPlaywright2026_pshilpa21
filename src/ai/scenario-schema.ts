import { z } from 'zod';

export const uiScenarioSchema = z.object({
  title: z.string().min(5).max(100),
  goal: z.string().min(10).max(400),
  assumptions: z.array(z.string().max(200)).max(8),
  steps: z.array(
    z.object({
      action: z.enum(['navigate', 'click', 'fill', 'expectVisible', 'expectText']),
      target: z.string().min(1).max(160),
      value: z.string().max(300).optional(),
    }),
  ).min(1).max(15),
  tags: z.array(z.string().regex(/^[a-z0-9-]{1,30}$/i)).max(8),
});

export type UiScenarioDraft = z.infer<typeof uiScenarioSchema>;
