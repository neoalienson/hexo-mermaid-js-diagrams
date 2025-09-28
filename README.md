Hexo plugin for rendering mermaid js diagrams

This repo maintains the upgrade.

* mermaid 10.9.1

Install:

```shell
npm i hexo-mermaid-js-diagrams
```

## Configuration

Add to your `_config.yml`:

```yaml
mermaid:
  enable: true
  renderMode: puppeteer  # 'puppeteer' (default) or 'live'
  theme: default
```

### Render Modes

- **puppeteer** (default): Server-side rendering, generates static SVG during build
- **live**: Client-side rendering, requires JavaScript enabled in browser

## Sample

```
{% mermaid %}
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
{% endmermaid %}
```
## Security Implications

⚠️ **Puppeteer mode**: Uses `puppeteer` `eval()`. The validation to prevent potential security vulnerabilities is not reviewed. Use at your own risk.

⚠️ **Live mode**: Executes Mermaid.js in the browser. Ensure diagram content is trusted.
