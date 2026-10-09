# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 06-signout-and-revocation.spec.ts >> Auth - Sign Out & Session Revocation Scenarios >> signing out clears cookies and redirects to /auth/login
- Location: e2e/06-signout-and-revocation.spec.ts:9:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h2, h1, [role=\'tablist\']').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('h2, h1, [role=\'tablist\']').first() with timeout 5000ms
  - waiting for locator('h2, h1, [role=\'tablist\']').first()

```

```yaml
- button "Open Tanstack query devtools":
    - img
- region "Notifications alt+T"
- banner:
    - navigation:
        - link "Visel Art":
            - /url: /
        - navigation "Main":
            - list:
                - listitem:
                    - button "Features"
                - listitem:
                    - button "Platform"
                - listitem:
                    - link "Tech Stack":
                        - /url: /#tech-stack
                - listitem:
                    - link "Profile":
                        - /url: /profile
        - combobox:
            - img "en"
            - text: English
- main
- contentinfo:
    - link "Visel Art":
        - /url: /
    - paragraph: Enterprise-ready full-stack monorepo boilerplate crafted with clean architecture, strict type safety, and modern developer experience.
    - link "GitHub":
        - /url: https://github.com
    - link "Twitter":
        - /url: https://twitter.com
    - link "Turborepo":
        - /url: https://turborepo.org
    - heading "Product" [level=3]
    - list:
        - listitem:
            - link "Features":
                - /url: /#features
        - listitem:
            - link "Tech Stack":
                - /url: /#tech-stack
        - listitem:
            - link "User Profile":
                - /url: /profile
        - listitem:
            - link "Authentication":
                - /url: /auth/login
    - heading "Resources" [level=3]
    - list:
        - listitem:
            - link "Documentation":
                - /url: https://turbo.build/repo/docs
        - listitem:
            - link "GitHub":
                - /url: https://github.com
        - listitem:
            - link "Swagger API":
                - /url: http://localhost:8001/api/docs
        - listitem:
            - link "Next.js 15":
                - /url: https://nextjs.org/docs
    - heading "Legal" [level=3]
    - list:
        - listitem:
            - link "Privacy Policy":
                - /url: /pages/privacy-policy
        - listitem:
            - link "Terms of Service":
                - /url: /pages/terms-of-service
    - paragraph: © 2026 Visel Art. All rights reserved.
    - text: All systems operational
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import {
  3  |   mockLogoutApi,
  4  |   mockUserProfileApi,
  5  |   setAuthCookies,
  6  | } from "./helpers/auth-mock";
  7  |
  8  | test.describe("Auth - Sign Out & Session Revocation Scenarios", () => {
  9  |   test("signing out clears cookies and redirects to /auth/login", async ({
  10 |     page,
  11 |     context,
  12 |   }) => {
  13 |     await setAuthCookies(context);
  14 |     await mockUserProfileApi(page);
  15 |     await mockLogoutApi(page);
  16 |
  17 |     await page.goto("/en/profile");
> 18 |     await expect(page.locator("h2, h1, [role='tablist']").first()).toBeVisible();
     |                                                                    ^ Error: expect(locator).toBeVisible() failed
  19 |
  20 |     // Trigger logout via BFF route
  21 |     await page.evaluate(async () => {
  22 |       await fetch("/api/auth/logout", { method: "POST" });
  23 |       window.location.href = "/en/auth/login";
  24 |     });
  25 |
  26 |     await page.waitForURL("**/auth/login*");
  27 |     expect(page.url()).toContain("/auth/login");
  28 |
  29 |     // Cookies must be cleared
  30 |     const cookies = await context.cookies();
  31 |     const accessToken = cookies.find((c) => c.name === "accessToken");
  32 |     const refreshToken = cookies.find((c) => c.name === "refreshToken");
  33 |
  34 |     expect(!accessToken || accessToken.value === "").toBeTruthy();
  35 |     expect(!refreshToken || refreshToken.value === "").toBeTruthy();
  36 |
  37 |     // Trying to navigate back to profile should be redirected to login
  38 |     await page.goto("/en/profile");
  39 |     await page.waitForURL("**/auth/login*");
  40 |     expect(page.url()).toContain("/auth/login");
  41 |   });
  42 |
  43 |   test("BFF logout route revokes session on backend and responds with success", async ({
  44 |     request,
  45 |     context,
  46 |   }) => {
  47 |     await setAuthCookies(context);
  48 |
  49 |     const response = await request.post("/api/auth/logout");
  50 |     expect(response.status()).toBe(200);
  51 |
  52 |     const data = await response.json();
  53 |     expect(data.message).toBe("Success");
  54 |   });
  55 | });
  56 |
```
