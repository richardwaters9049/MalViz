type ApiFailurePayload = {
  error?: {
    message?: string;
    details?: {
      failures?: Array<{ error?: string }>;
    };
  };
  failures?: Array<{ error?: string }>;
};

export function apiFailureMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const failure = payload as ApiFailurePayload;
  return (
    failure.error?.message ??
    failure.error?.details?.failures?.[0]?.error ??
    failure.failures?.[0]?.error ??
    fallback
  );
}

export async function readJsonPayload(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}
