// frontend/src/components/MessageBubble.tsx

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Message } from "../types";
import { Bot, User, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <Info className="w-4 h-4 text-slate-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <Avatar className={`w-8 h-8 ${isUser ? "bg-blue-500" : "bg-green-500"}`}>
        <AvatarFallback>
          {isUser ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-white" />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div
        className={`flex flex-col gap-1 max-w-[80%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <Card
          className={`px-4 py-3 ${
            isUser
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <div className="text-sm whitespace-pre-wrap break-words">
            <MessageContent content={message.content} isUser={isUser} />
          </div>
        </Card>

        {/* Timestamp */}
        <span className="text-xs text-slate-500 dark:text-slate-400 px-1">
          {formatDistanceToNow(message.timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string; isUser: boolean }) {
  // Parse markdown-style formatting
  const lines = content.split("\n");

  return (
    <>
      {lines.map((line, index) => {
        // Bold text: **text**
        if (line.includes("**")) {
          const parts = line.split("**");
          return (
            <p key={index} className="mb-2 last:mb-0">
              {parts.map((part, i) =>
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </p>
          );
        }

        // List items: - item or • item
        if (line.trim().startsWith("-") || line.trim().startsWith("•")) {
          return (
            <li key={index} className="ml-4 mb-1">
              {line.trim().substring(1).trim()}
            </li>
          );
        }

        // List items: * item
        if (line.trim().startsWith("*") && !line.includes("**")) {
          return (
            <li key={index} className="ml-4 mb-1">
              {line.trim().substring(1).trim()}
            </li>
          );
        }

        // Numbers at start: 1. item or ### heading
        if (/^\d+\./.test(line.trim())) {
          return (
            <li key={index} className="ml-4 mb-1 list-decimal">
              {line.trim().replace(/^\d+\.\s*/, "")}
            </li>
          );
        }

        // Headings: ### text
        if (line.trim().startsWith("###")) {
          return (
            <h3 key={index} className="font-bold text-base mt-3 mb-2">
              {line.trim().replace(/^###\s*/, "")}
            </h3>
          );
        }

        // Regular paragraph
        if (line.trim()) {
          return (
            <p key={index} className="mb-2 last:mb-0">
              {line}
            </p>
          );
        }

        // Empty line
        return <br key={index} />;
      })}
    </>
  );
}
