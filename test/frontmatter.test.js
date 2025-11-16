const assert = require('assert');

describe('Mermaid with Frontmatter', () => {
    let base64Store, base64Counter;
    
    beforeEach(() => {
        base64Store = new Map();
        base64Counter = 0;
    });
    
    const encodeStep = (content) => {
        return content.replace(/```mermaid([\s\S]*?)```/g, (match, mermaidContent) => {
            const trimmed = mermaidContent.trim();
            const encoded = Buffer.from(trimmed).toString('base64');
            const id = `MERMAID_BASE64_${base64Counter++}`;
            base64Store.set(id, encoded);
            return `\`\`\`${id}\n${encoded}\n\`\`\``;
        });
    };
    
    const decodeStep = (html) => {
        return html.replace(/<pre[^>]*><code[^>]*class="[^"]*language-(MERMAID_BASE64_\d+)[^"]*">([\s\S]*?)<\/code><\/pre>/g, (match, id, encodedContent) => {
            const stored = base64Store.get(id);
            if (stored && stored === encodedContent.trim()) {
                const decoded = Buffer.from(stored, 'base64').toString('utf8');
                return `<div class="mermaid">${decoded}</div>`;
            }
            return match;
        });
    };
    
    it('should handle mermaid with frontmatter', () => {
        const input = `\`\`\`mermaid
---
title: BDD Development Workflow
---
flowchart TD
    Business[Business Stakeholder<br/>Writes Feature]
    Dev[Developer<br/>Implements Steps]
    Execute[Execute Specification<br/>as Test]
    Pass{Test<br/>Passes?}
    Implement[Implement<br/>Feature Code]
    Done[Feature Complete<br/>Living Documentation]
    
    Business --> Dev
    Dev --> Execute
    Execute --> Pass
    Pass -->|No| Implement
    Implement --> Execute
    Pass -->|Yes| Done
    
    style Business fill:#9cf,stroke:#333,stroke-width:2px
    style Execute fill:#fc9,stroke:#333,stroke-width:2px
    style Done fill:#9f9,stroke:#333,stroke-width:2px
\`\`\``;
        
        const encoded = encodeStep(input);
        const html = encoded.replace(/```([^\n]+)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
        const result = decodeStep(html);
        
        assert(result.includes('<div class="mermaid">'));
        assert(result.includes('title: BDD Development Workflow'));
        assert(result.includes('flowchart TD'));
        assert(result.includes('Business[Business Stakeholder<br/>Writes Feature]'));
        assert(result.includes('style Business fill:#9cf'));
    });
    
    it('should preserve HTML entities in frontmatter', () => {
        const input = `\`\`\`mermaid
---
title: Test &amp; Validation
---
graph TD
    A[Start &lt;here&gt;] --> B[End]
\`\`\``;
        
        const encoded = encodeStep(input);
        const html = encoded.replace(/```([^\n]+)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
        const result = decodeStep(html);
        
        assert(result.includes('<div class="mermaid">'));
        assert(result.includes('title: Test &amp; Validation'));
        assert(result.includes('A[Start &lt;here&gt;]'));
    });
});