import { handleError } from "./handle-error"

/**
 * Service Wrapper - Wraps service functions with error handling
 *
 * Usage:
 * export const findById = withErrorHandling(async (id: number) => {
 *   const row = db.prepare(...).get(id)
 *   if (!row) throw new NotFoundError("Employee")
 *   return row
 * })
 */
export function withErrorHandling<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn | Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args)
    } catch (error) {
      // Normalize error to AppError and re-throw
      throw handleError(error)
    }
  }
}

