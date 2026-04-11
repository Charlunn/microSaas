export type SDKErrorCode =
  | "MANIFEST_INVALID"
  | "SLUG_CONFLICT"
  | "MANIFEST_NOT_FOUND"
  | "APP_DISABLED";

export class SDKError extends Error {
  constructor(
    public readonly code: SDKErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SDKError";
  }
}
