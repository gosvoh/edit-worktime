type SessionHelpers = {
  getSessionToken: (request: Request) => string | null;
  buildSessionCookie: (token: string, maxAgeSeconds: number) => string;
  buildClearSessionCookie: () => string;
};

function parseCookies(request: Request): Record<string, string> {
  const rawCookie = request.headers.get("cookie");
  if (!rawCookie) {
    return {};
  }

  return rawCookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex < 1) {
        return acc;
      }
      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      if (!key) {
        return acc;
      }
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
      return acc;
    }, {});
}

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export function createSessionHelpers(cookieName: string, cookieSecure: boolean): SessionHelpers {
  const getSessionToken = (request: Request): string | null => {
    const cookies = parseCookies(request);
    const cookieToken = cookies[cookieName];
    if (cookieToken && cookieToken.length > 0) {
      return cookieToken;
    }
    return extractBearerToken(request);
  };

  const buildSessionCookie = (token: string, maxAgeSeconds: number): string => {
    const parts = [
      `${cookieName}=${encodeURIComponent(token)}`,
      `Max-Age=${maxAgeSeconds}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax"
    ];
    if (cookieSecure) {
      parts.push("Secure");
    }
    return parts.join("; ");
  };

  const buildClearSessionCookie = (): string => {
    const parts = [
      `${cookieName}=`,
      "Max-Age=0",
      "Path=/",
      "HttpOnly",
      "SameSite=Lax"
    ];
    if (cookieSecure) {
      parts.push("Secure");
    }
    return parts.join("; ");
  };

  return {
    getSessionToken,
    buildSessionCookie,
    buildClearSessionCookie
  };
}
