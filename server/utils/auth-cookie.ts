function formatCookieDate(date: Date) {
  return date.toUTCString();
}

function appendSecure(base: string, secure: boolean) {
  return secure ? `${base}; Secure` : base;
}

export function buildMpAuthCookies(authKey: string, secure: boolean, expiresAt = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)) {
  const expiredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return [
    appendSecure(`auth-key=${authKey}; Path=/; Expires=${formatCookieDate(expiresAt)}; HttpOnly`, secure),
    appendSecure(`uuid=EXPIRED; Path=/; Expires=${formatCookieDate(expiredAt)}; HttpOnly`, secure),
  ];
}
