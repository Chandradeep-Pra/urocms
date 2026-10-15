# Connected account UI checks

Start UROCMS on port 3025 and Testing Zone on port 3022, then run from UROCMS:

```powershell
node tests/browser/account-ui.cjs
```

Override the local addresses with `CMS_TEST_ORIGIN` and `TESTING_TEST_ORIGIN` if needed. Both must be localhost addresses. The runner uses the connected Testing Zone installation of `puppeteer-core` and an installed Chrome or Edge browser.

API and Firebase responses use test fixtures. The checks cover signup validation, country selection, password visibility, student routing, calendar selection, description bullets, profile edits, purchase tabs, active courses, live tests, lesson history, course search and Viva mode styling. Screenshots are written to `.test-artifacts/account-ui`.

The runner creates a temporary `/ui-check-local` route for the calendar, signup dialog and bullet editor, then removes it and its generated route type during cleanup.
