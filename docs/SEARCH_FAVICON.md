# Search favicon

## What Google uses

Google Search uses the site favicon from the home page `<head>`, not the Open Graph image.

The app now exposes the existing square brand logo as:

- `rel="icon"` through Next metadata
- `rel="shortcut icon"` through Next metadata
- `rel="apple-touch-icon"` through Next metadata
- the web app manifest icon

The source file is `public/mylogo.png`, which is `619×619`.

## Files

- `app/layout.tsx`
- `app/manifest.ts`
- `public/mylogo.png`

## After deploy

Google may take several days to several weeks to refresh the favicon after recrawling the home page. Use Google Search Console URL Inspection on the home page to request recrawling after the deployment is live.

Source checked: Google Search Central favicon documentation, last updated February 4, 2026.
