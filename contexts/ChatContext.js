'use client';

import { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export function ChatProvider({ children }) {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);

    const openChatModal = () => {
        setIsChatOpen(true);
    };

    const closeChatModal = () => {
        setIsChatOpen(false);
    };

    const sendMessage = async (message) => {
        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(prev => [...prev, { text: message, sender: 'user' }, { text: data.response, sender: 'bot' }]);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const value = {
        isChatOpen,
        messages,
        openChatModal,
        closeChatModal,
        sendMessage,
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
} 