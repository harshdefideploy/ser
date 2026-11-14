const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }

    // Session expired / missing — force login for admin API calls.
    if (
      typeof window !== "undefined" &&
      res.status === 401 &&
      !path.startsWith("/auth/login") &&
      !path.startsWith("/auth/me") &&
      !window.location.pathname.startsWith("/login")
    ) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.replace(`/login?next=${next}`);
    }

    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

export { API_URL };
