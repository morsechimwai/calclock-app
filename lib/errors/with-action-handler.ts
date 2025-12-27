import { handleError } from "./handle-error"
import { AppError } from "./app-error"

/**
 * Action Result Types
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }

/**
 * Action Wrapper - Wraps Server Actions with error handling
 *
 * - Never throws to client
 * - Returns { ok: true, data } on success
 * - Returns { ok: false, error: { code, message } } on failure
 * - Sanitizes stack traces (security)
 *
 * Usage:
 * async function createEmployee(input: unknown) {
 *   // validation, business logic
 *   return employee
 * }
 * export const createEmployeeAction = withActionHandler(createEmployee)
 */
export function withActionHandler<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn | Promise<TReturn>
): (...args: TArgs) => Promise<ActionResult<TReturn>> {
  return async (...args: TArgs): Promise<ActionResult<TReturn>> => {
    try {
      const data = await fn(...args)
      return { ok: true, data }
    } catch (error) {
      const appError = handleError(error)

      // Log in development
      if (process.env.NODE_ENV === "development") {
        console.error("[withActionHandler] Error:", appError.code, appError.message)
      }

      // Return sanitized error (no stack trace to client)
      return {
        ok: false,
        error: {
          code: appError.code,
          message: appError.message,
        },
      }
    }
  }
}

/**
 * Helper to check if action result is ok
 */
export function isActionOk<T>(result: ActionResult<T>): result is { ok: true; data: T } {
  return result.ok === true
}

/**
 * Helper to unwrap action result or throw
 */
export function unwrapActionResult<T>(result: ActionResult<T>): T {
  if (result.ok) {
    return result.data
  }
  throw new AppError(result.error.code, result.error.message)
}

