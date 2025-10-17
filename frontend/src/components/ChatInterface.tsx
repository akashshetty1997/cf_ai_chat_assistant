// frontend/src/components/ChatInterface.tsx

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { Message } from "../types";
import { Sparkles } from "lucide-react";

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => boolean;
  isConnected: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isConnected,
}: ChatInterfaceProps) {
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Send through WebSocket
    const sent = onSendMessage(content);

    if (sent) {
      setIsTyping(true);

      // Stop typing indicator after 30 seconds (fallback)
      setTimeout(() => setIsTyping(false), 30000);
    }
  };

  // Stop typing indicator when assistant responds
  useEffect(() => {
    if (
      messages.length > 0 &&
      messages[messages.length - 1].role === "assistant"
    ) {
      setIsTyping(false);
    }
  }, [messages]);

  return (
    <Card className="flex flex-col h-[calc(100vh-180px)] shadow-xl">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              <span className="text-sm">AI is thinking...</span>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={!isConnected}
            placeholder={
              isConnected
                ? "Type a message... (e.g., 'analyze grilled chicken with rice' or 'recommend meals')"
                : "Connecting..."
            }
          />
        </div>
      </div>
    </Card>
  );
}

function EmptyState() {
  const suggestions = [
    "Analyze grilled chicken with quinoa and broccoli",
    "Recommend 3 meals for muscle gain",
    "Set my daily calorie goal to 2000",
    "Show my meal history",
  ];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Welcome to Nutrition Coach!
      </h2>

      <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md">
        I'm your AI-powered nutrition assistant. I analyze meals, recommend
        food, and help you track your nutrition goals.
      </p>

      <div className="grid gap-2 w-full max-w-lg">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Try asking:
        </p>
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="text-left px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400"
          >
            "{suggestion}"
          </div>
        ))}
      </div>
    </div>
  );
}