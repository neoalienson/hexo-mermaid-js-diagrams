# Mermaid Markdown Rendering Analysis

## Problem

When using standard markdown mermaid code blocks (` ```mermaid ... ``` `), the content gets HTML-encoded by Hexo's rendering pipeline, resulting in entities like `&lt;`, `&gt;`, `&quot;`, `&#x2f;` instead of raw mermaid syntax.

**Example Output:**
```html
<pre class="language-mermaid"><code class="language-mermaid">
flowchart TD
    Given --&amp;gt; When
</code></pre>
```

## Root Cause

Hexo's rendering pipeline:
1. **Markdown Parser** converts ` ```mermaid ` to `<pre><code class="language-mermaid">`
2. **Syntax Highlighter** (PrismJS) encodes HTML entities in code blocks
3. **Mermaid Plugin** tries to process already-encoded content

The issue: By the time the mermaid plugin runs, the content is already HTML-encoded.

## Solution Approaches

### Approach 1: Decode HTML Entities (Initial Attempt)
- Use `he.decode()` to reverse HTML encoding
- **Problem**: Still inefficient, requires decoding pass

### Approach 2: Placeholder System (Previous Implementation)
- Intercept mermaid blocks BEFORE markdown rendering
- Replace with HTML comment placeholders
- Restore original content AFTER HTML rendering
- **Problem**: Complex global state management

### Approach 3: Base64 Encoding (Current Implementation)
- Encode mermaid content as base64 BEFORE markdown rendering
- Replace with fake code blocks that pass through unchanged
- Decode base64 back to mermaid divs AFTER HTML rendering

**Implementation:**
```javascript
// Before markdown rendering - encode as base64
data.content.replace(/```mermaid([\s\S]*?)```/g, (match, content) => {
    const encoded = Buffer.from(content.trim()).toString('base64');
    const id = `MERMAID_BASE64_${base64Counter++}`;
    base64Store.set(id, encoded);
    return `\`\`\`${id}\n${encoded}\n\`\`\``;
});

// After HTML rendering - decode base64 to mermaid div
str.replace(/<pre[^>]*><code[^>]*>(MERMAID_BASE64_\d+)\s+([\s\S]*?)<\/code><\/pre>/g, (match, id, encodedContent) => {
    const decoded = Buffer.from(encodedContent.trim(), 'base64').toString('utf8');
    return `<div class="mermaid">${decoded}</div>`;
});
```

## Key Insights

1. **Filter Execution Order**: `before_post_render` runs before markdown parsing, preventing HTML encoding
2. **Placeholder Protection**: HTML comments pass through markdown/syntax highlighting unchanged
3. **Priority Matters**: `after_render:html` with priority `mermaid.priority + 1` ensures restoration happens after markdown rendering but before other post-processing
4. **Scope Limitation**: `before_post_render` only handles posts, not pages (would need `before_render` for pages)

## Configuration Requirements

```yaml
mermaid:
  enable: true
  markdown: true  # Enable markdown code block support
  render_mode: live  # Client-side rendering
  priority: 40  # Lower = earlier execution
```

## Trade-offs

**Base64 Encoding Approach (Current):**
- ✅ No HTML entity issues
- ✅ Preserves exact mermaid syntax
- ✅ Works with any special characters
- ✅ Uses standard Node.js Buffer API
- ✅ Content validation via base64 comparison
- ⚠️ Slight encoding/decoding overhead
- ⚠️ Requires global state (Map storage)

**Placeholder Approach (Previous):**
- ✅ No encoding/decoding overhead
- ✅ Preserves exact mermaid syntax
- ❌ Complex HTML comment parsing
- ❌ More fragile implementation

**Decode Approach (Initial):**
- ✅ Simpler logic
- ❌ Performance overhead
- ❌ Risk of double-encoding issues
- ❌ Depends on external library (`he`)

## Debugging

Added logging to track base64 encoding lifecycle (enable with `debug: true`):
- `[Mermaid] Encoded block X: Y chars -> Z base64 chars` - Content encoded before rendering
- `[Mermaid] Decoded block X: Y base64 chars -> Z chars` - Content decoded after rendering
- `[Mermaid] Block X not found or content mismatch` - Storage lookup failed or content changed

If no logs appear: Check `markdown: true` and `debug: true` in config and verify filters are registered.
