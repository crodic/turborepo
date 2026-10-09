# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 05-zero-trust-refresh.spec.ts >> Auth - Zero-Trust BFF Token Refresh Scenarios >> proactive refresh: middleware refreshes expiring access token seamlessly
- Location: e2e/05-zero-trust-refresh.spec.ts:30:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0LnVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiVVNFUiIsInNlc3Npb25JZCI6MTAsImlhdCI6MTc5MTUxODE0OSwiZXhwIjoxNzkxNTIxNzQ5fQ.mock_signature"
Received: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ0ZXN0LnVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoiVVNFUiIsInNlc3Npb25JZCI6MTAsImlhdCI6MTc5MTUxODE0OSwiZXhwIjoxNzkxNTE4MTU5fQ.mock_signature"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - region "Notifications alt+T"
    - generic [ref=e2]:
        - banner [ref=e3]:
            - navigation [ref=e4]:
                - generic [ref=e5]:
                    - link "Visel Art" [ref=e6] [cursor=pointer]:
                        - /url: /
                    - navigation "Main" [ref=e8]:
                        - list [ref=e10]:
                            - listitem [ref=e11]:
                                - button "Features" [ref=e12]
                            - listitem [ref=e15]:
                                - button "Platform" [ref=e16]
                            - listitem [ref=e19]:
                                - link "Tech Stack" [ref=e20] [cursor=pointer]:
                                    - /url: /#tech-stack
                            - listitem [ref=e21]:
                                - link "Profile" [ref=e22] [cursor=pointer]:
                                    - /url: /profile
                - generic [ref=e23]:
                    - combobox [ref=e24]
                    - combobox [aria-hidden] [ref=e25]
        - main [ref=e29]
        - contentinfo [ref=e42]:
            - generic [ref=e43]:
                - generic [ref=e44]:
                    - generic [ref=e45]:
                        - link "Visel Art" [ref=e46] [cursor=pointer]:
                            - /url: /
                        - paragraph [ref=e48]: Enterprise-ready full-stack monorepo boilerplate crafted with clean architecture, strict type safety, and modern developer experience.
                        - generic [ref=e49]:
                            - link "GitHub" [ref=e50] [cursor=pointer]:
                                - /url: https://github.com
                            - link "Twitter" [ref=e51] [cursor=pointer]:
                                - /url: https://twitter.com
                            - link "Turborepo" [ref=e52] [cursor=pointer]:
                                - /url: https://turborepo.org
                    - generic [ref=e53]:
                        - heading "Product" [level=3] [ref=e54]
                        - list [ref=e55]:
                            - listitem [ref=e56]:
                                - link "Features" [ref=e57] [cursor=pointer]:
                                    - /url: /#features
                            - listitem [ref=e58]:
                                - link "Tech Stack" [ref=e59] [cursor=pointer]:
                                    - /url: /#tech-stack
                            - listitem [ref=e60]:
                                - link "User Profile" [ref=e61] [cursor=pointer]:
                                    - /url: /profile
                            - listitem [ref=e62]:
                                - link "Authentication" [ref=e63] [cursor=pointer]:
                                    - /url: /auth/login
                    - generic [ref=e64]:
                        - heading "Resources" [level=3] [ref=e65]
                        - list [ref=e66]:
                            - listitem [ref=e67]:
                                - link "Documentation" [ref=e68] [cursor=pointer]:
                                    - /url: https://turbo.build/repo/docs
                            - listitem [ref=e69]:
                                - link "GitHub" [ref=e70] [cursor=pointer]:
                                    - /url: https://github.com
                            - listitem [ref=e71]:
                                - link "Swagger API" [ref=e72] [cursor=pointer]:
                                    - /url: http://localhost:8001/api/docs
                            - listitem [ref=e73]:
                                - link "Next.js 15" [ref=e74] [cursor=pointer]:
                                    - /url: https://nextjs.org/docs
                    - generic [ref=e75]:
                        - heading "Legal" [level=3] [ref=e76]
                        - list [ref=e77]:
                            - listitem [ref=e78]:
                                - link "Privacy Policy" [ref=e79] [cursor=pointer]:
                                    - /url: /pages/privacy-policy
                            - listitem [ref=e80]:
                                - link "Terms of Service" [ref=e81] [cursor=pointer]:
                                    - /url: /pages/terms-of-service
                - generic [ref=e83]:
                    - paragraph [ref=e84]: © 2026 Visel Art. All rights reserved.
                    - generic [ref=e85]: All systems operational
    - button "Open Next.js Dev Tools" [ref=e93] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import {
  3   |   createMockToken,
  4   |   mockRefreshApiFailure,
  5   |   mockRefreshApiSuccess,
  6   |   mockUserProfileApi,
  7   |   setAuthCookies,
  8   | } from "./helpers/auth-mock";
  9   |
  10  | test.describe("Auth - Zero-Trust BFF Token Refresh Scenarios", () => {
  11  |   test("zero-trust check: GET /api/auth/tokens MUST NOT expose refreshToken", async ({
  12  |     request,
  13  |     context,
  14  |   }) => {
  15  |     await setAuthCookies(context);
  16  |
  17  |     // Call the internal tokens endpoint
  18  |     const response = await request.get("/api/auth/tokens");
  19  |     expect(response.status()).toBe(200);
  20  |
  21  |     const data = await response.json();
  22  |
  23  |     // accessToken should be present
  24  |     expect(data.accessToken).toBeDefined();
  25  |
  26  |     // CRITICAL: refreshToken MUST NOT be exposed to client JS
  27  |     expect(data.refreshToken).toBeUndefined();
  28  |   });
  29  |
  30  |   test("proactive refresh: middleware refreshes expiring access token seamlessly", async ({
  31  |     page,
  32  |     context,
  33  |   }) => {
  34  |     // Access token expiring in 10 seconds (less than 1 minute threshold)
  35  |     const expiringSoonAccessToken = createMockToken({
  36  |       exp: Math.floor(Date.now() / 1000) + 10,
  37  |     });
  38  |     const validRefreshToken = createMockToken({
  39  |       exp: Math.floor(Date.now() / 1000) + 86400 * 7,
  40  |     });
  41  |
  42  |     await setAuthCookies(context, {
  43  |       accessToken: expiringSoonAccessToken,
  44  |       refreshToken: validRefreshToken,
  45  |     });
  46  |
  47  |     const refreshedAccessToken = createMockToken({
  48  |       exp: Math.floor(Date.now() / 1000) + 3600,
  49  |     });
  50  |     const refreshedRefreshToken = createMockToken({
  51  |       exp: Math.floor(Date.now() / 1000) + 86400 * 7,
  52  |     });
  53  |
  54  |     await mockRefreshApiSuccess(page, {
  55  |       accessToken: refreshedAccessToken,
  56  |       refreshToken: refreshedRefreshToken,
  57  |     });
  58  |     await mockUserProfileApi(page);
  59  |
  60  |     // Navigate to protected profile
  61  |     await page.goto("/en/profile");
  62  |
  63  |     // Page should load successfully without being logged out
  64  |     expect(page.url()).toContain("/profile");
  65  |
  66  |     // Cookies should have been updated with refreshed tokens
  67  |     const cookies = await context.cookies();
  68  |     const currentAccessToken = cookies.find((c) => c.name === "accessToken");
> 69  |     expect(currentAccessToken?.value).toBe(refreshedAccessToken);
      |                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  70  |   });
  71  |
  72  |   test("revoked refresh token: BFF refresh failure clears cookies and redirects to login", async ({
  73  |     page,
  74  |     context,
  75  |     request,
  76  |   }) => {
  77  |     // Inject valid format but revoked tokens
  78  |     await setAuthCookies(context);
  79  |
  80  |     // Mock backend refresh failing with 401
  81  |     await mockRefreshApiFailure(page, 401);
  82  |
  83  |     // Directly call the BFF refresh route
  84  |     const refreshRes = await request.post("/api/auth/refresh");
  85  |     expect(refreshRes.status()).toBe(401);
  86  |
  87  |     // Next navigation to profile should be redirected to login
  88  |     await page.goto("/en/profile");
  89  |     await page.waitForURL("**/auth/login*");
  90  |     expect(page.url()).toContain("/auth/login");
  91  |   });
  92  |
  93  |   test("transient backend 500 error during refresh preserves user cookies", async ({
  94  |     page,
  95  |     context,
  96  |   }) => {
  97  |     // Access token expiring soon
  98  |     const expiringSoonAccessToken = createMockToken({
  99  |       exp: Math.floor(Date.now() / 1000) + 10,
  100 |     });
  101 |     const validRefreshToken = createMockToken({
  102 |       exp: Math.floor(Date.now() / 1000) + 86400 * 7,
  103 |     });
  104 |
  105 |     await setAuthCookies(context, {
  106 |       accessToken: expiringSoonAccessToken,
  107 |       refreshToken: validRefreshToken,
  108 |     });
  109 |
  110 |     // Backend temporarily returns 500
  111 |     await mockRefreshApiFailure(page, 500);
  112 |     await mockUserProfileApi(page);
  113 |
  114 |     await page.goto("/en/profile");
  115 |
  116 |     // Transient failure must NOT wipe cookies
  117 |     const cookies = await context.cookies();
  118 |     const refreshToken = cookies.find((c) => c.name === "refreshToken");
  119 |     expect(refreshToken?.value).toBe(validRefreshToken);
  120 |   });
  121 | });
  122 |
```
