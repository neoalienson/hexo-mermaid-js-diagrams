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
      theme: 'default'
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
});