/**
 * Custom Error class for controlled domain errors
 *
 * Usage:
 * throw new AppError("USER_NOT_FOUND", "ไม่พบผู้ใช้งาน", 404)
 * throw new AppError("VALIDATION_ERROR", "ข้อมูลไม่ถูกต้อง", 400, { field: "email" })
 */
export class AppError extends Error {
  readonly code: string
  readonly status: number
  readonly meta?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    status: number = 400,
    meta?: Record<string, unknown>
  ) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.status = status
    this.meta = meta

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

/**
 * Validation Error - 400
 */
export class ValidationError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, 400, meta)
    this.name = "ValidationError"
  }
}

/**
 * Not Found Error - 404
 */
export class NotFoundError extends AppError {
  constructor(entity: string, meta?: Record<string, unknown>) {
    super("NOT_FOUND", `ไม่พบ${entity}`, 404, meta)
    this.name = "NotFoundError"
  }
}

/**
 * Conflict Error - 409 (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super("CONFLICT", message, 409, meta)
    this.name = "ConflictError"
  }
}

/**
 * Forbidden Error - 403
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "ไม่มีสิทธิ์ในการดำเนินการ", meta?: Record<string, unknown>) {
    super("FORBIDDEN", message, 403, meta)
    this.name = "ForbiddenError"
  }
}

/**
 * Internal Error - 500
 */
export class InternalError extends AppError {
  constructor(message: string = "เกิดข้อผิดพลาดภายในระบบ", meta?: Record<string, unknown>) {
    super("INTERNAL_ERROR", message, 500, meta)
    this.name = "InternalError"
  }
}

