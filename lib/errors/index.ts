/**
 * Error Handling Layer
 *
 * Flow:
 * Client/API Layer → withActionHandler() → Service Layer (withErrorHandling) → AppError
 */

// Error Classes
export {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  InternalError,
} from "./app-error"

// Error Handler
export { handleError } from "./handle-error"

// Wrappers
export { withErrorHandling } from "./with-error-handling"
export { withActionHandler, isActionOk, unwrapActionResult } from "./with-action-handler"

// Types
export type { ActionResult } from "./with-action-handler"

