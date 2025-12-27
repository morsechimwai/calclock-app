import { AppError, InternalError } from "./app-error"

/**
 * Normalize any error to AppError
 *
 * - If already AppError, return as-is
 * - If standard Error, convert to InternalError and log
 * - If unknown, wrap in InternalError
 */
export function handleError(error: unknown): AppError {
  // Already an AppError - return as-is
  if (error instanceof AppError) {
    return error
  }

  // Standard Error - convert to InternalError and log
  if (error instanceof Error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[handleError] Standard Error:", error.message, error.stack)
    }
    return new InternalError(error.message)
  }

  // Unknown error type
  if (process.env.NODE_ENV === "development") {
    console.error("[handleError] Unknown Error:", error)
  }
  return new InternalError("เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ")
}

