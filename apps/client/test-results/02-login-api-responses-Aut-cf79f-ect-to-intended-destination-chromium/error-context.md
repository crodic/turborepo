# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-login-api-responses.spec.ts >> Auth - Login API Response Scenarios >> should respect 'from' query parameter and redirect to intended destination
- Location: e2e/02-login-api-responses.spec.ts:105:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/example" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
    - button "Open Tanstack query devtools" [ref=f1e52] [cursor=pointer]
    - region "Notifications alt+T"
    - generic [ref=f1e102]:
        - generic [ref=f1e103]:
            - img "Crodic Framework" [ref=f1e104]
            - link "Crodic Framework" [ref=f1e106] [cursor=pointer]:
                - /url: /
            - generic [ref=f1e108]:
                - paragraph [ref=f1e109]: Welcome to Crodic Framework
                - heading "Enterprise full-stack monorepo platform to build & scale modern applications" [level=2] [ref=f1e110]
        - generic [ref=f1e113]:
            - generic [ref=f1e114]:
                - generic [ref=f1e115]: Sign In
                - generic [ref=f1e116]: Enter your credentials to access your account
            - generic [ref=f1e118]:
                - generic [ref=f1e119]:
                    - generic [ref=f1e120]: Email
                    - textbox "Email" [ref=f1e121]:
                        - /placeholder: you@example.com
                        - text: test.user@example.com
                - generic [ref=f1e122]:
                    - generic [ref=f1e123]: Password
                    - textbox "Password" [ref=f1e124]:
                        - /placeholder: ••••••••
                        - text: CorrectPassword123!
                - link "Forgot password?" [ref=f1e126] [cursor=pointer]:
                    - /url: /auth/forgot-password
                - button "Sign In" [ref=f1e127] [cursor=pointer]
                - button "Continue with Google" [ref=f1e128] [cursor=pointer]
            - paragraph [ref=f1e130]:
                - text: Don't have an account?
                - link "Sign up" [ref=f1e131] [cursor=pointer]:
                    - /url: /auth/sign-up
    - generic [ref=f1e136] [cursor=pointer]:
        - button "Open Next.js Dev Tools" [ref=f1e137]
        - generic [ref=f1e141]:
            - button "Open issues overlay" [ref=f1e142]:
                - generic [ref=f1e143]:
                    - generic [aria-hidden] [ref=f1e144]: "0"
                    - generic [ref=f1e145]: "1"
                - generic [ref=f1e146]: Issue
            - button "Collapse issues badge" [ref=f1e147]
    - alert [ref=f1e150]
```

# Test source

```ts
  15  |   }) => {
  16  |     await mockLoginApiFailure(page, 401, "Invalid email or password");
  17  |
  18  |     await page.fill('input[name="email"]', "wrong@example.com");
  19  |     await page.fill('input[name="password"]', "wrongpassword");
  20  |     await page.click('button[type="submit"]');
  21  |
  22  |     // Should display error toast or message
  23  |     await expect(page.locator('[data-sonner-toast][data-type="error"], .text-destructive').first()).toBeVisible();
  24  |
  25  |     // Should remain on the login page
  26  |     expect(page.url()).toContain("/auth/login");
  27  |   });
  28  |
  29  |   test("should handle 403 Forbidden (Inactive/unverified account)", async ({
  30  |     page,
  31  |   }) => {
  32  |     await mockLoginApiFailure(page, 403, "Account not verified or inactive");
  33  |
  34  |     await page.fill('input[name="email"]', "unverified@example.com");
  35  |     await page.fill('input[name="password"]', "password123");
  36  |     await page.click('button[type="submit"]');
  37  |
  38  |     await expect(page.locator('[data-sonner-toast][data-type="error"], .text-destructive').first()).toBeVisible();
  39  |     expect(page.url()).toContain("/auth/login");
  40  |   });
  41  |
  42  |   test("should handle 429 Too Many Requests (Rate limit throttled)", async ({
  43  |     page,
  44  |   }) => {
  45  |     await mockLoginApiFailure(page, 429, "Too many attempts from your IP. Please wait 1 minute.");
  46  |
  47  |     await page.fill('input[name="email"]', "spammer@example.com");
  48  |     await page.fill('input[name="password"]', "password123");
  49  |     await page.click('button[type="submit"]');
  50  |
  51  |     await expect(page.locator('[data-sonner-toast][data-type="error"], .text-destructive').first()).toBeVisible();
  52  |     expect(page.url()).toContain("/auth/login");
  53  |   });
  54  |
  55  |   test("should handle 500 Server Error without crashing the page", async ({
  56  |     page,
  57  |   }) => {
  58  |     await mockLoginApiFailure(page, 500, "Internal server error occurred");
  59  |
  60  |     await page.fill('input[name="email"]', "crash@example.com");
  61  |     await page.fill('input[name="password"]', "password123");
  62  |     await page.click('button[type="submit"]');
  63  |
  64  |     await expect(page.locator('[data-sonner-toast][data-type="error"], .text-destructive').first()).toBeVisible();
  65  |     expect(page.url()).toContain("/auth/login");
  66  |   });
  67  |
  68  |   test("should handle network failure gracefully", async ({ page }) => {
  69  |     await page.route("**/api/v1/user/auth/login", (route) => route.abort());
  70  |
  71  |     await page.fill('input[name="email"]', "network@example.com");
  72  |     await page.fill('input[name="password"]', "password123");
  73  |     await page.click('button[type="submit"]');
  74  |
  75  |     await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible();
  76  |     expect(page.url()).toContain("/auth/login");
  77  |   });
  78  |
  79  |   test("should succeed, set auth cookies, and redirect to /profile", async ({
  80  |     page,
  81  |     context,
  82  |   }) => {
  83  |     await mockLoginApiSuccess(page);
  84  |     await mockUserProfileApi(page);
  85  |
  86  |     await page.fill('input[name="email"]', "test.user@example.com");
  87  |     await page.fill('input[name="password"]', "CorrectPassword123!");
  88  |     await page.click('button[type="submit"]');
  89  |
  90  |     // Should redirect to profile page
  91  |     await page.waitForURL("**/profile");
  92  |     expect(page.url()).toContain("/profile");
  93  |
  94  |     // Verify cookies are set in browser
  95  |     const cookies = await context.cookies();
  96  |     const accessTokenCookie = cookies.find((c) => c.name === "accessToken");
  97  |     const refreshTokenCookie = cookies.find((c) => c.name === "refreshToken");
  98  |
  99  |     expect(accessTokenCookie).toBeDefined();
  100 |     expect(refreshTokenCookie).toBeDefined();
  101 |     expect(accessTokenCookie?.httpOnly).toBe(true);
  102 |     expect(refreshTokenCookie?.httpOnly).toBe(true);
  103 |   });
  104 |
  105 |   test("should respect 'from' query parameter and redirect to intended destination", async ({
  106 |     page,
  107 |   }) => {
  108 |     await page.goto("/en/auth/login?from=%2Fexample");
  109 |     await mockLoginApiSuccess(page);
  110 |
  111 |     await page.fill('input[name="email"]', "test.user@example.com");
  112 |     await page.fill('input[name="password"]', "CorrectPassword123!");
  113 |     await page.click('button[type="submit"]');
  114 |
> 115 |     await page.waitForURL("**/example");
      |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  116 |     expect(page.url()).toContain("/example");
  117 |   });
  118 | });
  119 |
```
