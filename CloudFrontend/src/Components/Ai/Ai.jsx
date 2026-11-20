import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User } from "lucide-react";
import { getDataFundtion } from "../../Api/CRUDFunctions";

export default function ChatBotUI() {
    const [messages, setMessages] = useState([
        { from: "bot", text: "Hello! How can I help you today?" },
    ]);
    const [input, setInput] = useState("");
    const chatEndRef = useRef(null);

    const handleSend = async () => {
        if (!input.trim()) return;
        const newMessage = { from: "user", text: input };
        setMessages((prev) => [...prev, newMessage]);
        const query = input;
        setInput("");

        const encodedInput = encodeURIComponent(query);
        const res = await getDataFundtion(`/users/Ai/${encodedInput}`);
        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                { from: "bot", text: res },
            ]);
        }, 600);
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="pd-page flex min-h-screen flex-col items-center justify-center">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="pd-chat-shell flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
            >
                <div className="pd-chat-header flex items-center justify-between p-4">
                    <div className="flex items-center gap-2">
                        <Bot className="h-6 w-6" />
                        <h2 className="text-lg font-semibold">JS Cloud ChatBot</h2>
                    </div>
                </div>

                <div className="pd-chat-messages flex-1 space-y-3 overflow-y-auto p-4 text-lg">
                    {messages.map((msg, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`flex max-w-[75%] items-end gap-2 ${msg.from === "user" ? "flex-row-reverse" : "flex-row"}`}
                            >
                                {msg.from === "bot" ? (
                                    <Bot className="h-6 w-6 shrink-0" style={{ color: 'var(--pd-primary)' }} />
                                ) : (
                                    <User className="h-6 w-6 shrink-0" style={{ color: 'var(--pd-on-surface-variant)' }} />
                                )}
                                <div
                                    className={`whitespace-pre-wrap rounded-2xl p-3 text-base shadow-sm ${msg.from === "user" ? "pd-chat-bubble-user" : "pd-chat-bubble-bot"}`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    <div ref={chatEndRef} />
                </div>

                <div className="pd-chat-input-bar flex items-center gap-2 p-3">
                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        className="pd-input flex-1 rounded-xl"
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        className="pd-btn-save rounded-xl p-2"
                        aria-label="Send message"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}