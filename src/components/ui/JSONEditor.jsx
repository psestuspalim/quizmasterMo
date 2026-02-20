import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from './button';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

// Map pairs for auto-close
const PAIRS = { '{': '}', '[': ']', '"': '"' };
const CLOSE_CHARS = new Set(['}', ']', '"']);

function getSyntaxErrorLine(jsonText, errorMsg) {
  // Try to extract position from error message
  const posMatch = errorMsg.match(/position (\d+)/i) || errorMsg.match(/at (\d+)/i);
  if (posMatch) {
    const pos = parseInt(posMatch[1]);
    const before = jsonText.substring(0, pos);
    return before.split('\n').length;
  }
  // Try line/column
  const lineMatch = errorMsg.match(/line (\d+)/i);
  if (lineMatch) return parseInt(lineMatch[1]);
  return null;
}

export default function JSONEditor({ value, onChange, errors = [], className = '' }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const overlayRef = useRef(null);

  const [syntaxError, setSyntaxError] = useState(null); // { message, line }
  const [isValid, setIsValid] = useState(false);

  // Parse syntax in real-time
  useEffect(() => {
    if (!value || !value.trim()) {
      setSyntaxError(null);
      setIsValid(false);
      return;
    }
    try {
      JSON.parse(value);
      setSyntaxError(null);
      setIsValid(true);
    } catch (e) {
      const line = getSyntaxErrorLine(value, e.message);
      setSyntaxError({ message: e.message, line });
      setIsValid(false);
    }
  }, [value]);

  const lines = (value || '').split('\n');
  const lineCount = lines.length;

  // Collect error lines: from prop errors + real-time syntax error
  const errorLineSet = new Set();
  if (syntaxError?.line) errorLineSet.add(syntaxError.line);
  errors.forEach(e => {
    const m = e.match(/línea (\d+)|line (\d+)/i);
    if (m) errorLineSet.add(parseInt(m[1] || m[2]));
  });

  // Sync scroll between gutter, overlay, textarea
  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
    if (overlayRef.current) overlayRef.current.scrollTop = ta.scrollTop;
  }, []);

  const goToLine = (lineNumber) => {
    if (!textareaRef.current || !value) return;
    let charCount = 0;
    for (let i = 0; i < lineNumber - 1; i++) {
      charCount += lines[i].length + 1;
    }
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charCount, charCount + (lines[lineNumber - 1]?.length || 0));
    const lineHeight = 20;
    textareaRef.current.scrollTop = Math.max(0, (lineNumber - 3)) * lineHeight;
    syncScroll();
  };

  // Auto-complete pairs on keydown
  const handleKeyDown = useCallback((e) => {
    const ta = e.target;
    const { selectionStart, selectionEnd } = ta;
    const val = ta.value;

    // Tab -> 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const newVal = val.substring(0, selectionStart) + '  ' + val.substring(selectionEnd);
      onChange(newVal);
      requestAnimationFrame(() => {
        ta.setSelectionRange(selectionStart + 2, selectionStart + 2);
      });
      return;
    }

    // Auto-close pairs
    if (PAIRS[e.key]) {
      const close = PAIRS[e.key];
      // For quotes: toggle if next char is already closing quote
      if (e.key === '"' && val[selectionStart] === '"' && selectionStart === selectionEnd) {
        e.preventDefault();
        ta.setSelectionRange(selectionStart + 1, selectionStart + 1);
        return;
      }
      // If there's a selection, wrap it
      if (selectionStart !== selectionEnd) {
        e.preventDefault();
        const selected = val.substring(selectionStart, selectionEnd);
        const newVal = val.substring(0, selectionStart) + e.key + selected + close + val.substring(selectionEnd);
        onChange(newVal);
        requestAnimationFrame(() => {
          ta.setSelectionRange(selectionStart + 1, selectionEnd + 1);
        });
        return;
      }
      // Auto-insert closing pair
      e.preventDefault();
      const newVal = val.substring(0, selectionStart) + e.key + close + val.substring(selectionEnd);
      onChange(newVal);
      requestAnimationFrame(() => {
        ta.setSelectionRange(selectionStart + 1, selectionStart + 1);
      });
      return;
    }

    // Skip over closing chars if already there
    if (CLOSE_CHARS.has(e.key) && val[selectionStart] === e.key && selectionStart === selectionEnd) {
      e.preventDefault();
      ta.setSelectionRange(selectionStart + 1, selectionStart + 1);
      return;
    }

    // Enter: auto-indent
    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = val.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = val.substring(lineStart, selectionStart);
      const indent = currentLine.match(/^(\s*)/)[1];
      const charBefore = val[selectionStart - 1];
      const charAfter = val[selectionStart];

      // If inside {}, [], add extra indent and split
      if ((charBefore === '{' && charAfter === '}') || (charBefore === '[' && charAfter === ']')) {
        const newVal = val.substring(0, selectionStart) + '\n' + indent + '  \n' + indent + val.substring(selectionEnd);
        onChange(newVal);
        requestAnimationFrame(() => {
          ta.setSelectionRange(selectionStart + indent.length + 3, selectionStart + indent.length + 3);
        });
      } else {
        const extraIndent = (charBefore === '{' || charBefore === '[') ? '  ' : '';
        const newVal = val.substring(0, selectionStart) + '\n' + indent + extraIndent + val.substring(selectionEnd);
        onChange(newVal);
        requestAnimationFrame(() => {
          const newPos = selectionStart + 1 + indent.length + extraIndent.length;
          ta.setSelectionRange(newPos, newPos);
        });
      }
    }
  }, [onChange]);

  const LINE_HEIGHT = 20;
  const PADDING_TOP = 12;

  const allErrors = [...errors];
  if (syntaxError) {
    const lineInfo = syntaxError.line ? ` (línea ${syntaxError.line})` : '';
    allErrors.unshift(`Error de sintaxis${lineInfo}: ${syntaxError.message}`);
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Error panel */}
      {allErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto">
          {allErrors.map((error, idx) => {
            const lineMatch = error.match(/línea (\d+)/i);
            const lineNum = lineMatch ? parseInt(lineMatch[1]) : null;
            return (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <span className="text-red-700 dark:text-red-300 flex-1">{error}</span>
                {lineNum && (
                  <button
                    onClick={() => goToLine(lineNum)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 underline whitespace-nowrap flex-shrink-0"
                  >
                    ir a línea {lineNum}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Editor */}
      <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden">
        <div className="flex" style={{ height: '420px' }}>

          {/* Gutter - line numbers */}
          <div
            ref={gutterRef}
            className="bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 px-2 select-none overflow-hidden flex-shrink-0"
            style={{ width: 48, overflowY: 'hidden' }}
          >
            <div style={{ paddingTop: PADDING_TOP }}>
              {Array.from({ length: lineCount }, (_, i) => (
                <div
                  key={i}
                  className={`text-right font-mono text-xs transition-colors ${
                    errorLineSet.has(i + 1)
                      ? 'text-red-500 dark:text-red-400 font-bold'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}
                  style={{ height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Code area */}
          <div className="flex-1 relative overflow-hidden">
            {/* Error line highlights overlay */}
            <div
              ref={overlayRef}
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{ paddingTop: PADDING_TOP, zIndex: 0 }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div
                  key={i}
                  style={{
                    height: LINE_HEIGHT,
                    backgroundColor: errorLineSet.has(i + 1) ? 'rgba(239,68,68,0.12)' : 'transparent',
                  }}
                />
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onScroll={syncScroll}
              onKeyDown={handleKeyDown}
              placeholder='Pega tu JSON aquí...'
              className="absolute inset-0 w-full h-full p-3 font-mono text-sm bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-none focus:outline-none"
              style={{
                lineHeight: `${LINE_HEIGHT}px`,
                paddingTop: PADDING_TOP,
                zIndex: 1,
                overflowY: 'scroll',
                whiteSpace: 'pre',
                overflowWrap: 'normal',
                overflowX: 'auto',
              }}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-500">
          <span>{lineCount} línea{lineCount !== 1 ? 's' : ''}</span>
          <span className="flex items-center gap-1.5">
            {!value?.trim() ? (
              <span className="text-gray-400">—</span>
            ) : isValid ? (
              <>
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-green-600 dark:text-green-400">JSON válido</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-red-500" />
                <span className="text-red-600 dark:text-red-400">JSON inválido</span>
              </>
            )}
          </span>
          <span className="text-gray-400">Tab = 2 espacios · auto-cierre activo</span>
        </div>
      </div>
    </div>
  );
}