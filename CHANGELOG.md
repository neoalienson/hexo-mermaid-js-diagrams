# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-14

### Added
- Markdown code fence syntax support with `markdown: true` configuration option
- Standard ````mermaid code block syntax alongside existing `{% mermaid %}` tag syntax
- HTML entity decoding for syntax-highlighted mermaid blocks
- Automatic removal of syntax highlighting spans from processed content

### Changed
- Updated regex pattern to handle various HTML structures from syntax highlighters
- Enhanced after_render:html filter to process Prism.js highlighted code blocks

## [1.0.2] - 2025-11-09

### Added
- Fullscreen button (⛶) that expands diagram to fullscreen mode
- Fullscreen mode with close button (✕) to exit
- 20px right margin on controls in fullscreen mode to prevent scrollbar overlap

### Changed
- Control button position resets to config position when toggling fullscreen

## [1.0.1] - 2025-11-09

### Fixed
- Fixed zoom level reset bug when dragging diagrams - scale state now preserved across drag operations
- Fixed syntax error in inline onclick handlers by migrating to event delegation with data-action attributes
- Fixed diagram jump issue after reset - translate position variables now properly reset to 0

### Changed
- Refactored helper functions (generateStyles, generateLiveScript) into separate module for better testability
- Improved code maintainability by extracting inline styles and scripts into reusable functions

### Added
- Unit tests for helper functions with 100% coverage
- Test coverage for zoom-drag-reset behavior
- jsdom as dev dependency for DOM testing

## [1.0.0] - 2025-11-08

### Added
- Interactive controls with emoji icons (🔍 zoom in, 🔎 zoom out, ↺ reset, 💾 download SVG)
- Configurable control button positioning (top-left, top-right, bottom-left, bottom-right)
- Draggable control buttons for repositioning
- Draggable diagram functionality using CSS transform translate
- Configurable diagram container width
- Debug mode with comprehensive console logging
- Support for HTML entity conversion in downloaded SVGs (fixes XML parsing errors)

### Changed
- Renamed package from `hexo-mermaid-js-diagrams` to `hexo-plugin-mermaid-js-diagrams`
- Changed overflow from `auto` to `hidden` to remove scrollbars while maintaining drag functionality
- Refactored scripts to use multiline template literals for better readability
- Updated repository URL to https://github.com/neoalienson/hexo-plugin-mermaid-js-diagrams

### Fixed
- Fixed `&nbsp;` entity error in downloaded SVG files by converting to `&#160;`
- Fixed debug mode to use transform-based dragging instead of scroll-based

## [0.0.6]

### Added
- Configurable filter priority with `priority` option

### Changed
- Filter priority now reads from config (default: 0)

## [0.0.5]

### Changed
- Upgraded to Mermaid 10.9.1
- Added support for puppeteer and live render modes
