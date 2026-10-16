# Recover the cached login page

On October 16, 2026, public `/login` served the old form with `X-Cache: HIT`
and `Cache-Control: s-maxage=31536000`. Both `/login?mode=login` and
`/login?mode=signup` served the current shared logo panel with private,
no-store headers.

The login route is dynamic. Account links explicitly select their tab and
load a full document. The bare route redirects to the login tab while
preserving return parameters once the request reaches Cloud Run.

Deploying Cloud Run alone does not remove the already cached HTML at Hosting.
After deploying the updated apps, publish the existing Hosting configuration
from UROCMS to clear its CDN cache:

```sh
firebase deploy --only hosting --project proud-woods-489814-s6
```

This deployment command has not been executed locally. Recheck plain
`https://urologics.co.uk/login` afterward: it should reach the shared panel
through `?mode=login`, without the old cached form.

Firebase documents cache invalidation on Hosting redeployment in its
[cache guide](https://firebase.google.com/docs/hosting/manage-cache).
