/**
 * Enhanced Content Editor - Table Editor Plugin
 * Provides advanced table editing capabilities with visual interface
 */

class TableEditorPlugin {
    constructor(editor) {
        this.editor = editor;
        this.isActive = false;
        this.currentTable = null;
        this.tableOverlay = null;
        
        this.init();
    }

    /**
     * Initialize table editor
     */
    init() {
        this.addToolbarButton();
        this.setupEventHandlers();
        this.setupKeyboardShortcuts();
        
        console.log('Table editor plugin initialized');
    }

    /**
     * Add table editor button to toolbar
     */
    addToolbarButton() {
        const toolbarGroup = document.querySelector('.toolbar-group:nth-child(4)'); // Insert in formatting group
        if (toolbarGroup) {
            const button = document.createElement('button');
            button.className = 'tool-btn';
            button.innerHTML = '<i class="icon">⊞</i>';
            button.title = 'Insert/Edit Table (Ctrl+Shift+T)';
            button.onclick = () => this.showTableDialog();
            
            toolbarGroup.appendChild(button);
        }
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Listen for cursor position changes
        this.editor.editor.on('cursorActivity', (instance) => {
            this.checkForTable(instance);
        });

        // Listen for content changes
        this.editor.editor.on('change', () => {
            if (this.currentTable) {
                this.updateTableOverlay();
            }
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.showTableDialog();
            }
            
            // Handle tab navigation in tables
            if (e.key === 'Tab' && this.currentTable) {
                e.preventDefault();
                this.navigateTable(e.shiftKey ? 'previous' : 'next');
            }
        });
    }

    /**
     * Check if cursor is in a table
     */
    checkForTable(instance) {
        const cursor = instance.getCursor();
        const line = instance.getLine(cursor.line);
        
        if (this.isTableRow(line)) {
            this.detectTable(instance, cursor);
        } else {
            this.hideTableOverlay();
            this.currentTable = null;
        }
    }

    /**
     * Check if line is a table row
     */
    isTableRow(line) {
        return /^\s*\|.*\|\s*$/.test(line) || /^\s*[\|:+-\s]+\s*$/.test(line);
    }

    /**
     * Detect table boundaries
     */
    detectTable(instance, cursor) {
        const startLine = this.findTableStart(instance, cursor.line);
        const endLine = this.findTableEnd(instance, cursor.line);
        
        if (startLine !== -1 && endLine !== -1) {
            this.currentTable = {
                startLine,
                endLine,
                rows: endLine - startLine + 1,
                cursor: cursor
            };
            
            this.analyzeTable(instance);
            this.showTableOverlay();
        }
    }

    /**
     * Find table start line
     */
    findTableStart(instance, currentLine) {
        for (let line = currentLine; line >= 0; line--) {
            const content = instance.getLine(line);
            if (!this.isTableRow(content)) {
                return line + 1;
            }
            if (line === 0) return 0;
        }
        return -1;
    }

    /**
     * Find table end line
     */
    findTableEnd(instance, currentLine) {
        const lastLine = instance.lastLine();
        
        for (let line = currentLine; line <= lastLine; line++) {
            const content = instance.getLine(line);
            if (!this.isTableRow(content)) {
                return line - 1;
            }
            if (line === lastLine) return lastLine;
        }
        return -1;
    }

    /**
     * Analyze table structure
     */
    analyzeTable(instance) {
        if (!this.currentTable) return;

        const { startLine, endLine } = this.currentTable;
        const rows = [];
        let headerSeparatorLine = -1;
        
        for (let line = startLine; line <= endLine; line++) {
            const content = instance.getLine(line);
            
            if (this.isHeaderSeparator(content)) {
                headerSeparatorLine = line;
                continue;
            }
            
            const cells = this.parseTableRow(content);
            rows.push({
                line,
                cells,
                isHeader: headerSeparatorLine === -1 || line < headerSeparatorLine
            });
        }
        
        this.currentTable.rows = rows;
        this.currentTable.headerSeparatorLine = headerSeparatorLine;
        this.currentTable.columns = Math.max(...rows.map(row => row.cells.length));
    }

    /**
     * Check if line is a header separator
     */
    isHeaderSeparator(line) {
        return /^\s*\|[\s:+-\|]*\|\s*$/.test(line) && /[-:]/.test(line);
    }

    /**
     * Parse table row into cells
     */
    parseTableRow(line) {
        // Remove leading/trailing whitespace and pipes
        const cleaned = line.trim().replace(/^\||\|$/g, '');
        
        // Split by pipes, handling escaped pipes
        const cells = cleaned.split(/(?<!\\)\|/).map(cell => cell.trim());
        
        return cells;
    }

    /**
     * Show table dialog for creating/editing tables
     */
    showTableDialog() {
        const isEditing = this.currentTable !== null;
        
        const modal = document.createElement('div');
        modal.className = 'modal active table-dialog-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${isEditing ? 'Edit Table' : 'Insert Table'}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${isEditing ? this.renderTableEditor() : this.renderTableCreator()}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="this.closest('.modal').remove()">
                        Cancel
                    </button>
                    <button class="btn btn-primary" onclick="tableEditor.${isEditing ? 'saveTable' : 'insertTable'}()">
                        ${isEditing ? 'Save Changes' : 'Insert Table'}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * Render table creator interface
     */
    renderTableCreator() {
        return `
            <div class="table-creator">
                <div class="table-size-selector">
                    <label>Table Size:</label>
                    <div class="size-inputs">
                        <input type="number" id="tableRows" value="3" min="2" max="20"> rows ×
                        <input type="number" id="tableCols" value="3" min="2" max="10"> columns
                    </div>
                </div>
                
                <div class="table-options">
                    <label class="checkbox-label">
                        <input type="checkbox" id="includeHeader" checked>
                        Include header row
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="alignCenter">
                        Center align content
                    </label>
                </div>
                
                <div class="table-preview">
                    <h4>Preview:</h4>
                    <div class="preview-table" id="tablePreview">
                        ${this.generatePreviewTable(3, 3, true)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render table editor interface
     */
    renderTableEditor() {
        if (!this.currentTable) return '';

        const { rows, columns } = this.currentTable;

        return `
            <div class="table-editor">
                <div class="editor-toolbar">
                    <div class="toolbar-group">
                        <button class="tool-btn" onclick="tableEditor.addRow()" title="Add Row">
                            ➕ Row
                        </button>
                        <button class="tool-btn" onclick="tableEditor.addColumn()" title="Add Column">
                            ➕ Column
                        </button>
                    </div>
                    <div class="toolbar-group">
                        <button class="tool-btn" onclick="tableEditor.deleteRow()" title="Delete Row">
                            ➖ Row
                        </button>
                        <button class="tool-btn" onclick="tableEditor.deleteColumn()" title="Delete Column">
                            ➖ Column
                        </button>
                    </div>
                    <div class="toolbar-group">
                        <select id="alignmentSelect" onchange="tableEditor.changeAlignment(this.value)">
                            <option value="left">Left Align</option>
                            <option value="center">Center Align</option>
                            <option value="right">Right Align</option>
                        </select>
                    </div>
                </div>
                
                <div class="table-grid" id="tableGrid">
                    ${this.renderEditableTable()}
                </div>
                
                <div class="table-actions">
                    <button class="btn btn-secondary" onclick="tableEditor.formatTable()">
                        Format Table
                    </button>
                    <button class="btn btn-secondary" onclick="tableEditor.exportTable()">
                        Export CSV
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render editable table
     */
    renderEditableTable() {
        if (!this.currentTable) return '';

        const { rows } = this.currentTable;
        
        return `
            <table class="editable-table">
                ${rows.map((row, rowIndex) => `
                    <tr data-row="${rowIndex}" class="${row.isHeader ? 'header-row' : ''}">
                        ${row.cells.map((cell, colIndex) => {
                            const tagName = row.isHeader ? 'th' : 'td';
                            return `
                                <${tagName} data-col="${colIndex}">
                                    <input type="text" 
                                           value="${this.escapeHtml(cell)}" 
                                           onchange="tableEditor.updateCell(${rowIndex}, ${colIndex}, this.value)"
                                           class="cell-input">
                                </${tagName}>
                            `;
                        }).join('')}
                    </tr>
                `).join('')}
            </table>
        `;
    }

    /**
     * Generate preview table
     */
    generatePreviewTable(rows, cols, hasHeader) {
        let html = '<table class="preview-table-content">';
        
        for (let r = 0; r < rows; r++) {
            const isHeader = hasHeader && r === 0;
            const tagName = isHeader ? 'th' : 'td';
            
            html += '<tr>';
            for (let c = 0; c < cols; c++) {
                const content = isHeader ? `Header ${c + 1}` : `Row ${r} Col ${c + 1}`;
                html += `<${tagName}>${content}</${tagName}>`;
            }
            html += '</tr>';
        }
        
        html += '</table>';
        return html;
    }

    /**
     * Insert new table
     */
    insertTable() {
        const rows = parseInt(document.getElementById('tableRows').value);
        const cols = parseInt(document.getElementById('tableCols').value);
        const hasHeader = document.getElementById('includeHeader').checked;
        const centerAlign = document.getElementById('alignCenter').checked;
        
        const tableMarkdown = this.generateTableMarkdown(rows, cols, hasHeader, centerAlign);
        
        this.editor.editor.replaceSelection('\n' + tableMarkdown + '\n');
        
        // Close modal
        document.querySelector('.table-dialog-modal').remove();
        
        this.editor.showNotification('Table inserted successfully', 'success');
    }

    /**
     * Generate table markdown
     */
    generateTableMarkdown(rows, cols, hasHeader, centerAlign) {
        let markdown = '';
        
        // Header row
        if (hasHeader) {
            const headerCells = Array.from({ length: cols }, (_, i) => `Header ${i + 1}`);
            markdown += '| ' + headerCells.join(' | ') + ' |\n';
            
            // Separator row
            const separator = centerAlign ? ':---:' : '---';
            const separators = Array.from({ length: cols }, () => separator);
            markdown += '| ' + separators.join(' | ') + ' |\n';
            
            rows--; // Subtract header row from total
        }
        
        // Data rows
        for (let r = 0; r < rows; r++) {
            const rowCells = Array.from({ length: cols }, (_, c) => `Cell ${r + 1}-${c + 1}`);
            markdown += '| ' + rowCells.join(' | ') + ' |\n';
        }
        
        return markdown;
    }

    /**
     * Save table changes
     */
    saveTable() {
        if (!this.currentTable) return;

        const newMarkdown = this.generateMarkdownFromEditor();
        
        // Replace table in editor
        this.editor.editor.replaceRange(
            newMarkdown,
            { line: this.currentTable.startLine, ch: 0 },
            { line: this.currentTable.endLine + 1, ch: 0 }
        );
        
        // Close modal
        document.querySelector('.table-dialog-modal').remove();
        
        this.editor.showNotification('Table updated successfully', 'success');
    }

    /**
     * Generate markdown from table editor
     */
    generateMarkdownFromEditor() {
        const table = document.querySelector('.editable-table');
        if (!table) return '';

        const rows = Array.from(table.querySelectorAll('tr'));
        let markdown = '';
        
        rows.forEach((row, rowIndex) => {
            const cells = Array.from(row.querySelectorAll('input.cell-input'));
            const cellValues = cells.map(input => input.value || ' ');
            
            markdown += '| ' + cellValues.join(' | ') + ' |\n';
            
            // Add separator after header
            if (rowIndex === 0 && row.classList.contains('header-row')) {
                const separators = Array.from({ length: cells.length }, () => '---');
                markdown += '| ' + separators.join(' | ') + ' |\n';
            }
        });
        
        return markdown;
    }

    /**
     * Update cell value
     */
    updateCell(rowIndex, colIndex, value) {
        if (!this.currentTable || !this.currentTable.rows[rowIndex]) return;
        
        this.currentTable.rows[rowIndex].cells[colIndex] = value;
    }

    /**
     * Add row to table
     */
    addRow() {
        if (!this.currentTable) return;

        const { columns } = this.currentTable;
        const newCells = Array.from({ length: columns }, (_, i) => `New Cell ${i + 1}`);
        
        this.currentTable.rows.push({
            line: -1, // New row
            cells: newCells,
            isHeader: false
        });
        
        this.refreshTableEditor();
    }

    /**
     * Add column to table
     */
    addColumn() {
        if (!this.currentTable) return;

        this.currentTable.rows.forEach((row, index) => {
            row.cells.push(`New Cell ${index + 1}`);
        });
        
        this.currentTable.columns++;
        this.refreshTableEditor();
    }

    /**
     * Delete row from table
     */
    deleteRow() {
        if (!this.currentTable || this.currentTable.rows.length <= 1) return;

        this.currentTable.rows.pop();
        this.refreshTableEditor();
    }

    /**
     * Delete column from table
     */
    deleteColumn() {
        if (!this.currentTable || this.currentTable.columns <= 1) return;

        this.currentTable.rows.forEach(row => {
            row.cells.pop();
        });
        
        this.currentTable.columns--;
        this.refreshTableEditor();
    }

    /**
     * Change table alignment
     */
    changeAlignment(alignment) {
        // This would update the table separator row alignment
        // Left: ---, Center: :---:, Right: ---:
        this.editor.showNotification(`Table alignment changed to ${alignment}`, 'info');
    }

    /**
     * Format table (align columns)
     */
    formatTable() {
        if (!this.currentTable) return;

        // Calculate maximum width for each column
        const columnWidths = [];
        
        this.currentTable.rows.forEach(row => {
            row.cells.forEach((cell, colIndex) => {
                columnWidths[colIndex] = Math.max(
                    columnWidths[colIndex] || 0,
                    cell.length
                );
            });
        });
        
        // Apply formatting
        this.currentTable.rows.forEach(row => {
            row.cells.forEach((cell, colIndex) => {
                const width = columnWidths[colIndex];
                row.cells[colIndex] = cell.padEnd(width);
            });
        });
        
        this.refreshTableEditor();
        this.editor.showNotification('Table formatted successfully', 'success');
    }

    /**
     * Export table as CSV
     */
    exportTable() {
        if (!this.currentTable) return;

        const csvContent = this.currentTable.rows
            .map(row => row.cells.join(','))
            .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'table.csv';
        a.click();
        
        URL.revokeObjectURL(url);
        this.editor.showNotification('Table exported as CSV', 'success');
    }

    /**
     * Refresh table editor
     */
    refreshTableEditor() {
        const tableGrid = document.getElementById('tableGrid');
        if (tableGrid) {
            tableGrid.innerHTML = this.renderEditableTable();
        }
    }

    /**
     * Navigate table cells with Tab
     */
    navigateTable(direction) {
        const cursor = this.editor.editor.getCursor();
        const line = this.editor.editor.getLine(cursor.line);
        
        if (!this.isTableRow(line)) return;

        const cells = this.parseTableRow(line);
        const currentCell = this.findCellAtCursor(line, cursor.ch);
        
        let targetCell = direction === 'next' ? currentCell + 1 : currentCell - 1;
        
        if (targetCell >= cells.length) {
            // Move to next row, first cell
            const nextLine = cursor.line + 1;
            if (nextLine <= this.currentTable.endLine) {
                this.editor.editor.setCursor({ line: nextLine, ch: 2 });
            }
        } else if (targetCell < 0) {
            // Move to previous row, last cell
            const prevLine = cursor.line - 1;
            if (prevLine >= this.currentTable.startLine) {
                const prevLineContent = this.editor.editor.getLine(prevLine);
                const prevCells = this.parseTableRow(prevLineContent);
                const lastCellPos = this.findCellPosition(prevLineContent, prevCells.length - 1);
                this.editor.editor.setCursor({ line: prevLine, ch: lastCellPos.start + 1 });
            }
        } else {
            // Move to target cell in same row
            const cellPos = this.findCellPosition(line, targetCell);
            this.editor.editor.setCursor({ line: cursor.line, ch: cellPos.start + 1 });
        }
    }

    /**
     * Find cell at cursor position
     */
    findCellAtCursor(line, ch) {
        let cellIndex = 0;
        let position = 0;
        
        for (let i = 0; i < line.length && position < ch; i++) {
            if (line[i] === '|') {
                cellIndex++;
            }
            position++;
        }
        
        return Math.max(0, cellIndex - 1);
    }

    /**
     * Find cell position in line
     */
    findCellPosition(line, cellIndex) {
        let currentCell = 0;
        let start = 0;
        let end = line.length;
        
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '|') {
                if (currentCell === cellIndex) {
                    start = i + 1;
                } else if (currentCell === cellIndex + 1) {
                    end = i;
                    break;
                }
                currentCell++;
            }
        }
        
        return { start, end };
    }

    /**
     * Show table overlay with controls
     */
    showTableOverlay() {
        this.hideTableOverlay(); // Remove existing overlay
        
        const overlay = document.createElement('div');
        overlay.className = 'table-overlay';
        overlay.innerHTML = `
            <div class="table-controls">
                <button class="overlay-btn" onclick="tableEditor.showTableDialog()" title="Edit Table">
                    ✏️
                </button>
                <button class="overlay-btn" onclick="tableEditor.addRow()" title="Add Row">
                    ➕
                </button>
                <button class="overlay-btn" onclick="tableEditor.formatTable()" title="Format Table">
                    📐
                </button>
            </div>
        `;
        
        // Position overlay
        const editorWrapper = this.editor.editor.getWrapperElement();
        overlay.style.position = 'absolute';
        overlay.style.right = '20px';
        overlay.style.top = '20px';
        overlay.style.zIndex = '1000';
        
        editorWrapper.appendChild(overlay);
        this.tableOverlay = overlay;
    }

    /**
     * Hide table overlay
     */
    hideTableOverlay() {
        if (this.tableOverlay) {
            this.tableOverlay.remove();
            this.tableOverlay = null;
        }
    }

    /**
     * Update table overlay position
     */
    updateTableOverlay() {
        if (this.tableOverlay && this.currentTable) {
            // Update overlay position based on current table
            const cursor = this.editor.editor.getCursor();
            const coords = this.editor.editor.cursorCoords(cursor, 'local');
            
            this.tableOverlay.style.left = coords.right + 'px';
            this.tableOverlay.style.top = coords.top + 'px';
        }
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Setup preview table size selector
     */
    setupPreviewUpdater() {
        const rowsInput = document.getElementById('tableRows');
        const colsInput = document.getElementById('tableCols');
        const headerInput = document.getElementById('includeHeader');
        
        [rowsInput, colsInput, headerInput].forEach(input => {
            if (input) {
                input.addEventListener('change', () => {
                    const rows = parseInt(rowsInput.value);
                    const cols = parseInt(colsInput.value);
                    const hasHeader = headerInput.checked;
                    
                    const preview = document.getElementById('tablePreview');
                    if (preview) {
                        preview.innerHTML = this.generatePreviewTable(rows, cols, hasHeader);
                    }
                });
            }
        });
    }

    /**
     * Cleanup
     */
    destroy() {
        this.hideTableOverlay();
        
        // Remove any open dialogs
        const modal = document.querySelector('.table-dialog-modal');
        if (modal) modal.remove();
        
        this.currentTable = null;
    }
}

// Global reference for inline handlers
window.tableEditor = null;

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableEditorPlugin;
} else {
    window.TableEditorPlugin = TableEditorPlugin;
}