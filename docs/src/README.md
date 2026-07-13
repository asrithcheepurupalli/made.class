# Doc sources

These HTML files are the editable sources for the PDFs in `docs/`.
The stylesheet references the app's brand fonts; copy them next to the sources before rendering:

```bash
cp ../../app/fonts/fraunces-560.woff2 fraunces.woff2
cp ../../app/fonts/plex-400.woff2 plex400.woff2
cp ../../app/fonts/plex-600.woff2 plex600.woff2
```

Then render with headless Chromium (any tool works; Playwright example):

```js
await page.goto(`file://${path}/01-product-features.html`, { waitUntil: "networkidle" });
await page.pdf({ path: "../madeclass-product-features.pdf", format: "A4",
  margin: { top: "18mm", bottom: "18mm", left: "17mm", right: "17mm" }, printBackground: true });
```
