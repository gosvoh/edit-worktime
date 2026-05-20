type HttpHelpers = {
  withCors: (response: Response) => Response;
  json: (data: unknown, status?: number, extraHeaders?: HeadersInit) => Response;
  error: (status: number, message: string) => Response;
  readJsonBody: <T>(request: Request) => Promise<T | null>;
};

export function createHttpHelpers(corsOrigin: string): HttpHelpers {
  const withCors = (response: Response): Response => {
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", corsOrigin);
    headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (corsOrigin !== "*") {
      headers.set("Access-Control-Allow-Credentials", "true");
    }
    headers.set("Access-Control-Max-Age", "86400");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  };

  const json = (data: unknown, status = 200, extraHeaders?: HeadersInit): Response => {
    const headers = new Headers(extraHeaders);
    headers.set("Content-Type", "application/json; charset=utf-8");
    return withCors(
      new Response(JSON.stringify(data), {
        status,
        headers
      })
    );
  };

  const error = (status: number, message: string): Response => {
    return json({ error: message }, status);
  };

  const readJsonBody = async <T>(request: Request): Promise<T | null> => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return null;
    }

    try {
      return await request.json() as T;
    } catch {
      return null;
    }
  };

  return {
    withCors,
    json,
    error,
    readJsonBody
  };
}
