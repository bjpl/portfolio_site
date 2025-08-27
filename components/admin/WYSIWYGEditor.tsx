import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Link,
  Image,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Type,
  Palette,
  Table,
  Video,
  FileText
} from 'lucide-react';
import { WYSIWYGOptions } from '@/types/admin';
import { useAutoSave } from '@/hooks/admin/useAutoSave';

interface WYSIWYGEditorProps {
  content: string;
  onChange: (content: string) => void;
  options?: WYSIWYGOptions;
  onImageUpload?: () => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const WYSIWYGEditor: React.FC<WYSIWYGEditorProps> = ({
  content,
  onChange,
  options = {},
  onImageUpload,
  className,
  placeholder = "Start writing...",
  disabled = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const {
    toolbar = 'full',
    maxLength,
    uploadHandler,
    mentionHandler
  } = options;

  // Auto-save functionality
  const { saveStatus } = useAutoSave(content, {
    enabled: true,
    interval: 5000, // 5 seconds
    onSave: async (data) => {
      // Auto-save would be handled by parent component
      console.log('Auto-saving content:', data.length, 'characters');
    }
  });

  // Initialize editor
  useEffect(() => {
    if (editorRef.current && !isPreviewMode) {
      editorRef.current.innerHTML = content;
    }
  }, [content, isPreviewMode]);

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (editorRef.current && !disabled) {
      const newContent = editorRef.current.innerHTML;
      onChange(newContent);
    }
  }, [onChange, disabled]);

  // Format commands
  const execCommand = (command: string, value: string = '') => {
    if (disabled) return;
    
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  // Insert HTML at cursor
  const insertHTML = (html: string) => {
    if (disabled) return;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const template = document.createElement('template');
      template.innerHTML = html;
      range.insertNode(template.content);
      selection.removeAllRanges();
      handleContentChange();
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            execCommand('redo');
          } else {
            execCommand('undo');
          }
          break;
        case 'k':
          e.preventDefault();
          handleLinkInsert();
          break;
      }
    }
  };

  // Handle image upload
  const handleImageInsert = async () => {
    if (onImageUpload) {
      onImageUpload();
    } else if (uploadHandler) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            const url = await uploadHandler(file);
            insertHTML(`<img src="${url}" alt="${file.name}" style="max-width: 100%; height: auto;" />`);
          } catch (error) {
            console.error('Image upload failed:', error);
          }
        }
      };
      input.click();
    }
  };

  // Handle link insertion
  const handleLinkInsert = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setSelectedText(selection.toString());
      setShowLinkDialog(true);
    } else {
      const url = prompt('Enter URL:');
      if (url) {
        const text = prompt('Enter link text:') || url;
        insertHTML(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`);
      }
    }
  };

  // Insert link with dialog
  const insertLink = () => {
    if (linkUrl && selectedText) {
      insertHTML(`<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${selectedText}</a>`);
      setShowLinkDialog(false);
      setLinkUrl('');
      setSelectedText('');
    }
  };

  // Insert table
  const insertTable = () => {
    const rows = prompt('Number of rows:') || '3';
    const cols = prompt('Number of columns:') || '3';
    
    let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%;"><tbody>';
    
    for (let i = 0; i < parseInt(rows); i++) {
      tableHTML += '<tr>';
      for (let j = 0; j < parseInt(cols); j++) {
        tableHTML += '<td style="padding: 8px; border: 1px solid #ccc;">&nbsp;</td>';
      }
      tableHTML += '</tr>';
    }
    
    tableHTML += '</tbody></table>';
    insertHTML(tableHTML);
  };

  // Toolbar configurations
  const toolbarConfig = {
    minimal: [
      { icon: Bold, command: 'bold', tooltip: 'Bold (Ctrl+B)' },
      { icon: Italic, command: 'italic', tooltip: 'Italic (Ctrl+I)' },
      { icon: Link, action: handleLinkInsert, tooltip: 'Insert Link (Ctrl+K)' },
    ],
    basic: [
      { icon: Bold, command: 'bold', tooltip: 'Bold (Ctrl+B)' },
      { icon: Italic, command: 'italic', tooltip: 'Italic (Ctrl+I)' },
      { icon: Underline, command: 'underline', tooltip: 'Underline (Ctrl+U)' },
      'separator',
      { icon: AlignLeft, command: 'justifyLeft', tooltip: 'Align Left' },
      { icon: AlignCenter, command: 'justifyCenter', tooltip: 'Align Center' },
      { icon: AlignRight, command: 'justifyRight', tooltip: 'Align Right' },
      'separator',
      { icon: List, command: 'insertUnorderedList', tooltip: 'Bullet List' },
      { icon: ListOrdered, command: 'insertOrderedList', tooltip: 'Numbered List' },
      'separator',
      { icon: Link, action: handleLinkInsert, tooltip: 'Insert Link (Ctrl+K)' },
      { icon: Image, action: handleImageInsert, tooltip: 'Insert Image' },
    ],
    full: [
      { icon: Undo2, command: 'undo', tooltip: 'Undo (Ctrl+Z)' },
      { icon: Redo2, command: 'redo', tooltip: 'Redo (Ctrl+Shift+Z)' },
      'separator',
      { icon: Heading1, command: 'formatBlock', value: 'H1', tooltip: 'Heading 1' },
      { icon: Heading2, command: 'formatBlock', value: 'H2', tooltip: 'Heading 2' },
      { icon: Heading3, command: 'formatBlock', value: 'H3', tooltip: 'Heading 3' },
      'separator',
      { icon: Bold, command: 'bold', tooltip: 'Bold (Ctrl+B)' },
      { icon: Italic, command: 'italic', tooltip: 'Italic (Ctrl+I)' },
      { icon: Underline, command: 'underline', tooltip: 'Underline (Ctrl+U)' },
      { icon: Strikethrough, command: 'strikethrough', tooltip: 'Strikethrough' },
      'separator',
      { icon: AlignLeft, command: 'justifyLeft', tooltip: 'Align Left' },
      { icon: AlignCenter, command: 'justifyCenter', tooltip: 'Align Center' },
      { icon: AlignRight, command: 'justifyRight', tooltip: 'Align Right' },
      { icon: AlignJustify, command: 'justifyFull', tooltip: 'Justify' },
      'separator',
      { icon: List, command: 'insertUnorderedList', tooltip: 'Bullet List' },
      { icon: ListOrdered, command: 'insertOrderedList', tooltip: 'Numbered List' },
      { icon: Quote, command: 'formatBlock', value: 'BLOCKQUOTE', tooltip: 'Quote' },
      'separator',
      { icon: Link, action: handleLinkInsert, tooltip: 'Insert Link (Ctrl+K)' },
      { icon: Image, action: handleImageInsert, tooltip: 'Insert Image' },
      { icon: Table, action: insertTable, tooltip: 'Insert Table' },
      { icon: Code, command: 'formatBlock', value: 'PRE', tooltip: 'Code Block' },
      { icon: Code2, command: 'insertHTML', value: '<code></code>', tooltip: 'Inline Code' },
    ]
  };

  const currentToolbar = toolbarConfig[toolbar] || toolbarConfig.full;

  const renderToolbar = () => (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50 dark:bg-gray-800">
      {currentToolbar.map((item, index) => {
        if (item === 'separator') {
          return <Separator key={index} orientation="vertical" className="h-6 mx-1" />;
        }

        const { icon: Icon, command, value, action, tooltip } = item as any;

        return (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            onClick={() => action ? action() : execCommand(command, value)}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title={tooltip}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Preview Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsPreviewMode(!isPreviewMode)}
        className="h-8 w-8 p-0"
        title={isPreviewMode ? 'Edit Mode' : 'Preview Mode'}
      >
        {isPreviewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>

      {/* Save Status */}
      {saveStatus && (
        <div className="ml-auto flex items-center text-xs text-muted-foreground">
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && 'Saved'}
          {saveStatus === 'error' && 'Save failed'}
        </div>
      )}
    </div>
  );

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Toolbar */}
      {renderToolbar()}

      {/* Editor/Preview Area */}
      <div className="relative">
        {isPreviewMode ? (
          /* Preview Mode */
          <div 
            className="p-4 min-h-[400px] prose max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          /* Edit Mode */
          <div
            ref={editorRef}
            contentEditable={!disabled}
            onInput={handleContentChange}
            onKeyDown={handleKeyDown}
            className={`
              p-4 min-h-[400px] outline-none
              prose max-w-none dark:prose-invert
              ${disabled ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}
            `}
            style={{ 
              minHeight: '400px',
              maxHeight: '600px',
              overflowY: 'auto'
            }}
            data-placeholder={placeholder}
            suppressContentEditableWarning
          />
        )}

        {/* Character count */}
        {maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {content.replace(/<[^>]*>/g, '').length}/{maxLength}
          </div>
        )}

        {/* Placeholder styling */}
        <style jsx>{`
          div[contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
        `}</style>
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Text:</label>
                <input
                  type="text"
                  value={selectedText}
                  onChange={(e) => setSelectedText(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">URL:</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowLinkDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={insertLink}>
                  Insert Link
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default WYSIWYGEditor;