import { z } from 'zod';

const schema = z.object({
  READ_DB_HOST: z.string().min(1),
  READ_DB_PORT: z.coerce.number().default(5432),
  READ_DB_NAME: z.string().min(1),
  READ_DB_USER: z.string().min(1),
  READ_DB_PASSWORD: z.string().min(1),

  DATABASE_URL: z.string().min(1),

  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('Gift Insight <gift@smartkarma.com>'),
  SALES_EMAIL: z.string().email().default('rk@smartkarma.com'),
  ADMIN_EMAILS: z.string().default('rk@smartkarma.com,sv@smartkarma.com'),

  SESSION_SECRET: z.string().min(16),

  GIFT_MAX_LINKS_PER_GIFTER_PER_MONTH: z.coerce.number().default(10),
  GIFT_MAX_VIEWS_PER_LINK: z.coerce.number().default(25),
  GIFT_LINK_EXPIRY_DAYS: z.coerce.number().default(30),
  RECIPIENT_THANKS_MODAL_THRESHOLD: z.coerce.number().default(3),
  RECIPIENT_COOKIE_DAYS: z.coerce.number().default(180),
  INSIGHT_SEARCH_MAX_AGE_YEARS: z.coerce.number().default(2),
  REFORWARD_QUOTA_PER_VIEW: z.coerce.number().default(2),
  REFORWARD_EXPIRY_DAYS: z.coerce.number().default(7),
  REFORWARD_MAX_VIEWS_PER_LINK: z.coerce.number().default(1),

  APP_BASE_URL: z.string().url().default('http://localhost:3000'),
  SMARTKARMA_BASE_URL: z.string().url().default('https://www.smartkarma.com'),
  SMARTKARMA_TRENDING_URL: z.string().url().default('https://www.smartkarma.com/api/v2/trending-insights'),
  SMARTKARMA_TRIAL_SIGNUP_URL: z.string().url().default('https://www.smartkarma.com/sign_up?source=gift_insight'),
});

let cached: z.infer<typeof schema> | null = null;
export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  cached = parsed.data;
  return cached;
}
