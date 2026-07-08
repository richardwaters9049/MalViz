import { NextResponse } from "next/server";
import { isServiceError } from "@/lib/services/errors";

export function apiData<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function apiError(error: unknown) {
  if (isServiceError(error)) {
    // Service errors are expected failures, so keep their messages readable for clients.
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  console.error("Unexpected API error", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
    { status: 500 },
  );
}
