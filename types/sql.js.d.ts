/**
 * Type declarations for sql.js
 *
 * sql.js is SQLite compiled to WebAssembly for use in the browser.
 */

declare module "sql.js" {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | null) => Database
  }

  export interface Database {
    run(sql: string, params?: BindParams): Database
    exec(sql: string, params?: BindParams): QueryExecResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
    getRowsModified(): number
    create_function(name: string, func: (...args: unknown[]) => unknown): Database
  }

  export interface Statement {
    bind(params?: BindParams): boolean
    step(): boolean
    getAsObject(params?: Record<string, unknown>): Record<string, SqlValue>
    get(params?: BindParams): SqlValue[]
    getColumnNames(): string[]
    run(params?: BindParams): void
    free(): boolean
    reset(): void
  }

  export interface QueryExecResult {
    columns: string[]
    values: SqlValue[][]
  }

  export type SqlValue = string | number | Uint8Array | null
  export type BindParams = SqlValue[] | Record<string, SqlValue> | null

  export interface SqlJsConfig {
    locateFile?: (filename: string) => string
    wasmBinary?: ArrayBuffer
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>
}

