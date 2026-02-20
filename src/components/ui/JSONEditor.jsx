import React, { useRef, useState, useEffect } from 'react';
import { Button } from './button';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function JSONEditor({ value, onChange, errors = [], className = '' }) {
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const lines = (value || '').split('\n').length;
    setLineCount(lines);
  }, [value]);

  // Sync overlay scroll with textarea scroll
  const handleScroll = () => {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const goToLine = (lineNumber) => {
    if (!textareaRef.current) return;
    const lines = value.split('\n');
    let charCount = 0;
    for (let i = 0; i < lineNumber - 1; i++) {
      charCount += lines[i].length + 1;
    }
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charCount, charCount + (lines[lineNumber - 1]?.length || 0));
    textareaRef.current.scrollTop = (lineNumber - 1) * 20;
    if (overlayRef.current) overlayRef.current.scrollTop = textareaRef.current.scrollTop;
  };

  const extractLineNumber = (errorMsg) => {
    const match = errorMsg.match(/línea (\d+)|line (\d+)/i);
    if (match) return parseInt(match[1] || match[2]);
    // Try extracting from position offset
    const posMatch = errorMsg.match(/position (\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      const textBefore = (value || '').substring(0, pos);
      return textBefore.split('\n').length;
    }
    return null;
  };

  // Collect all error line numbers
  const errorLines = new Set(
    errors.map(e => extractLineNumber(e)).filter(Boolean)
  );

  const LINE_HEIGHT = 20; // must match leading-5 (1.25rem = 20px)

  return (
    <div className={`space-y-2 ${className}`}>
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 space-y-2">
          {errors.map((error, idx) => {
            const lineNum = extractLineNumber(error);
            return (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-red-700 dark:text-red-300 flex-1">{error}</span>
                {lineNum && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => goToLine(lineNum)}
                    className="h-6 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                  >
                    Ir a línea {lineNum}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="relative rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950">
        <div className="flex">
          {/* Line Numbers */}
          <div className="bg-gray-50 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 px-3 py-3 text-right select-none flex-shrink-0">
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                className={`text-xs font-mono leading-5 transition-colors ${
                  errorLines.has(i + 1)
                    ? 'text-red-600 dark:text-red-400 font-bold'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
                style={{ height: LINE_HEIGHT }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Editor area with overlay */}
          <div className="flex-1 relative overflow-hidden">
            {/* Red highlight overlay */}
            <div
              ref={overlayRef}
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{ paddingTop: 12 }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div
                  key={i}
                  style={{
                    height: LINE_HEIGHT,
                    backgroundColor: errorLines.has(i + 1) ? 'rgba(239,68,68,0.12)' : 'transparent',
                  }}
                />
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onScroll={handleScroll}
              placeholder='{"metadata": {...}, "q": [...]}'
              className="w-full p-3 font-mono text-sm leading-5 resize-none focus:outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 relative z-10"
              style={{ minHeight: '400px', lineHeight: `${LINE_HEIGHT}px` }}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {!errors.length && value && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>{lineCount} líneas</span>
        </div>
      )}
    </div>
  );
}