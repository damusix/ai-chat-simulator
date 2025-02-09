# AI Chat Simulator

A simple GUI tool for creating and editing OpenAI fine-tuning datasets. Built with vanilla JavaScript/TypeScript and basic DOM manipulation - intentionally keeping it simple.

Go to [https://damusix.github.io/ai-chat-simulator/](https://damusix.github.io/ai-chat-simulator/) to use the tool.

## Purpose

This tool provides a visual interface for creating and managing training data for OpenAI's fine-tuning API. Instead of manually editing JSONL files, you can:

- Create and edit conversation pairs visually
- Test different system instructions
- Reorder conversations via drag-and-drop
- Export data in OpenAI's required format

## Features

- **No Framework**: Just HTML, CSS, and TypeScript
- **Simple Setup**: Single page application with basic DOM manipulation
- **Visual Editing**:
  - Drag-and-drop reordering
  - Inline message editing
  - Markdown support with syntax highlighting
  - Modal views for long messages
- **Dataset Management**:
  - Import/export functionality
  - Undo/redo support
  - Local storage persistence
- **System Instructions**: Test different prompting approaches

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Deploy to GitHub Pages
pnpm pages
```

## Project Structure

```
src/
├── client/           # Client-side code (deployed to GH Pages)
│   ├── assets/
│   │   ├── index.ts    # Main application logic
│   │   ├── styles.css  # Styles
│   │   └── help.md     # Help documentation
│   └── index.html      # Main HTML file
└── server/           # Simple development server
```

## Usage

1. **System Instructions**
   - Add instructions to guide the assistant's behavior
   - Reorder to test different instruction combinations
   - Instructions are included in the exported dataset

2. **Creating Conversations**
   - Type user messages and assistant responses
   - Edit messages at any time
   - Drag user messages to reorder conversation pairs
   - Messages support markdown formatting

3. **Managing Datasets**
   - Export your conversations as JSONL
   - Import existing datasets for editing
   - Use undo/redo for safety
   - Data persists in local storage

4. **Keyboard Shortcuts**
   - CMD/Ctrl + Enter: Save edits
   - CMD/Ctrl + Z: Undo
   - CMD/Ctrl + Shift + Z: Redo
   - Shift + Enter: New line in messages

## Why So Simple?

This project intentionally avoids complex frameworks or build setups. The goal is to provide a straightforward tool for working with fine-tuning datasets, focusing on functionality over architectural sophistication. Benefits of this approach:

- **Easy to Understand**: Simple DOM manipulation and event handling
- **No Build Complexity**: Minimal dependencies and build steps
- **Quick to Modify**: Easy to customize for specific needs
- **Fast Loading**: No heavy framework overhead
- **Offline Capable**: Works without internet after initial load

## Contributing

Feel free to open issues or submit PRs. The project aims to maintain its simplicity while improving functionality.

## License

MIT
