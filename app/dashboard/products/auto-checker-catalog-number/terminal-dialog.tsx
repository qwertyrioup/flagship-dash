// Client-side: src/components/TerminalDialog.tsx

'use client'

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle
} from "@/components/ui/dialog";

// Re-import the ProcessError interface for consistency
interface ProcessError {
  type: 'validation' | 'duplication' | 'missing_field' | 'invalid_value' | 'unrecognized_field' | 'system_error' | 'permission_denied' | 'file_error' | 'info' | 'success' | 'warning' | 'summary_report';
  message: string;
  field?: string;
  value?: any;
  catalogNumber?: string;
  sheetName?: string;
  details?: string[];
  severity: 'error' | 'warning' | 'info' | 'success';
  code?: string;
  totalProducts?: number;
  validProducts?: number;
  errors?: number;
  duplications?: number;
  warnings?: number;
}

interface TerminalDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  stream?: ReadableStream;
  onStreamComplete?: () => void;
}

const MAX_DISPLAY_DETAILS = 20; // Limit number of details shown directly

export function TerminalDialog({ isOpen, onOpenChange, stream, onStreamComplete }: TerminalDialogProps) {
  const [messages, setMessages] = useState<ProcessError[]>([]); // Messages are now ProcessError objects
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (message: ProcessError) => {
    setMessages(prev => [...prev, message]);
  };

  useEffect(() => {
    if (!stream) return;

    setMessages([]); // Clear old messages when a new stream starts

    const reader = stream.getReader();
    const decoder = new TextDecoder();

    const readStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            onStreamComplete?.();
            break;
          }

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: ProcessError = JSON.parse(line.slice(6));
                addMessage(data); // Directly add the structured message
              } catch (error) {
                // Fallback for malformed or non-JSON messages
                addMessage({
                  type: 'system_error',
                  message: `Failed to parse stream data: "${line.slice(6)}". Error: ${error instanceof Error ? error.message : String(error)}`,
                  severity: 'error',
                  code: 'STREAM_PARSE_ERROR'
                });
              }
            } else {
              // Handle any non-SSE formatted messages (shouldn't happen if server is consistent)
              addMessage({
                type: 'info', // Default to info
                message: line,
                severity: 'info',
                code: 'UNFORMATTED_STREAM_MESSAGE'
              });
            }
          }
        }
      } catch (error) {
        console.error('Stream reading error:', error);
        addMessage({
          type: 'system_error',
          message: `Stream connection error: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'error',
          code: 'STREAM_CONNECTION_ERROR'
        });
        onStreamComplete?.();
      }
    };

    readStream();

    return () => {
      reader.cancel();
    };
  }, [stream, onStreamComplete]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getMessageColor = (severity: ProcessError['severity']) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
      default:
        return 'text-foreground';
    }
  };

  const renderMessageContent = (message: ProcessError) => {
    let mainContent = message.message;
    if (message.code) mainContent = `[${message.code}] ${mainContent}`;
    if (message.field) mainContent += ` (Field: ${message.field})`;
    if (message.catalogNumber) mainContent += ` (Product: ${message.catalogNumber})`;
    if (message.sheetName) mainContent += ` (Sheet: ${message.sheetName})`;
    // Only show value if it's explicitly set and not null/undefined/empty string
    if (message.value !== undefined && message.value !== null && String(message.value).trim() !== '') {
        mainContent += ` (Value: ${JSON.stringify(message.value)})`;
    }

    // For summary report, render specific details
    if (message.type === 'summary_report') {
        const summaryDetails = [
            `Total products: ${message.totalProducts || 0}`,
            `Valid products: ${message.validProducts || 0}`,
            `Errors: ${message.errors || 0}`,
            `Duplications: ${message.duplications || 0}`,
            `Warnings: ${message.warnings || 0}`
        ].join(' | ');
        return (
            <div className={getMessageColor(message.severity)}>
                $ {message.message}: {summaryDetails}
            </div>
        );
    }

    // Render messages with details (e.g., validation errors with sub-errors)
    if (message.details && Array.isArray(message.details) && message.details.length > 0) {
      return (
        <div>
          <div className={getMessageColor(message.severity)}>$ {mainContent}</div>
          {message.details.length <= MAX_DISPLAY_DETAILS ? (
            <div className="ml-4 mt-1 space-y-1">
              {message.details.map((detail, idx) => (
                <div key={idx} className="text-gray-400">
                  - {detail}
                </div>
              ))}
            </div>
          ) : (
            <div className="ml-4 mt-1">
              <details className="cursor-pointer">
                <summary className="text-gray-300 hover:text-white">
                  Show {message.details.length} details
                </summary>
                <div className="mt-1 space-y-1">
                  {message.details.slice(0, MAX_DISPLAY_DETAILS).map((detail, idx) => (
                    <div key={idx} className="text-gray-800 dark:text-gray-400">
                      - {detail}
                    </div>
                  ))}
                  {message.details.length > MAX_DISPLAY_DETAILS && (
                    <div className="text-gray-500">
                      ...and {message.details.length - MAX_DISPLAY_DETAILS} more
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      );
    }
    
    // Default rendering for simple messages
    return <div className={getMessageColor(message.severity)}>$ {mainContent}</div>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 border-0 bg-background text-foreground font-mono rounded-xl overflow-hidden">
        <div className="bg-background px-4 py-2 flex items-center justify-between">
          <DialogTitle className="text-md text-foreground">Process Terminal</DialogTitle>
          <div className="text-sm font-mono mr-6 font-semibold text-gray-400">
            {messages.length} messages
          </div>
        </div>
        <div className="h-[400px] overflow-y-auto text-sm font-mono font-medium p-4 space-y-2 bg-background [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-background [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
          {messages.map((message, index) => (
            <div key={index} className="flex flex-col">
              {renderMessageContent(message)}
            </div>
          ))}
          {messages.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-white">$</span>
              <span className="text-white animate-pulse">_</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </DialogContent>
    </Dialog>
  );
}