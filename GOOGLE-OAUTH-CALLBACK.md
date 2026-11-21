# H2O Google OAuth callback (RC9.1)

The Web callback route is reserved and reachable at:

```text
http://localhost:4317/auth/google/callback
```

For Google Cloud Console > Google Auth Platform > Clients > H2O Web, add the exact value above under **Authorized redirect URIs**. Do not add it under JavaScript origins.

Important: this release adds the stable callback route but does **not** complete Google OAuth. The route deliberately returns HTTP 501 until the authorization start endpoint, anti-CSRF `state`, PKCE, server-side code exchange, ID-token validation, and local session creation are implemented. Do not publish the OAuth app or rely on this route as proof of authentication yet.

The CLI Desktop OAuth client is separate and does not use this Web redirect URI.
