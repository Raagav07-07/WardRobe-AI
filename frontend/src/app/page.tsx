"use client";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [messages, setMessage] = useState<{ sender: string; text: string }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const w = useRef<WebSocket | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  // Fix hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isMounted) return;

    // Add delay to ensure component is mounted
    const connectWebSocket = () => {
      try {
        console.log("Attempting to connect to WebSocket...");
        w.current = new WebSocket("ws://localhost:8000/ws");

        w.current.onopen = () => {
          console.log("✅ Connected to Tara");
          setIsConnected(true);
        };

        w.current.onclose = () => {
          console.log("❌ Disconnected from Tara");
          setIsConnected(false);
        };

        w.current.onmessage = (e) => {
          console.log("📨 Received:", e.data);
          try {
            const data = JSON.parse(e.data);

            if (data.type === "status") {
              console.log("⏳ Status:", data.message);
              setIsProcessing(true);
            } else if (data.type === "stream") {
              console.log(`🤖 Agent ${data.agent}:`, data.content);
              setMessage((prev) => [
                ...prev,
                {
                  sender: data.agent || "Tara",
                  text: data.content,
                },
              ]);
              setIsProcessing(false);
            } else if (data.type === "final_response") {
              console.log("✅ Final response:", data.content);
              // Only add if not already added via stream
              const lastMessage = messages[messages.length - 1];
              if (!lastMessage || lastMessage.text !== data.content) {
                setMessage((prev) => [
                  ...prev,
                  {
                    sender: data.agent || "Tara",
                    text: data.content,
                  },
                ]);
              }
              setIsProcessing(false);
            } else if (data.type === "error") {
              console.error("❌ Error:", data.content);
              setMessage((prev) => [
                ...prev,
                {
                  sender: "System",
                  text: `Error: ${data.content}`,
                },
              ]);
              setIsProcessing(false);
            } else if (data.text) {
              setMessage((prev) => [
                ...prev,
                {
                  sender: "Tara",
                  text: data.text,
                },
              ]);
              setIsProcessing(false);
            }
          } catch (error) {
            console.error("❌ Error parsing message:", error);
            setMessage((prev) => [
              ...prev,
              {
                sender: "Tara",
                text: e.data,
              },
            ]);
            setIsProcessing(false);
          }
        };

        w.current.onerror = (error) => {
          console.error(
            "❌ WebSocket error - make sure backend is running on port 8000"
          );
          setIsConnected(false);
          setIsProcessing(false);
        };
      } catch (error) {
        console.error("❌ Failed to create WebSocket:", error);
      }
    };

    // Delay connection slightly for client-side only
    const timer = setTimeout(connectWebSocket, 100);

    return () => {
      clearTimeout(timer);
      if (w.current) {
        w.current.close();
      }
    };
  }, [isMounted]);

  const sendMessage = () => {
    if (!w.current || w.current.readyState !== WebSocket.OPEN) {
      alert("Not connected to server. Please refresh the page.");
      return;
    }

    if (input.trim() !== "") {
      try {
        w.current.send(JSON.stringify({ text: input }));
        setMessage((prev) => [...prev, { sender: "User", text: input }]);
        setInput("");
        setIsProcessing(true);
      } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message. Please try again.");
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Don't render until client-side to avoid hydration issues
  if (!isMounted) {
    return null;
  }

  return (
    <main className="flex h-screen bg-gray-900 text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-4 flex flex-col gap-4">
        <h2 className="text-lg font-semibold mb-4">Menu</h2>
        <button
          onClick={() => (window.location.href = "/wardrobe/add")}
          className="w-full py-2 px-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Update Your Wardrobe
        </button>
        <button
          onClick={() => (window.location.href = "/wardrobe")}
          className="w-full py-2 px-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7m-9 3v7m0 0V7m0 10h6m-6 0H6"
            />
          </svg>
          Your Wardrobe
        </button>

        {/* Connection Status */}
        <div className="mt-auto">
          <div
            className={`flex items-center gap-2 text-sm ${
              isConnected ? "text-green-400" : "text-red-400"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-400" : "bg-red-400"
              }`}
            ></div>
            {isConnected ? "Connected" : "Disconnected"}
          </div>
        </div>
      </aside>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="p-4 bg-gray-800">
          <h1 className="text-xl font-semibold">Tara - Your Stylist</h1>
        </header>

        {/* Chat Messages */}
        <div
          ref={chatBoxRef}
          id="chat-box"
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-900 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 scrollbar-thumb-rounded-full scrollbar-track-rounded-full"
        >
          <div className="self-start bg-gray-700 text-white p-3 rounded-xl shadow-sm w-auto max-w-[80%]">
            Hello! I am Tara, Your personal Wardrobe Manager and Stylist. How
            can I help you?
          </div>

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`${
                msg.sender === "User"
                  ? "self-end bg-blue-600"
                  : "self-start bg-gray-700"
              } text-white p-3 rounded-xl shadow-sm w-auto max-w-[80%] break-words`}
            >
              {msg.sender !== "User" && (
                <div className="text-xs text-gray-300 mb-1 font-semibold">
                  {msg.sender}
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          ))}

          {isProcessing && (
            <div className="self-start bg-gray-700 text-white p-3 rounded-xl shadow-sm w-auto flex items-center gap-2">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
              <span className="text-sm text-gray-400">Tara is thinking...</span>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex items-center gap-3 p-4 bg-gray-800">
          <input
            type="text"
            value={input}
            placeholder={isConnected ? "Type your message..." : "Connecting..."}
            className="flex-1 bg-gray-700 p-3 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            style={{ fontFamily: "Victor Mono, monospace" }}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isProcessing || !isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={isProcessing || input.trim() === "" || !isConnected}
            className="bg-blue-600 p-3 rounded-full hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isConnected ? "Not connected to server" : "Send message"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.752 11.168l-9.336-6.24a1 1 0 00-1.416 1.416l6.24 9.336a1 1 0 001.416 0l9.336-6.24a1 1 0 000-1.416l-9.336-6.24a1 1 0 00-1.416 1.416l6.24 9.336z"
              />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        #chat-box::-webkit-scrollbar {
          width: 6px;
        }
        #chat-box::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 9999px;
        }
        #chat-box::-webkit-scrollbar-thumb {
          background-color: #4b5563;
          border-radius: 9999px;
        }
        #chat-box::-webkit-scrollbar-thumb:hover {
          background-color: #6b7280;
        }
      `}</style>
    </main>
  );
}
