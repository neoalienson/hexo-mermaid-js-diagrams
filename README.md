Hexo plugin for rendering mermaid js diagrams

This repo maintains the upgrade.

* mermaid 10.9.1

Install:

```shell
npm i hexo-mermaid-js-diagrams
```

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

⚠️ The plugin uses `puppeteer` `eval()`. The validation to prevent potential security vulnerabilities is not reviewed. Use at your own risk.
