<div align="center">

<img src="apps/web/public/favicon-192.png" width="72" height="72" alt="" />

# Sakura Tools

**Fewer repetitive tasks. More productivity.**

A toolbox for developers, technical support and Brazilian tax document analysis.
Everything runs in your browser. Open source. Powered by [Sakura UI](https://github.com/GuiBonin/sakura-ui).

[Português](./README.md) · [Contributing](./CONTRIBUTING.md)

</div>

> **Status:** in development. No release yet.

## Available tools

JSON formatter, XML formatter (with structural validation), Base64, URL encode/decode, UUID v4/v7,
password generator, QR code generator, regex tester (isolated in a Web Worker), text diff, hash
generator (SHA and HMAC, text and files), JWT decoder, color converter (HEX, RGB, HSL, CMYK) with WCAG contrast, Unix
timestamp converter, and Brazilian CPF/CNPJ validators and test-data generators (including the new
alphanumeric CNPJ).

## Privacy

Free tools never send data to any server. The production Content Security Policy blocks external
connections. Only theme, language and favorite/recent tool IDs are stored in your browser. Your
input is never saved.

## Running locally

Requires Node.js 20.19+ and npm.

```bash
git clone https://github.com/GuiBonin/sakura-tools.git
cd sakura-tools
npm install
npm run dev
```

Open http://localhost:5173. No account, API key or database needed. Run `npm run check` to lint,
typecheck, test and build.

Documentation is written in Portuguese: see [docs/](./docs/), especially
[ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [ADDING_A_TOOL.md](./docs/ADDING_A_TOOL.md).

## License

[MIT](./LICENSE) © Guilherme Bonin
