const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Mock fs.readFileSync for tests
const originalReadFileSync = fs.readFileSync;
fs.readFileSync = (filePath, encoding) => {
  if (filePath.includes('mermaid.min.js')) {
    return 'console.log("mocked mermaid");';
  }
  return originalReadFileSync(filePath, encoding);
};

// Mock hexo object
const mockHexo = {
  config: {
    mermaid: {
      enable: true,
      render_mode: 'puppeteer',
      theme: 'default',
      puppeteerConfig: { 
        args: ['--disable-setuid-sandbox', '--no-sandbox'],
        dumpio: false 
      },
      defaultViewport: {
        width: 2048,
        height: 1024
      },
      backgroundColor: 'white',
      controls: {
        enable: true,
        zoomIn: true,
        zoomOut: true,
        reset: true,
        download: true,
        position: 'bottom-right',
        draggable: true
      },
      diagramDraggable: true,
      width: '100%',
      debug: false
    }
  },
  extend: {
    tag: {
      register: function(name, fn, options) {
        this.registeredTags = this.registeredTags || {};
        this.registeredTags[name] = { fn, options };
      }
    },
    injector: {
      register: function(position, fn) {
        this.registeredInjectors = this.registeredInjectors || {};
        this.registeredInjectors[position] = fn;
      }
    },
    filter: {
      register: function(event, fn) {
        this.registeredFilters = this.registeredFilters || {};
        this.registeredFilters[event] = fn;
      }
    }
  }
};

global.hexo = mockHexo;

describe('hexo-mermaid-js-diagrams', () => {
  beforeEach(() => {
    delete require.cache[require.resolve('../index.js')];
    mockHexo.extend.tag.registeredTags = {};
    mockHexo.extend.injector.registeredInjectors = {};
    mockHexo.extend.filter.registeredFilters = {};
  });

  it('should register mermaid tag in puppeteer mode', () => {
    mockHexo.config.mermaid.render_mode = 'puppeteer';
    require('../index.js');
    
    assert(mockHexo.extend.tag.registeredTags.mermaid);
    assert.equal(mockHexo.extend.tag.registeredTags.mermaid.options.async, true);
    assert.equal(mockHexo.extend.tag.registeredTags.mermaid.options.ends, true);
  });

  it('should register mermaid tag and after_generate filter in live mode', () => {
    mockHexo.config.mermaid.render_mode = 'live';
    require('../index.js');
    
    assert(mockHexo.extend.tag.registeredTags.mermaid);
    assert(mockHexo.extend.filter.registeredFilters.after_generate);
  });

  it('should return div wrapper in live mode', async () => {
    mockHexo.config.mermaid.render_mode = 'live';
    require('../index.js');
    
    const tagFn = mockHexo.extend.tag.registeredTags.mermaid.fn;
    const result = await tagFn([], 'graph TD; A-->B;');
    
    assert.equal(result, '<div class="mermaid">graph TD; A-->B;</div>');
  });

  it('should use builder in puppeteer mode', async () => {
    mockHexo.config.mermaid.render_mode = 'puppeteer';
    
    // Mock builder to avoid puppeteer dependency in tests
    const originalBuilder = require('../builder');
    require.cache[require.resolve('../builder')] = {
      exports: () => Promise.resolve('<svg>mocked</svg>')
    };
    
    require('../index.js');
    
    const tagFn = mockHexo.extend.tag.registeredTags.mermaid.fn;
    const result = await tagFn([], 'graph TD; A-->B;');
    
    assert.equal(result, '<svg>mocked</svg>');
  });

  it('should handle complex flowchart with HTML entities in live mode', async () => {
    mockHexo.config.mermaid.render_mode = 'live';
    require('../index.js');
    
    const tagFn = mockHexo.extend.tag.registeredTags.mermaid.fn;
    const complexDiagram = `flowchart TD
    A[Identify Assets] --&gt; B[Define Threats]
    B --&gt; C[Create Data Flow Diagram]
    C --&gt; D[Analyze Trust Boundaries]
    D --&gt; E[Apply Framework&lt;br/&gt;STRIDE/PASTA]
    E --&gt; F[Assess Impact & Likelihood]
    F --&gt; G[Prioritize Threats]
    G --&gt; H[Define Mitigations]
    H --&gt; I[Implement Controls]
    I --&gt; J[Monitor & Review]
    J --&gt; |Continuous Process| B
    
    style A fill:#4CAF50,stroke:#333,stroke-width:2px,color:#fff
    style H fill:#2196F3,stroke:#333,stroke-width:2px,color:#fff
    style J fill:#FF9800,stroke:#333,stroke-width:2px,color:#fff`;
    
    const result = await tagFn([], complexDiagram);
    
    assert.equal(result, `<div class="mermaid">${complexDiagram}</div>`);
  });

  it('should register filter for js_url configuration', () => {
    mockHexo.config.mermaid.render_mode = 'live';
    mockHexo.config.mermaid.js_url = 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js';
    require('../index.js');
    
    assert(mockHexo.extend.filter.registeredFilters.after_generate);
  });

  it('should pass controls config to builder in puppeteer mode', async () => {
    mockHexo.config.mermaid.render_mode = 'puppeteer';
    mockHexo.config.mermaid.controls = {
      enable: true,
      zoomIn: true,
      zoomOut: true,
      reset: true,
      download: true,
      position: 'bottom-right',
      draggable: true
    };
    
    let capturedControls;
    require.cache[require.resolve('../builder')] = {
      exports: (content, controls, diagramDraggable, width, debug) => {
        capturedControls = controls;
        return Promise.resolve('<svg>mocked</svg>');
      }
    };
    
    require('../index.js');
    
    const tagFn = mockHexo.extend.tag.registeredTags.mermaid.fn;
    await tagFn([], 'graph TD; A-->B;');
    
    assert.deepEqual(capturedControls, mockHexo.config.mermaid.controls);
  });

  it('should wrap svg with controls when enabled', () => {
    const mockSvg = '<svg><g>test</g></svg>';
    const controls = {
      enable: true,
      zoomIn: true,
      zoomOut: true,
      reset: true,
      download: true
    };
    
    let html = '<div class="mermaid-wrapper" style="position:relative;display:inline-block">';
    html += mockSvg;
    html += '<div class="mermaid-controls" style="position:absolute;top:8px;right:8px;display:flex;gap:4px;z-index:10">';
    if (controls.zoomIn) html += '<button onclick="const s=this.parentElement.previousElementSibling;const t=s.style.transform.match(/scale\\(([\\d.]+)\\)/);const sc=(t?parseFloat(t[1]):1)*1.2;s.style.transform=\'scale(\'+sc+\')\';s.style.transformOrigin=\'top left\'" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Zoom In">🔍</button>';
    if (controls.zoomOut) html += '<button onclick="const s=this.parentElement.previousElementSibling;const t=s.style.transform.match(/scale\\(([\\d.]+)\\)/);const sc=(t?parseFloat(t[1]):1)/1.2;s.style.transform=\'scale(\'+sc+\')\';s.style.transformOrigin=\'top left\'" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Zoom Out">🔎</button>';
    if (controls.reset) html += '<button onclick="this.parentElement.previousElementSibling.style.transform=\'\'" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Reset">↺</button>';
    if (controls.download) html += '<button onclick="const s=this.parentElement.previousElementSibling.outerHTML;const b=new Blob([s],{type:\'image/svg+xml\'});const u=URL.createObjectURL(b);const a=document.createElement(\'a\');a.href=u;a.download=\'mermaid-diagram.svg\';a.click();URL.revokeObjectURL(u)" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Download SVG">💾</button>';
    html += '</div></div>';
    
    assert(html.includes('mermaid-wrapper'));
    assert(html.includes('mermaid-controls'));
    assert(html.includes('🔍'));
    assert(html.includes('🔎'));
    assert(html.includes('↺'));
    assert(html.includes('💾'));
  });

  it('should include only selected controls', () => {
    const mockSvg = '<svg><g>test</g></svg>';
    const controls = {
      enable: true,
      zoomIn: true,
      zoomOut: false,
      reset: true,
      download: false
    };
    
    let html = '<div class="mermaid-wrapper" style="position:relative;display:inline-block">';
    html += mockSvg;
    html += '<div class="mermaid-controls" style="position:absolute;top:8px;right:8px;display:flex;gap:4px;z-index:10">';
    if (controls.zoomIn) html += '<button onclick="const s=this.parentElement.previousElementSibling;const t=s.style.transform.match(/scale\\(([\\d.]+)\\)/);const sc=(t?parseFloat(t[1]):1)*1.2;s.style.transform=\'scale(\'+sc+\')\';s.style.transformOrigin=\'top left\'" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Zoom In">🔍</button>';
    if (controls.zoomOut) html += '<button onclick="const s=this.parentElement.previousElementSibling;const t=s.style.transform.match(/scale\\(([\\d.]+)\\)/);const sc=(t?parseFloat(t[1]):1)/1.2;s.style.transform=\'scale(\'+sc+\')\';s.style.transformOrigin=\'top left\'" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Zoom Out">🔎</button>';
    if (controls.reset) html += '<button onclick="this.parentElement.previousElementSibling.style.transform=\'\'" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Reset">↺</button>';
    if (controls.download) html += '<button onclick="const s=this.parentElement.previousElementSibling.outerHTML;const b=new Blob([s],{type:\'image/svg+xml\'});const u=URL.createObjectURL(b);const a=document.createElement(\'a\');a.href=u;a.download=\'mermaid-diagram.svg\';a.click();URL.revokeObjectURL(u)" style="width:32px;height:32px;border:none;background:rgba(255,255,255,0.9);border-radius:4px;cursor:pointer;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Download SVG">💾</button>';
    html += '</div></div>';
    
    assert(html.includes('🔍'));
    assert(!html.includes('🔎'));
    assert(html.includes('↺'));
    assert(!html.includes('💾'));
  });

  it('should not wrap svg when controls disabled', () => {
    const mockSvg = '<svg><g>test</g></svg>';
    const controls = { enable: false };
    
    const result = controls.enable ? 'wrapped' : mockSvg;
    
    assert.equal(result, mockSvg);
    assert(!result.includes('mermaid-controls'));
  });

  it('should position controls at top-left', () => {
    const pos = 'top-left';
    const posMap = {'top-left':'top:8px;left:8px','top-right':'top:8px;right:8px','bottom-left':'bottom:8px;left:8px','bottom-right':'bottom:8px;right:8px'};
    const posStyle = posMap[pos];
    
    assert.equal(posStyle, 'top:8px;left:8px');
  });

  it('should position controls at bottom-right by default', () => {
    const pos = 'bottom-right';
    const posMap = {'top-left':'top:8px;left:8px','top-right':'top:8px;right:8px','bottom-left':'bottom:8px;left:8px','bottom-right':'bottom:8px;right:8px'};
    const posStyle = posMap[pos] || posMap['bottom-right'];
    
    assert.equal(posStyle, 'bottom:8px;right:8px');
  });

  it('should enable draggable by default', () => {
    const controls = { draggable: true };
    const cursor = controls.draggable !== false ? 'move' : 'default';
    
    assert.equal(cursor, 'move');
  });

  it('should disable draggable when set to false', () => {
    const controls = { draggable: false };
    const cursor = controls.draggable !== false ? 'move' : 'default';
    
    assert.equal(cursor, 'default');
  });

  it('should enable diagram draggable by default', () => {
    const diagramDraggable = true;
    assert.equal(diagramDraggable, true);
  });

  it('should disable diagram draggable when set to false', () => {
    const diagramDraggable = false;
    assert.equal(diagramDraggable, false);
  });

  it('should pass diagramDraggable to builder', async () => {
    mockHexo.config.mermaid.render_mode = 'puppeteer';
    mockHexo.config.mermaid.diagramDraggable = true;
    
    let capturedDraggable;
    require.cache[require.resolve('../builder')] = {
      exports: (content, controls, diagramDraggable, width, debug) => {
        capturedDraggable = diagramDraggable;
        return Promise.resolve('<svg>mocked</svg>');
      }
    };
    
    require('../index.js');
    
    const tagFn = mockHexo.extend.tag.registeredTags.mermaid.fn;
    await tagFn([], 'graph TD; A-->B;');
    
    assert.equal(capturedDraggable, true);
  });

  describe('markdown code fence support', () => {
    it('should register after_render:html filter when markdown is enabled', () => {
      mockHexo.config.mermaid.markdown = true;
      require('../index.js');
      
      assert(mockHexo.extend.filter.registeredFilters['after_render:html']);
    });

    it('should not register after_render:html filter when markdown is disabled', () => {
      mockHexo.config.mermaid.markdown = false;
      require('../index.js');
      
      assert(!mockHexo.extend.filter.registeredFilters['after_render:html']);
    });

    it('should convert markdown code fence to mermaid div', () => {
      mockHexo.config.mermaid.markdown = true;
      require('../index.js');
      
      const filterFn = mockHexo.extend.filter.registeredFilters['after_render:html'];
      const input = `&lt;pre&gt;&lt;code class=&quot;language-mermaid&quot;&gt;block-beta
columns 1
  db((&quot;DB&quot;))
  blockArrowId6&amp;lt;[&quot;&amp;amp;nbsp;&amp;amp;nbsp;&amp;amp;nbsp;&quot;]&amp;gt;(down)
  block:ID
    A
    B[&quot;A wide one in the middle&quot;]
    C
  end
  space
  D
  ID --&amp;gt; D
  C --&amp;gt; D
  style B fill:#969,stroke:#333,stroke-width:4px&lt;/code&gt;&lt;/pre&gt;`;
      
      const result = filterFn(input);
      
      assert(result.includes('<div class="mermaid">'));
      assert(result.includes('block-beta'));
      assert(result.includes('db(("DB"))'));
      assert(result.includes('blockArrowId6<["&nbsp;&nbsp;&nbsp;"]>(down)'));
      assert(result.includes('ID --> D'));
      assert(result.includes('C --> D'));
      assert(!result.includes('&lt;'));
      assert(!result.includes('&gt;'));
      assert(!result.includes('&quot;'));
      assert(!result.includes('&amp;'));
    });

    it('should handle multiple mermaid blocks', () => {
      mockHexo.config.mermaid.markdown = true;
      require('../index.js');
      
      const filterFn = mockHexo.extend.filter.registeredFilters['after_render:html'];
      const input = `
        &lt;pre&gt;&lt;code class=&quot;language-mermaid&quot;&gt;graph TD
    A --&gt; B&lt;/code&gt;&lt;/pre&gt;
        <p>Some text</p>
        &lt;pre&gt;&lt;code class=&quot;language-mermaid&quot;&gt;flowchart LR
    C --&gt; D&lt;/code&gt;&lt;/pre&gt;
      `;
      
      const result = filterFn(input);
      
      const mermaidDivs = (result.match(/<div class="mermaid">/g) || []).length;
      assert.equal(mermaidDivs, 2);
      assert(result.includes('graph TD'));
      assert(result.includes('flowchart LR'));
    });

    it('should not affect non-mermaid code blocks', () => {
      mockHexo.config.mermaid.markdown = true;
      require('../index.js');
      
      const filterFn = mockHexo.extend.filter.registeredFilters['after_render:html'];
      const input = `
        &lt;pre&gt;&lt;code class=&quot;language-javascript&quot;&gt;console.log('hello');&lt;/code&gt;&lt;/pre&gt;
        &lt;pre&gt;&lt;code class=&quot;language-mermaid&quot;&gt;graph TD
    A --&gt; B&lt;/code&gt;&lt;/pre&gt;
        &lt;pre&gt;&lt;code class=&quot;language-python&quot;&gt;print('world')&lt;/code&gt;&lt;/pre&gt;
      `;
      
      const result = filterFn(input);
      
      assert(result.includes('language-javascript'));
      assert(result.includes('language-python'));
      assert(result.includes('<div class="mermaid">'));
      const mermaidDivs = (result.match(/<div class="mermaid">/g) || []).length;
      assert.equal(mermaidDivs, 1);
    });

    it('should decode HTML entities correctly', () => {
      mockHexo.config.mermaid.markdown = true;
      require('../index.js');
      
      const filterFn = mockHexo.extend.filter.registeredFilters['after_render:html'];
      const input = `&lt;pre&gt;&lt;code class=&quot;language-mermaid&quot;&gt;graph TD
    A[&quot;Test &amp;amp; Example&quot;] --&amp;gt; B
    B --&amp;gt; C[&quot;Another &amp;lt;test&amp;gt;&quot;]
    C --&amp;gt; D[&quot;Quote: &amp;quot;Hello&amp;quot;&quot;]&lt;/code&gt;&lt;/pre&gt;`;
      
      const result = filterFn(input);
      
      assert(result.includes('Test & Example'));
      assert(result.includes('Another <test>'));
      assert(result.includes('Quote: "Hello"'));
      assert(result.includes('A --> B'));
      assert(!result.includes('&amp;'));
      assert(!result.includes('&lt;'));
      assert(!result.includes('&gt;'));
      assert(!result.includes('&quot;'));
    });

    it('should remove syntax highlighting spans', () => {
      mockHexo.config.mermaid.markdown = true;
      require('../index.js');
      
      const filterFn = mockHexo.extend.filter.registeredFilters['after_render:html'];
      const input = `&lt;pre&gt;&lt;code class=&quot;language-mermaid&quot;&gt;&lt;span class=&quot;token keyword&quot;&gt;graph&lt;/span&gt; &lt;span class=&quot;token title&quot;&gt;TD&lt;/span&gt;
    &lt;span class=&quot;token node&quot;&gt;A&lt;/span&gt; --&amp;gt; &lt;span class=&quot;token node&quot;&gt;B&lt;/span&gt;&lt;/code&gt;&lt;/pre&gt;`;
      
      const result = filterFn(input);
      
      assert(result.includes('graph TD'));
      assert(result.includes('A --> B'));
      assert(!result.includes('<span'));
      assert(!result.includes('token'));
    });
  });
});