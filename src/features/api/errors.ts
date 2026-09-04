/**
 * Uniform machine-readable error body for API endpoints: a human-readable `error` message, a stable
 * `code` slug for programmatic handling, and an optional `hint` telling the caller how to resolve
 * it. Documented in the OpenAPI description (`~/features/api/openapi`).
 */
export type ApiErrorBody = {
  error: string;
  code: string;
  hint?: string;
};

export function apiErrorResponse(status: number, body: ApiErrorBody): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
