export function parseEmployeeId(pathname: string): number | null {
  const matched = pathname.match(/^\/api\/employees\/(\d+)$/);
  if (!matched) {
    return null;
  }
  return Number(matched[1]);
}

export function parseUserId(pathname: string): number | null {
  const matched = pathname.match(/^\/api\/users\/(\d+)$/);
  if (!matched) {
    return null;
  }
  return Number(matched[1]);
}
