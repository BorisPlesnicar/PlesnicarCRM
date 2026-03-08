"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  X,
  Minimize2,
  Send,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const STORAGE_KEY = "plesnicar-crm-chat-history";
const MAX_MESSAGES = 50;

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        // Keep only last MAX_MESSAGES
        const messagesToSave = messages.slice(-MAX_MESSAGES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesToSave));
      } catch (error) {
        console.error("Error saving chat history:", error);
      }
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Auto-focus textarea when chat opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Build history for API (last 10 messages)
      const history = messages.slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          history,
          currentPage: pathname,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Fehler beim Abrufen der Antwort");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Fehler", {
        description: error.message || "Konnte keine Antwort erhalten",
      });
      // Remove the user message if there was an error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClearChat() {
    if (confirm("Möchten Sie den gesamten Chat-Verlauf löschen?")) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      toast.success("Chat-Verlauf gelöscht");
    }
  }

  // Don't show chatbot on login page
  if (pathname === "/login" || !pathname.startsWith("/app")) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "flex items-center justify-center",
            "transition-all duration-200 hover:scale-110"
          )}
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary-foreground text-primary"
          >
            KI
          </Badge>
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card
          className={cn(
            "fixed bottom-4 right-4 z-50 flex flex-col",
            "w-[400px] h-[600px] max-h-[80vh]",
            "md:w-[400px] md:h-[600px]",
            "sm:w-[90vw] sm:h-[70vh]",
            "shadow-2xl border-border bg-card",
            "transition-all duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">KI-Assistent</h3>
              <Badge variant="outline" className="text-xs">
                KI
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                className="h-8 w-8"
                title="Chat löschen"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">
                  Hallo! Ich bin dein KI-Assistent.
                  <br />
                  Wie kann ich dir helfen?
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        message.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {message.timestamp.toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-muted/50">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Frage stellen..."
                className="min-h-[60px] max-h-[120px] resize-none bg-background"
                disabled={loading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-[60px] px-4"
                size="icon"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Enter zum Senden, Shift+Enter für neue Zeile
            </p>
          </div>
        </Card>
      )}
    </>
  );
}
