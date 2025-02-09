A tool for creating, editing, and managing OpenAI fine-tuning datasets.

## Core Features
- Create and edit conversation pairs for fine-tuning
- Manage system instructions to test different prompting strategies
- Export conversations in JSONL format for OpenAI fine-tuning
- Import existing fine-tuning datasets for editing

## Working with Messages
- Each user/assistant pair forms a training example
- Edit messages to refine the training data
- Reorder conversation pairs by dragging user messages
- Delete a message pair to remove it from the dataset
- Click assistant/system messages to view full content in a modal

## System Instructions
System instructions help define the assistant's behavior:
- Add multiple instructions to test different prompting approaches
- Reorder to experiment with instruction priority
- Export included in the training data
- Useful for testing different personality traits or constraints

## Dataset Management
- Export your dataset as JSON (compatible with OpenAI's format)
- Import existing JSONL files for editing
- Use undo/redo to track changes (CMD/Ctrl + Z)
- Reset to start a new dataset

## Keyboard Shortcuts
- Save Edits: CMD/Ctrl + Enter
- Undo Change: CMD/Ctrl + Z
- Redo Change: CMD/Ctrl + Shift + Z
- New Line: Shift + Enter

## Tips for Fine-tuning
- Keep system instructions clear and specific
- Test variations of the same instruction
- Ensure consistent formatting across examples
- Review full conversations for coherence
- Export regularly to backup your dataset