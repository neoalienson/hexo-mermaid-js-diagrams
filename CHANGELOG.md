# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-08

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
