import React, { useRef, useState, useEffect } from 'react';
import { Button } from './button';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function JSONEditor({ value, onChange, errors = [], className = '' }) {
  const textareaRef = useRef(null);
  const [lineCount, setLineCount] = useState(1);
  const [highlightedLine, setHighlightedLine] = useState(null);

  useEffect(() => {
    const lines = (value || '').split('\n').length;
    setLineCount(lines);
  }, [value]);

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
    
    setHighlightedLine(lineNumber);
    setTimeout(() => setHighlightedLine(null), 2000);
  };

  const extractLineNumber = (errorMsg) => {
    const match = errorMsg.match(/línea (\d+)|line (\d+)|position (\d+)/i);
    return match ? parseInt(match[1] || match[2] || match[3]) : null;
  };

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
          <div className="bg-gray-50 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 px-3 py-3 text-right select-none">
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                className={`text-xs font-mono leading-5 transition-colors ${
                  highlightedLine === i + 1
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code Editor */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder='{"metadata": {...}, "q": [...]}'
            className="flex-1 p-3 font-mono text-sm leading-5 resize-none focus:outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600"
            style={{ minHeight: '400px' }}
            spellCheck={false}
          />
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