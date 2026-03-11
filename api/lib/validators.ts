/**
 * Input Validation Schemas
 *
 * Zod schemas for validating all inputs to MCP tool calls.
 * Prevents SQL injection and validates data types.
 */

import { z } from 'zod';

/**
 * Player name validation
 * - 1-50 characters
 * - Only allows alphanumeric, Chinese characters, spaces, hyphens
 * - Prevents SQL injection and XSS
 */
export const playerNameSchema = z
  .string()
  .min(1, 'Player name is required')
  .max(50, 'Player name too long (max 50 characters)')
  .regex(
    /^[a-zA-Z0-9\u4e00-\u9fa5\s\-]+$/,
    'Player name contains invalid characters. Only letters, numbers, Chinese characters, spaces, and hyphens are allowed.'
  )
  .transform((val) => val.trim());

/**
 * Date validation (YYYY-MM-DD format)
 */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(
    (date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime()) && date === parsed.toISOString().split('T')[0];
    },
    'Invalid date'
  );

/**
 * Player Query Schema
 *
 * Used for querying player information
 */
export const PlayerQuerySchema = z.object({
  player_name: playerNameSchema,
  season: z.string().optional(),
});

/**
 * Match Query Schema
 *
 * Used for querying match history
 */
export const MatchQuerySchema = z.object({
  player_name: playerNameSchema.optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional().refine(
    (val, ctx) => {
      if (ctx.parent.date_from && val) {
        return new Date(val) >= new Date(ctx.parent.date_from as string);
      }
      return true;
    },
    'date_to must be after date_from'
  ),
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10),
});

/**
 * List Players Schema
 *
 * Used for listing all players
 */
export const ListPlayersSchema = z.object({
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(100),
});

/**
 * Compare Players Schema
 *
 * Used for comparing multiple players
 */
export const ComparePlayersSchema = z.object({
  player_names: z
    .array(playerNameSchema)
    .min(2, 'At least 2 players are required for comparison')
    .max(5, 'Cannot compare more than 5 players at once'),
  criteria: z
    .array(z.enum(['all', 'skills', 'stats', 'position']))
    .default(['all']),
});

/**
 * Match Analysis Schema
 *
 * Used for analyzing match performance
 */
export const MatchAnalysisSchema = z.object({
  match_id: z
    .string()
    .uuid('Match ID must be a valid UUID')
    .optional(),
  match_date: dateSchema.optional(),
  player_name: playerNameSchema.optional(),
  analysis_type: z
    .enum(['overall', 'player_specific', 'team_comparison'])
    .default('overall'),
}).refine(
  (data) => data.match_id || data.match_date || data.player_name,
  'At least one of match_id, match_date, or player_name must be provided'
);

/**
 * Grouping Schema
 *
 * Used for calculating player groups
 */
export const GroupingSchema = z.object({
  players: z
    .array(playerNameSchema)
    .min(2, 'At least 2 players are required for grouping')
    .max(20, 'Cannot group more than 20 players at once'),
  criteria: z.enum(['skill', 'position', 'random']).default('random'),
});

/**
 * Generic input validation function
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated data
 * @throws {z.ZodError} If validation fails
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe input validation function
 *
 * Same as validateInput but returns a result object instead of throwing
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Result object with success status and either validated data or errors
 */
export function safeValidateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Format Zod error messages for user display
 *
 * @param error - Zod error object
 * @returns Formatted error message string
 */
export function formatZodError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
  return issues.join('; ');
}
