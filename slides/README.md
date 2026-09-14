# Slides

Presentation slides for RescuFood, built with
[Slidev](https://github.com/slidevjs/slidev).

## Usage

```sh
npm install
npm run dev      # serves on http://localhost:3030
npm run build    # static build into dist/
npm run export   # PDF export (downloads playwright-chromium on first run)
```

Edit [slides.md](./slides.md) to change the deck. Vue components go in
`components/`, extra slide files in `pages/`, and code samples pulled into
slides in `snippets/`.
