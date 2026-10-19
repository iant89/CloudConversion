# CloudConversion

A TypeScript + React web application modeled after **CloudConvert** that allows uploading any document, video, audio track, image, spreadsheet, vector graphic, or archive and automatically converts it to a selected target file format (e.g., `.AVI → .MP4`, `.DOCX → .PDF`, `.WAV → .MP3`, `.PNG → .WEBP`, `.CSV → .JSON`) with interactive in-browser preview, telemetry, security filtering, and one-click download.

## Key Features

- **Universal File Upload & Automatic Format Detection**:
  - Upload any document or media file from your computer via the **Select File** split button or drag-and-drop.
  - Automatically detects the source file format and selects an intelligent default target format (e.g., `.AVI → .MP4`).
  - Includes one-click sample presets and a **Test Drag, Errors & Ordering** mixed-queue generator.
- **Categorized Target Format Selector Dropdown**:
  - CloudConvert-style searchable popover categorized across **Suggested**, **Video**, **Audio**, **Image**, **Document**, **Spreadsheet**, **Presentation**, **Ebook**, **Archive**, **Vector**, and **Data & Code** (65+ built-in formats plus custom extensions).
- **Responsive Drag-and-Drop Conversion Queue & Strict Ordering Rules**:
  - Drag and drop waiting (unfinished) items to reprioritize the queue, or use accessible Up/Down reorder buttons.
  - **Strict Queue Invariant**: *An unfinished (`queued`) file can never be placed above a `finished`, `cancelled`, `failed`, or `currently converting` file in the list.* Attempting to drag an unfinished item above any locked item displays a visual lock boundary warning and clamps the item to the top of the waiting queue.
- **Interactive Multi-Format Preview Modal (`Binoculars` Icon)**:
  - Preview converted files before downloading with dedicated players and viewers:
    - **Video Player**: HTML5 video playback, seek timeline, playback rate (`0.5x–2x`), mute, and fullscreen.
    - **Audio Player**: Interactive 48-bar waveform seek visualizer, transport controls, and volume slider.
    - **PDF Document Viewer**: Multi-page document reader with zoom controls and raw PDF structure inspector.
    - **Image & Vector Viewer**: Zoom (`50%–300%`), rotation (`90°`), and checkerboard transparency toggle.
    - **Spreadsheet, Code & Archive Inspector**: Tabular grid preview, syntax-formatted source view, and hex byte inspector.
- **File Information, Before/After Statistics & Live Mbps Graph Modal (`Info` Icon)**:
  - Displays before-and-after file sizes, size delta, compression ratio, SHA-256 digest, current status, error diagnostics, and an interactive **SVG Mbps Conversion Rate Graph** plotting average, peak, and step-by-step throughput.
- **Responsive Icon + Text Buttons with Tooltips**:
  - Action buttons adapt to viewport width—displaying both icons and text on larger viewports and automatically collapsing to icon-only buttons with hover/focus `<Tooltip />` labels on smaller viewports.
- **Cancel & Delete Confirmation Dialogs + Persistent Queue History**:
  - Both **Cancel** and **Delete** buttons prompt the user for confirmation before executing.
  - Finished, cancelled, and failed items remain in the queue until explicitly deleted by the user.
- **Tooltip-Style Error Callout & Corruption-Aware Retry**:
  - Failed conversions display a tooltip-style error callout pointing directly at the file entry. If the source document is not corrupted, the user can immediately retry the conversion.
- **Input File Blocking, IP Blocklist & Per-IP Conversion Rate Limiting**:
  - Pre-flight security inspection supporting **Filename Blocking** (plain-text substring or regular expression filters), **SHA-256 Cryptographic File Hash Blocking**, **File Extension / Category / Max Size Blocking**, **IP & CIDR Subnet Blocking**, and **Per-IP Conversion Rate Limiting** (max conversions and MB volume per sliding time window).
- **Action & Conversion History Modal**:
  - Chronological log of all actions taken (e.g., `10/19/26 7:00 AM: Successfully Converted 'pizza.jpeg' to 'pizza.png'`, downloads, deletions, blocked files, cancellations, and queue updates) with job completion icons, category filter pills, and a search bar at the top.
  - Blocked file events intentionally omit the specific block reason/detection method to prevent circumvention.
- **GitHub Pages Deployment Workflow**:
  - Automated build and deployment via `.github/workflows/deploy.yml`.

## Getting Started

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```
