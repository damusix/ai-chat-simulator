interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    conversationId?: string;
}

interface SystemMessage {
    id: string;
    content: string;
}

declare const markdownIt: any;
declare const hljs: any;

interface ChatState {
    messages: ChatMessage[];
    systemMessages: SystemMessage[];
    title: string;
}

class StateManager {
    private states: ChatState[] = [];
    private currentIndex: number = -1;
    private maxStates: number = 10;

    push(state: ChatState) {
        // Remove any future states if we're in the middle of the history
        if (this.currentIndex < this.states.length - 1) {
            this.states = this.states.slice(0, this.currentIndex + 1);
        }

        // Add new state
        this.states.push(JSON.parse(JSON.stringify(state)));
        this.currentIndex++;

        // Remove oldest state if we exceed maxStates
        if (this.states.length > this.maxStates) {
            this.states.shift();
            this.currentIndex--;
        }
    }

    canUndo(): boolean {
        return this.currentIndex > 0;
    }

    canRedo(): boolean {
        return this.currentIndex < this.states.length - 1;
    }

    undo(): ChatState | null {
        if (!this.canUndo()) return null;
        this.currentIndex--;
        return JSON.parse(JSON.stringify(this.states[this.currentIndex]));
    }

    redo(): ChatState | null {
        if (!this.canRedo()) return null;
        this.currentIndex++;
        return JSON.parse(JSON.stringify(this.states[this.currentIndex]));
    }
}

class AIChatHistory {
    private messages: ChatMessage[] = [];
    private textarea: HTMLTextAreaElement;
    private sendButton: HTMLButtonElement;
    private chatHistory: HTMLElement;
    private systemMessages: HTMLElement;
    private addSystemButton: HTMLElement;
    private readonly STORAGE_KEY = 'ai-chat-history';
    private readonly SYSTEM_STORAGE_KEY = 'ai-system-messages';
    private readonly TITLE_STORAGE_KEY = 'ai-chat-title';
    private md: any;
    private importInput: HTMLInputElement;
    private exportButton: HTMLButtonElement;
    private resetButton: HTMLButtonElement;
    private chatTitle: HTMLElement;
    private importButton: HTMLButtonElement;
    private stateManager: StateManager;
    private undoButton: HTMLButtonElement;
    private redoButton: HTMLButtonElement;
    private helpButton: HTMLButtonElement;
    private helpContent: string = '';
    private readonly FIRST_VISIT_KEY = 'ai-chat-first-visit';

    constructor() {
        this.textarea = document.getElementById('userInput') as HTMLTextAreaElement;
        this.sendButton = document.getElementById('sendButton') as HTMLButtonElement;
        this.chatHistory = document.getElementById('chatHistory') as HTMLElement;
        this.systemMessages = document.getElementById('systemMessages') as HTMLElement;
        this.addSystemButton = document.getElementById('addSystemButton') as HTMLElement;
        this.importInput = document.getElementById('importInput') as HTMLInputElement;
        this.exportButton = document.getElementById('exportButton') as HTMLButtonElement;
        this.resetButton = document.getElementById('resetButton') as HTMLButtonElement;
        this.chatTitle = document.getElementById('chatTitle') as HTMLElement;
        this.importButton = document.getElementById('importButton') as HTMLButtonElement;
        this.undoButton = document.getElementById('undoButton') as HTMLButtonElement;
        this.redoButton = document.getElementById('redoButton') as HTMLButtonElement;
        this.helpButton = document.getElementById('helpButton') as HTMLButtonElement;
        this.stateManager = new StateManager();

        // Configure markdown-it with highlight.js
        this.md = new markdownIt({
            highlight: function (str: string, lang: string) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(str, { language: lang }).value;
                    } catch (__) {}
                }
                return ''; // use external default escaping
            }
        });

        this.loadFromStorage();
        this.loadSystemMessages();
        this.loadTitle();
        this.loadHelpContent().then(() => {
            this.checkFirstVisit();
        });
        this.setupEventListeners();
        this.saveCurrentState(); // Save initial state
    }

    private loadFromStorage() {
        const savedHistory = localStorage.getItem(this.STORAGE_KEY);
        if (savedHistory) {
            this.messages = JSON.parse(savedHistory);
            // Render existing messages
            this.messages.forEach(message => this.addMessage(message, false));
        }
    }

    private loadSystemMessages() {
        const savedMessages = localStorage.getItem(this.SYSTEM_STORAGE_KEY);
        if (savedMessages) {
            try {
                const systemMessages = JSON.parse(savedMessages);
                // Clear existing system messages
                this.systemMessages.innerHTML = '';
                // Add each saved system message
                systemMessages.forEach((content: string) => {
                    if (content.trim()) {
                        this.addSystemMessage(content);
                    }
                });
            } catch (error) {
                console.error('Error loading system messages:', error);
            }
        }
    }

    private loadTitle() {
        const savedTitle = localStorage.getItem(this.TITLE_STORAGE_KEY);
        if (savedTitle) {
            this.chatTitle.textContent = savedTitle;
        }
    }

    private async loadHelpContent() {
        try {
            const response = await fetch('./assets/help.md');
            this.helpContent = await response.text();
        } catch (error) {
            console.error('Error loading help content:', error);
            this.helpContent = 'Error loading help content. Please try again later.';
        }
    }

    private checkFirstVisit() {
        const hasVisited = localStorage.getItem(this.FIRST_VISIT_KEY);
        if (!hasVisited) {
            // Show help modal
            this.showHelpModal();
            // Mark as visited
            localStorage.setItem(this.FIRST_VISIT_KEY, 'true');
        }
    }

    private saveToStorage() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.messages));
    }

    private getDragAfterElement(container: HTMLElement, y: number) {
        const draggableElements = [
            ...container.querySelectorAll('.user-message:not(.dragging)')
        ];

        return draggableElements.reduce(
            (closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset, element: child as HTMLElement };
                } else {
                    return closest;
                }
            },
            { offset: Number.NEGATIVE_INFINITY } as { offset: number; element?: HTMLElement }
        ).element;
    }

    private setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.handleSubmit());

        // Update the textarea keydown handler to include CMD/Ctrl + Enter
        this.textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                this.handleSubmit();
            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                this.handleSubmit();
            }
        });

        this.addSystemButton.addEventListener('click', () => {
            this.addSystemMessage('');
        });

        // Export button
        this.exportButton.addEventListener('click', () => this.exportChat());

        // Import button
        this.importButton.addEventListener('click', () => {
            this.importInput.click();
        });

        // Import input change
        this.importInput.addEventListener('change', (e) => this.handleImport(e));

        // Reset button
        this.resetButton.addEventListener('click', () => this.resetChat());

        // Chat title
        this.chatTitle.addEventListener('click', () => this.makeEditableTitle());

        // Undo/Redo buttons
        this.undoButton.addEventListener('click', () => this.undo());
        this.redoButton.addEventListener('click', () => this.redo());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger if we're in an input/textarea
            if (document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            // Undo: Ctrl+Z or Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            // Redo: Ctrl+Shift+Z or Cmd+Shift+Z
            else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey) {
                e.preventDefault();
                this.redo();
            }
        });

        // Add drag event listeners to the chat history container
        this.chatHistory.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggable = this.chatHistory.querySelector('.dragging') as HTMLElement;
            if (!draggable) return;

            // Remove previous drop target indicator
            this.chatHistory.querySelectorAll('.drop-target').forEach(el => {
                el.classList.remove('drop-target');
            });

            const afterElement = this.getDragAfterElement(this.chatHistory, e.clientY);
            if (afterElement) {
                // Add drop target indicator
                afterElement.classList.add('drop-target');
                this.chatHistory.insertBefore(draggable, afterElement);
            } else {
                this.chatHistory.appendChild(draggable);
            }
        });

        // Add dragend listener to clean up drop target indicators
        this.chatHistory.addEventListener('dragend', () => {
            this.chatHistory.querySelectorAll('.drop-target').forEach(el => {
                el.classList.remove('drop-target');
            });
        });

        // Add drag event listeners to the system messages container
        this.systemMessages.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggable = this.systemMessages.querySelector('.system-message.dragging') as HTMLElement;
            if (!draggable) return;

            // Remove previous drop target indicator
            this.systemMessages.querySelectorAll('.drop-target').forEach(el => {
                el.classList.remove('drop-target');
            });

            const afterElement = this.getSystemDragAfterElement(this.systemMessages, e.clientY);
            if (afterElement) {
                afterElement.classList.add('drop-target');
                this.systemMessages.insertBefore(draggable, afterElement);
            } else {
                this.systemMessages.appendChild(draggable);
            }
        });

        // Clean up drop targets when drag ends
        this.systemMessages.addEventListener('dragend', () => {
            this.systemMessages.querySelectorAll('.drop-target').forEach(el => {
                el.classList.remove('drop-target');
            });
        });

        // Help button
        this.helpButton.addEventListener('click', () => {
            this.showHelpModal();
        });
    }

    private generateConversationId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private handleSubmit() {
        const content = this.textarea.value.trim();
        if (!content) return;

        const conversationId = this.generateConversationId();

        // Add user message with conversation ID
        this.addMessage({ role: 'user', content, conversationId }, true);

        // Add an editable assistant response area with the same conversation ID
        const assistantTextarea = this.addEditableAssistantResponse(conversationId);
        assistantTextarea.focus();

        // Clear input
        this.textarea.value = '';
        this.textarea.style.height = '24px';
        this.saveCurrentState();
    }

    private addEditableAssistantResponse(conversationId: string) {
        // Get and clone the template
        const template = document.getElementById('assistant-draft-template') as HTMLTemplateElement;
        const messageDiv = template.content.cloneNode(true) as HTMLElement;
        const messageElement = messageDiv.firstElementChild as HTMLElement;

        // Set conversation ID
        const idDisplay = messageElement.querySelector('.conversation-id');
        if (idDisplay && conversationId) {
            idDisplay.textContent = conversationId.slice(-6);
        }
        messageElement.dataset.conversationId = conversationId;

        // Get references to key elements
        const textarea = messageElement.querySelector('.assistant-input') as HTMLTextAreaElement;
        const saveButton = messageElement.querySelector('button.primary') as HTMLButtonElement;

        // Handle save
        saveButton.addEventListener('click', () => {
            const content = textarea.value.trim();
            if (!content) return;

            messageElement.remove();

            // Add the saved message with the same conversation ID
            this.addMessage({ role: 'assistant', content, conversationId }, true);

            this.textarea.focus();
            this.saveCurrentState();
        });

        // Add CMD/Ctrl + Enter handler
        textarea.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                saveButton.click();
            }
        });

        this.chatHistory.appendChild(messageElement);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;

        return textarea;
    }

    private addMessage(message: ChatMessage, shouldSave: boolean = true) {
        if (shouldSave) {
            this.messages.push(message);
            this.saveToStorage();
        }

        // Get appropriate template
        const templateId = message.role === 'user' ? 'user-message-template' : 'assistant-message-template';
        const template = document.getElementById(templateId) as HTMLTemplateElement;
        const messageDiv = template.content.cloneNode(true) as HTMLElement;
        const messageElement = messageDiv.firstElementChild as HTMLElement;

        // Set conversation ID if it exists
        if (message.conversationId) {
            const idDisplay = messageElement.querySelector('.conversation-id');
            if (idDisplay) {
                idDisplay.textContent = message.conversationId.slice(-6);
            }
            messageElement.dataset.conversationId = message.conversationId;
        }

        // Set up drag functionality for user messages
        if (message.role === 'user') {
            messageElement.draggable = true;
            messageElement.addEventListener('dragstart', () => {
                messageElement.classList.add('dragging');
            });
            messageElement.addEventListener('dragend', () => {
                messageElement.classList.remove('dragging');
                this.reorderMessages();
            });
        }

        // Set content
        const content = messageElement.querySelector('.message-content') as HTMLElement;
        content.innerHTML = this.md.render(message.content);

        // Apply syntax highlighting
        content.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        // Add event listeners
        const editButton = messageElement.querySelector('button.primary');
        const deleteButton = messageElement.querySelector('button.destructive');

        if (editButton) {
            editButton.addEventListener('click', () => {
                this.makeMessageEditable(messageElement, content, message);
            });
        }

        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                const isConfirmed = confirm(
                    'Are you sure you want to delete this message and all following messages? This action cannot be undone.'
                );
                if (isConfirmed) {
                    this.deleteMessageAndFollowing(message, messageElement);
                }
            });
        }

        // Add hover effects for conversation pairs
        if (message.conversationId) {
            messageElement.addEventListener('mouseenter', () => {
                const relatedMessages = this.chatHistory.querySelectorAll(
                    `.message[data-conversation-id="${message.conversationId}"]`
                );
                relatedMessages.forEach(msg => msg.classList.add('highlight-pair'));
            });

            messageElement.addEventListener('mouseleave', () => {
                this.chatHistory.querySelectorAll('.highlight-pair')
                    .forEach(msg => msg.classList.remove('highlight-pair'));
            });
        }

        this.chatHistory.appendChild(messageElement);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;

        if (shouldSave) {
            this.saveCurrentState();
        }

        // Add click handler for modal (only for assistant messages)
        if (message.role === 'assistant') {
            content.addEventListener('click', () => {
                this.showMessageInModal(message);
            });
        }
    }

    private deleteMessageAndFollowing(message: ChatMessage, messageDiv: HTMLElement) {
        // Find the index of the message to delete
        const index = this.messages.indexOf(message);
        if (index === -1) return;

        // Remove this message and all following messages from the array
        this.messages.splice(index);
        this.saveToStorage();

        // Remove all messages from this point onwards in the UI
        let currentElement: HTMLElement | null = messageDiv;
        while (currentElement) {
            const nextElement = currentElement.nextElementSibling as HTMLElement;
            currentElement.remove();
            currentElement = nextElement;
        }

        console.log(JSON.stringify(this.messages, null, 2));
        this.saveCurrentState();
    }

    private makeMessageEditable(
        messageDiv: HTMLElement,
        contentDiv: HTMLElement,
        message: ChatMessage
    ) {
        messageDiv.classList.add('editing');

        // Get and clone the template
        const template = document.getElementById('message-edit-template') as HTMLTemplateElement;
        const editContainer = template.content.cloneNode(true) as HTMLElement;
        const container = editContainer.firstElementChild as HTMLElement;

        // Get references to elements
        const textarea = container.querySelector('.edit-textarea') as HTMLTextAreaElement;
        const saveButton = container.querySelector('button.primary') as HTMLButtonElement;
        const cancelButton = container.querySelector('button:not(.primary)') as HTMLButtonElement;

        // Set initial content
        textarea.value = message.content;

        // Add CMD/Ctrl + Enter handler
        textarea.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                saveButton.click();
            }
        });

        // Add event listeners
        saveButton.addEventListener('click', () => {
            const newContent = textarea.value.trim();
            if (newContent) {
                message.content = newContent;
                contentDiv.innerHTML = this.md.render(newContent);

                // Apply highlighting to any code blocks
                contentDiv.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });

                contentDiv.style.display = 'block';
                container.remove();
                messageDiv.classList.remove('editing');
                this.saveToStorage();
                console.log(JSON.stringify(this.messages, null, 2));
            }
            this.saveCurrentState();
        });

        cancelButton.addEventListener('click', () => {
            messageDiv.classList.remove('editing');
            contentDiv.style.display = 'block';
            container.remove();
        });

        // Hide content and show edit form
        contentDiv.style.display = 'none';
        messageDiv.appendChild(container);
        textarea.focus();
    }

    private reorderMessages() {
        const newMessages: ChatMessage[] = [];
        const processedIds = new Set<string>();

        // Get all user messages in their current order
        const userMessages = Array.from(this.chatHistory.querySelectorAll('.user-message')) as HTMLElement[];

        userMessages.forEach(userMsg => {
            const conversationId = userMsg.dataset.conversationId;
            if (!conversationId || processedIds.has(conversationId)) return;

            // Find the user message in the original array
            const userMessage = this.messages.find(m =>
                m.role === 'user' && m.conversationId === conversationId);

            // Find the corresponding assistant message
            const assistantMessage = this.messages.find(m =>
                m.role === 'assistant' && m.conversationId === conversationId);

            if (userMessage) {
                newMessages.push(userMessage);
                if (assistantMessage) {
                    newMessages.push(assistantMessage);
                }
            }

            processedIds.add(conversationId);
        });

        // Update the messages array
        this.messages = newMessages;

        // Redraw all messages
        this.chatHistory.innerHTML = '';
        this.messages.forEach(message => this.addMessage(message, false));

        this.saveToStorage();
        this.saveCurrentState();
    }

    // Add method to clear history
    clearHistory() {
        this.messages = [];
        this.chatHistory.innerHTML = '';
        this.saveToStorage();
        this.saveCurrentState();
    }

    // Method to export chat history
    exportHistory(): ChatMessage[] {
        // Get all system messages
        const systemMessages = Array.from(this.systemMessages.querySelectorAll('textarea'))
            .map(textarea => textarea.value.trim())
            .filter(content => content.length > 0)
            .map(content => ({ role: 'system' as const, content }));

        // Combine system messages with chat messages
        return [...systemMessages, ...this.messages];
    }

    private generateSystemId(): string {
        return 'sys_' + Math.random().toString(36).substr(2, 6);
    }

    private addSystemMessage(content: string = '', existingId?: string, skipStateSave: boolean = false) {
        const systemId = existingId || this.generateSystemId();

        // Get and clone the template
        const template = document.getElementById('system-message-template') as HTMLTemplateElement;
        const messageDiv = template.content.cloneNode(true) as HTMLElement;
        const messageElement = messageDiv.firstElementChild as HTMLElement;

        // Set system ID
        messageElement.dataset.systemId = systemId;
        const idDisplay = messageElement.querySelector('.system-id');
        if (idDisplay) {
            idDisplay.textContent = systemId.slice(-6);
        }

        // Get references to key elements
        const displayDiv = messageElement.querySelector('.system-message-display') as HTMLElement;
        const editDiv = messageElement.querySelector('.system-message-edit') as HTMLElement;
        const contentDisplay = messageElement.querySelector('.system-message-content') as HTMLElement;
        const textarea = editDiv.querySelector('textarea') as HTMLTextAreaElement;
        const editButton = displayDiv.querySelector('button.primary') as HTMLButtonElement;
        const saveButton = editDiv.querySelector('button.primary') as HTMLButtonElement;
        const cancelButton = editDiv.querySelector('button:not(.primary):not(.destructive)') as HTMLButtonElement;
        const deleteButton = editDiv.querySelector('button.destructive') as HTMLButtonElement;

        // Set initial content
        textarea.value = content;
        contentDisplay.textContent = content;

        // Show/hide appropriate divs based on content
        displayDiv.style.display = content ? 'block' : 'none';
        editDiv.style.display = content ? 'none' : 'block';

        // Add event listeners
        editButton.addEventListener('click', () => {
            displayDiv.style.display = 'none';
            editDiv.style.display = 'block';
            textarea.focus();
        });

        const saveContent = () => {
            const newContent = textarea.value.trim();
            if (newContent) {
                contentDisplay.textContent = newContent;
                displayDiv.style.display = 'block';
                editDiv.style.display = 'none';
                this.saveSystemMessages();
            }
        };

        saveButton.addEventListener('click', saveContent);

        cancelButton.addEventListener('click', () => {
            if (!content) {
                messageElement.remove();
            } else {
                textarea.value = content;
                displayDiv.style.display = 'block';
                editDiv.style.display = 'none';
            }
        });

        deleteButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this system instruction?')) {
                messageElement.remove();
                this.saveSystemMessages();
            }
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                saveContent();
            } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                saveContent();
            }
        });

        // Add drag event listeners
        messageElement.addEventListener('dragstart', () => {
            messageElement.classList.add('dragging');
        });

        messageElement.addEventListener('dragend', () => {
            messageElement.classList.remove('dragging');
            this.saveSystemMessages();
            if (!skipStateSave) {
                this.saveCurrentState();
            }
        });

        this.systemMessages.appendChild(messageElement);
        if (!content) {
            textarea.focus();
        }
        if (!skipStateSave) {
            this.saveCurrentState();
        }

        // Add click handler for modal
        contentDisplay.addEventListener('click', () => {
            this.showMessageInModal({ role: 'system', content: textarea.value });
        });
    }

    private saveSystemMessages() {
        try {
            const messages = Array.from(this.systemMessages.querySelectorAll('textarea'))
                .map(textarea => textarea.value.trim())
                .filter(content => content.length > 0);
            localStorage.setItem(this.SYSTEM_STORAGE_KEY, JSON.stringify(messages));
            console.log('System messages saved:', messages);
        } catch (error) {
            console.error('Error saving system messages:', error);
        }
    }

    private exportChat() {
        // Get system messages
        const systemMessages = Array.from(this.systemMessages.querySelectorAll('textarea'))
            .map(textarea => textarea.value.trim())
            .filter(content => content.length > 0)
            .map(content => ({
                role: 'system' as const,
                content
            }));

        // Create export data object with title and messages
        const exportData = {
            title: this.chatTitle.textContent || 'Untitled Chat',
            messages: [...systemMessages, ...this.messages]
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    private handleImport(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        const confirmImport = confirm(
            'Importing will replace your current chat history and system instructions. Are you sure you want to continue?'
        );

        if (!confirmImport) {
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target?.result as string);

                // Handle both array format and object format with title
                const messages = Array.isArray(importData) ? importData : importData.messages;
                const title = Array.isArray(importData) ? 'Imported Chat' : (importData.title || 'Imported Chat (No Title)');

                if (!Array.isArray(messages)) {
                    throw new Error('Invalid import format: messages must be an array');
                }

                // Validate message format
                const isValidMessage = (msg: any): msg is ChatMessage => {
                    return msg
                        && typeof msg === 'object'
                        && (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system')
                        && typeof msg.content === 'string';
                };

                if (!messages.every(isValidMessage)) {
                    throw new Error('Invalid message format in import file');
                }

                // Clear existing data
                this.messages = [];
                this.chatHistory.innerHTML = '';
                this.systemMessages.innerHTML = '';

                // Set title
                this.chatTitle.textContent = title;
                localStorage.setItem(this.TITLE_STORAGE_KEY, title);

                // Separate system messages from chat messages
                const systemMessages = messages.filter(msg => msg.role === 'system');
                const chatMessages = messages.filter(msg => msg.role !== 'system');

                // Import system messages
                systemMessages.forEach(msg => {
                    if (msg.content.trim()) {
                        this.addSystemMessage(msg.content);
                    }
                });

                // Import chat messages
                chatMessages.forEach(message => {
                    this.addMessage(message, false);
                });
                this.messages = chatMessages;
                this.saveToStorage();

                console.log('Import successful');
                alert('Chat imported successfully!');
            } catch (error) {
                console.error('Error importing chat:', error);
                alert(`Error importing chat: ${error instanceof Error ? error.message : 'Invalid file format'}`);
            }

            // Clear the input
            input.value = '';
        };

        reader.onerror = () => {
            alert('Error reading file');
            input.value = '';
        };

        reader.readAsText(file);
    }

    private resetChat() {
        const confirmReset = confirm(
            'Are you sure you want to reset? This will clear all messages and system instructions.'
        );

        if (confirmReset) {
            // Clear messages
            this.messages = [];
            this.chatHistory.innerHTML = '';
            this.saveToStorage();

            // Clear system instructions
            this.systemMessages.innerHTML = '';
            this.saveSystemMessages();

            // Reset title
            this.chatTitle.textContent = 'Untitled Chat';
            localStorage.removeItem(this.TITLE_STORAGE_KEY);

            console.log('Chat reset complete');
            this.saveCurrentState();
        }
    }

    private makeEditableTitle() {
        const currentTitle = this.chatTitle.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentTitle || '';
        input.className = 'chat-title-input';

        const saveTitle = () => {
            const newTitle = input.value.trim() || 'Untitled Chat';
            this.chatTitle.textContent = newTitle;
            localStorage.setItem(this.TITLE_STORAGE_KEY, newTitle);
            this.saveCurrentState(); // Save state after title change
        };

        input.addEventListener('blur', () => {
            saveTitle();
            this.chatTitle.removeChild(input);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveTitle();
                this.chatTitle.removeChild(input);
            } else if (e.key === 'Escape') {
                this.chatTitle.textContent = currentTitle;
                this.chatTitle.removeChild(input);
            }
        });

        this.chatTitle.textContent = '';
        this.chatTitle.appendChild(input);
        input.focus();
        input.select();
    }

    private saveCurrentState() {
        const currentState: ChatState = {
            messages: [...this.messages],
            systemMessages: Array.from(this.systemMessages.querySelectorAll('.system-message'))
                .map(div => ({
                    id: (div as HTMLElement).dataset.systemId || this.generateSystemId(),
                    content: (div.querySelector('textarea') as HTMLTextAreaElement).value.trim()
                }))
                .filter(msg => msg.content.length > 0),
            title: this.chatTitle.textContent || 'Untitled Chat'
        };
        this.stateManager.push(currentState);
        this.updateUndoRedoButtons();
    }

    private updateUndoRedoButtons() {
        this.undoButton.disabled = !this.stateManager.canUndo();
        this.redoButton.disabled = !this.stateManager.canRedo();
    }

    private undo() {
        const previousState = this.stateManager.undo();
        if (previousState) {
            this.applyState(previousState);
            this.updateUndoRedoButtons();
        }
    }

    private redo() {
        const nextState = this.stateManager.redo();
        if (nextState) {
            this.applyState(nextState);
            this.updateUndoRedoButtons();
        }
    }

    private applyState(state: ChatState) {
        // Update title
        this.chatTitle.textContent = state.title;
        localStorage.setItem(this.TITLE_STORAGE_KEY, state.title);

        // Update messages
        this.messages = [...state.messages];
        this.chatHistory.innerHTML = '';
        this.messages.forEach(message => this.addMessage(message, false));
        this.saveToStorage();

        // Update system messages
        this.systemMessages.innerHTML = '';
        state.systemMessages.forEach(msg => {
            this.addSystemMessage(msg.content, msg.id, true);
        });

        // Save to storage without creating new states
        localStorage.setItem(this.SYSTEM_STORAGE_KEY, JSON.stringify(
            state.systemMessages.map(msg => msg.content)
        ));
    }

    private getSystemDragAfterElement(container: HTMLElement, y: number) {
        const draggableElements = [
            ...container.querySelectorAll('.system-message:not(.dragging)')
        ];

        return draggableElements.reduce(
            (closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset, element: child as HTMLElement };
                } else {
                    return closest;
                }
            },
            { offset: Number.NEGATIVE_INFINITY } as { offset: number; element?: HTMLElement }
        ).element;
    }

    private showMessageInModal(message: ChatMessage) {
        // Get and clone the template
        const template = document.getElementById('message-modal-template') as HTMLTemplateElement;
        const modalDiv = template.content.cloneNode(true) as HTMLElement;
        const modal = modalDiv.firstElementChild as HTMLElement;

        // Get references to elements
        const title = modal.querySelector('.modal-title') as HTMLElement;
        const content = modal.querySelector('.modal-content') as HTMLElement;
        const closeButton = modal.querySelector('.modal-close') as HTMLButtonElement;

        // Set content
        title.textContent = `${message.role.charAt(0).toUpperCase() + message.role.slice(1)} Message`;
        content.innerHTML = this.md.render(message.content);

        // Apply syntax highlighting
        content.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        // Handle close
        const closeModal = () => {
            modal.remove();
        };

        closeButton.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        }, { once: true });

        document.body.appendChild(modal);
    }

    private showHelpModal() {
        // Get and clone the template
        const template = document.getElementById('message-modal-template') as HTMLTemplateElement;
        const modalDiv = template.content.cloneNode(true) as HTMLElement;
        const modal = modalDiv.firstElementChild as HTMLElement;

        // Get references to elements
        const title = modal.querySelector('.modal-title') as HTMLElement;
        const content = modal.querySelector('.modal-content') as HTMLElement;
        const closeButton = modal.querySelector('.modal-close') as HTMLButtonElement;

        // Set content
        title.textContent = 'AI Chat Simulator';
        content.innerHTML = this.md.render(this.helpContent);

        // Handle close
        const closeModal = () => {
            modal.remove();
        };

        closeButton.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        }, { once: true });

        document.body.appendChild(modal);
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const chat = new AIChatHistory();

    // Make chat instance available globally for debugging
    (window as any).chat = chat;
});
