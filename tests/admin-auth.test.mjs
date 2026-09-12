import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const { NextRequest, NextResponse } = require("next/server");

function load(file, mocks = {}, env = {}) {
  const exports = {};
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(code, { exports, URL, Date, process: { env }, require: name => {
    if (name === "server-only") return {};
    if (name in mocks) return mocks[name];
    return require(name);
  } });
  return exports;
}

const admins = ["first@example.com", "second@example.com", "third@example.com"];
function setup(overrides = {}) {
  const env = { ADMIN_ALLOWED_EMAILS: JSON.stringify(admins), NODE_ENV: "production", ...overrides };
  const calls = [];
  const firebase = { getAdminAuth: () => ({ verifyIdToken: async (token, checkRevoked) => {
    calls.push({ token, checkRevoked });
    if (token === "invalid" || token === "revoked") throw new Error("Rejected");
    return { uid: "verified-uid", email: token === "missing-email" ? undefined : token, exp: Math.floor(Date.now() / 1000) + 3600 };
  } }) };
  const access = load("lib/server/adminAccess.ts", { "@/lib/firebaseAdmin": firebase }, env);
  const paths = load("lib/user-app.ts");
  const role = load("app/api/auth/role/route.ts", {
    "@/lib/firebaseAdmin": firebase, "@/lib/server/adminAccess": access, "@/lib/user-app": paths,
  }, env);
  return { access, role, paths, calls, env };
}
function request(token, { method = "GET", next, cookie, origin } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (cookie) headers.cookie = `__session=${cookie}`;
  if (origin) headers.origin = origin;
  return new NextRequest(`https://urologics.co.uk/api/auth/role${next ? `?next=${encodeURIComponent(next)}` : ""}`, { method, headers });
}

test("JSON and CSV normalize all three admin identities, casing and whitespace", async () => {
  for (const value of [JSON.stringify(admins.map(e => ` ${e.toUpperCase()} `)), admins.join(", ")]) {
    const { access, role, calls } = setup({ ADMIN_ALLOWED_EMAILS: value });
    assert.equal(access.getAllowedAdminEmails().length, 3);
    for (const email of admins) {
      const response = await role.GET(request(email.toUpperCase(), { next: "/web" }));
      const data = await response.json();
      assert.equal(data.isAdmin, true);
      assert.equal(data.destination, "/dashboard");
      assert.equal(data.studentDestination, "/web");
      const cookie = response.headers.get("set-cookie");
      for (const flag of ["__session=", "Path=/", "HttpOnly", "Secure", "SameSite=lax"]) assert.ok(cookie.includes(flag));
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(data.email, email);
      assert.equal(data.allowedEmails, undefined);
    }
    assert.ok(calls.every(call => call.checkRevoked === true));
  }
});

test("missing/malformed allowlists fail closed and never use a public fallback", () => {
  for (const raw of [undefined, "", "[", '["first@example.com",]', '{"email":"first@example.com"}', '["first@example.com",42]', '"first@example.com"', "first@example.com,broken"]) {
    const { access } = setup({ ADMIN_ALLOWED_EMAILS: raw, NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS: admins.join(",") });
    assert.equal(access.isAllowedAdminEmail(admins[0]), false);
  }
  assert.equal(setup().access.isAllowedAdminEmail(null), false);
  assert.equal(setup().access.isAllowedAdminEmail(""), false);
  assert.equal(setup().access.isAllowedAdminEmail(` ${admins[0].toUpperCase()} `), true);
});

test("non-admin/missing email cannot enter dashboard via next or request email", async () => {
  const { role, access } = setup();
  for (const token of ["student@example.com", "missing-email"]) {
    const req = request(token, { next: "/dashboard/users" });
    req.nextUrl.searchParams.set("email", admins[0]);
    const result = await (await role.GET(req)).json();
    assert.equal(result.isAdmin, false);
    assert.equal(result.destination, "/web");
    assert.equal((await access.requireAdminSession(req)).response.status, 403);
  }
  for (const token of [null, "invalid", "revoked"]) {
    assert.equal((await role.GET(request(token))).status, 401);
    assert.equal((await access.requireAdminSession(request(token))).response.status, 401);
  }
});

test("safe relative destinations are role-scoped; external/encoded redirects fail closed", () => {
  const { getPostLoginDestination: next } = setup().paths;
  assert.equal(next("/dashboard/users?tab=paid", true), "/dashboard/users?tab=paid");
  assert.equal(next("/web/courses?tab=all", false), "/web/courses?tab=all");
  assert.equal(next("/checkout?planId=1", false), "/checkout?planId=1");
  assert.equal(next("/dashboard/users", false), "/web");
  assert.equal(next("/web", true), "/dashboard");
  for (const bad of ["https://evil.test", "https://urologics.co.uk/web", "//evil.test", "/\\evil.test", "/%2fevil.test", "/%252fevil.test", "/web/../../dashboard", "/web/%252e%252e/dashboard", "/web/%5cevil", "/web/%0a", "/web/%", "javascript:alert(1)", "/website", "/dashboard-other"]) {
    assert.equal(next(bad, true), "/dashboard", bad);
    assert.equal(next(bad, false), "/web", bad);
  }
});

test("cookie authentication verifies Firebase; mutations and logout enforce Origin", async () => {
  const { access, role } = setup();
  assert.ok((await access.requireAdminSession(request(null, { cookie: admins[0] }))).session);
  assert.equal((await access.requireAdminSession(request("invalid", { cookie: admins[0] }))).response.status, 401);
  for (const origin of [undefined, "https://evil.test"]) {
    assert.equal((await access.requireAdminSession(request(null, { cookie: admins[0], method: "POST", origin }))).response.status, 401);
    assert.equal((await role.DELETE(request(null, { method: "DELETE", origin }))).status, 403);
  }
  assert.ok((await access.requireAdminSession(request(null, { cookie: admins[0], method: "POST", origin: "https://urologics.co.uk" }))).session);
  const logout = await role.DELETE(request(null, { method: "DELETE", origin: "https://urologics.co.uk" }));
  assert.ok(logout.headers.get("set-cookie").includes("Max-Age=0"));
});

test("server dashboard guard blocks missing, forged and non-admin cookies", async () => {
  const { access } = setup();
  let token;
  const { requireDashboardSession } = load("lib/server/dashboardSession.ts", {
    "react": { cache: fn => fn },
    "next/headers": { cookies: async () => ({ get: () => token ? { value: token } : undefined }) },
    "next/navigation": { redirect: path => { throw new Error(`redirect:${path}`); } },
    "@/lib/server/adminAccess": access,
  });
  for (token of [undefined, "invalid", "revoked"]) await assert.rejects(requireDashboardSession(), /redirect:\/login/);
  token = "student@example.com";
  await assert.rejects(requireDashboardSession(), /redirect:\/web/);
  token = admins[0];
  assert.equal((await requireDashboardSession()).uid, "verified-uid");
});

test("newly protected admin handlers deny access before calling data services", async () => {
  const denial = NextResponse.json({ error: "Denied" }, { status: 403 });
  const cases = [
    ["dashboard", ["GET"]], ["chapters", ["GET", "POST"]],
    ["chapters/[id]", ["PUT", "DELETE"]], ["upload-image", ["POST"]],
    ["cloudinary-upload", ["POST"]], ["videos/videoItem/[id]/stream", ["GET"]],
  ];
  for (const [path, methods] of cases) {
    const handler = load(`app/api/${path}/route.ts`, {
      "@/lib/server/adminAccess": { requireAdminSession: async () => ({ response: denial, session: null }) },
      "@/lib/firebaseAdmin": { getAdminDb: () => { throw new Error("Unauthorized data read"); } },
      "@/lib/server/videoStreamService": {},
      "cloudinary": { v2: { config() {} } },
    });
    for (const method of methods) assert.equal(await handler[method](request(null, { method })), denial);
  }
});
