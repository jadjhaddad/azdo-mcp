import { z } from 'zod';

const EnvSchema = z.object({
  AZDO_ORG_URL: z
    .string()
    .url('AZDO_ORG_URL must be a valid URL, e.g. https://dev.azure.com/my-org')
    .transform((u) => u.replace(/\/$/, '')), // strip trailing slash
  AZDO_TOKEN: z.string().min(1, 'AZDO_TOKEN is required'),
  AZDO_ALLOWED_PROJECTS: z
    .string()
    .optional()
    .transform((v) =>
      v ? v.split(',').map((p) => p.trim()).filter(Boolean) : [],
    ),
  AZDO_DEFAULT_PROJECT: z.string().optional(),
  ENABLE_DELETE: z
    .string()
    .optional()
    .transform((v) => v?.toLowerCase() === 'true'),
  MAX_PAGE_SIZE: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 200)),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error'])
    .optional()
    .default('info'),
  SERVER_NAME: z.string().optional().default('azdo-mcp'),
  SERVER_VERSION: z.string().optional().default('0.1.0'),
});

export type Env = z.infer<typeof EnvSchema>;

let _env: Env | undefined;

export function getEnv(): Env {
  if (_env) return _env;

  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuration error:\n${issues}`);
  }
  _env = result.data;
  return _env;
}

/** Reset cached env — test use only */
export function _resetEnv(): void {
  _env = undefined;
}
