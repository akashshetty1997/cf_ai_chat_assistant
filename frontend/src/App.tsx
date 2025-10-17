// frontend/src/App.tsx

import { useState, useEffect, useCallback } from "react";
import { ChatInterface } from "./components/ChatInterface";
import { Header } from "./components/Header";
import { GoalsDialog } from "./components/GoalsDialog";
import { useWebSocket } from "./hooks/useWebSocket";
import { Message } from "./types";

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [userId] = useState(() => {
    // Get or create user ID
    let id = localStorage.getItem("userId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("userId", id);
    }
    return id;
  });

  // CRITICAL FIX: Wrap the message handler in useCallback
  const handleIncomingMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []); // Empty dependency array - function never changes

  const { sendMessage, isConnected } = useWebSocket(userId, handleIncomingMessage);

  const handleSendMessage = (content: string) => {
    // Add user message to UI immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send through WebSocket
    return sendMessage(content);
  };

  // Load message history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem(`messages_${userId}`);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
      } catch (error) {
        console.error("Failed to load message history:", error);
      }
    }
  }, [userId]);

  // Save message history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`messages_${userId}`, JSON.stringify(messages));
    }
  }, [messages, userId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header
        isConnected={isConnected}
        onOpenGoals={() => setIsGoalsOpen(true)}
      />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isConnected={isConnected}
        />
      </main>

      <GoalsDialog
        open={isGoalsOpen}
        onOpenChange={setIsGoalsOpen}
        userId={userId}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}

export default App;