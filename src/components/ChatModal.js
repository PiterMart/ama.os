"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc, getDocs, writeBatch, where } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import styles from '../../styles/ChatModal.module.css';
import ChatSidebar from './ChatSidebar';
import PrivateChat from './PrivateChat';

const ChatModal = () => {
  const { user, login } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userColor, setUserColor] = useState('#007bff');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const messagesEndRef = useRef(null);

  // Update user's online status
  useEffect(() => {
    if (!user) return;

    const db = getFirestore();
    const userRef = doc(db, 'users', user.uid);

    // Set user as online
    updateDoc(userRef, {
      online: true,
      lastSeen: serverTimestamp()
    });

    // Set up listener for window close
    const handleBeforeUnload = () => {
      updateDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp()
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateDoc(userRef, {
        online: false,
        lastSeen: serverTimestamp()
      });
    };
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const db = getFirestore();
    const messagesRef = collection(db, 'chats', 'global', 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(newMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const loadUserColor = async () => {
      if (!user) return;
      
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().chatColor) {
          setUserColor(userDoc.data().chatColor);
        }
      } catch (error) {
        console.error('Error loading user color:', error);
      }
    };

    loadUserColor();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const db = getFirestore();

    try {
      // Get user's profile picture URL
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const profilePicture = userData?.profilePicture || null;

      await addDoc(collection(db, 'chats', 'global', 'messages'), {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userColor: userColor,
        profilePicture: profilePicture,
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);

    try {
      const result = await login(loginForm.email, loginForm.password);
      if (!result.success) {
        setLoginError(result.error);
      }
    } catch (error) {
      setLoginError(error.message);
    }
  };

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleColorChange = async (e) => {
    const newColor = e.target.value;
    setUserColor(newColor);
    
    if (user) {
      try {
        const db = getFirestore();
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          chatColor: newColor
        });

        // Update all previous messages from this user in the global chat
        const messagesRef = collection(db, 'chats', 'global', 'messages');
        const userMessagesQuery = query(messagesRef, where('userId', '==', user.uid));
        const snapshot = await getDocs(userMessagesQuery);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { userColor: newColor });
        });
        await batch.commit();
      } catch (error) {
        console.error('Error updating chat color:', error);
      }
    }
  };

  const handleSelectUser = (userId) => {
    console.log("User selected:", userId);
    setSelectedUserId(userId);
    setSelectedChatId(null);
  };

  const handleSelectChat = (chatId) => {
    console.log("Chat selected:", chatId);
    setSelectedChatId(chatId);
    setSelectedUserId(null);
  };

  return (
    <>
      <button 
        className={styles.chatButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        COMUNICATIONS
      </button>
      
      {isOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.chatTitle}>COMUNICATIONS</h2>
            <button 
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
            
            {!user ? (
              <div className={styles.welcomeContent}>
                <div className={styles.welcomeMessage}>
                  <p>Welcome to AMA OS. Please login to access the chat.</p>
                </div>
                <form onSubmit={handleLogin} className={styles.loginForm}>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={loginForm.email}
                    onChange={handleLoginChange}
                    required
                    className={styles.loginInput}
                  />
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    required
                    className={styles.loginInput}
                  />
                  <button type="submit" className={styles.loginButton}>
                    Login
                  </button>
                  {loginError && <p className={styles.error}>{loginError}</p>}
                </form>
              </div>
            ) : (
              <div className={styles.chatLayout}>
                <ChatSidebar 
                  onSelectUser={handleSelectUser}
                  onSelectChat={handleSelectChat}
                />
                
                <div className={styles.chatContent}>
                  {selectedUserId ? (
                    <PrivateChat 
                      otherUserId={selectedUserId}
                      onClose={() => setSelectedUserId(null)}
                    />
                  ) : selectedChatId ? (
                    <PrivateChat 
                      chatId={selectedChatId}
                      onClose={() => setSelectedChatId(null)}
                    />
                  ) : (
                    <>
                      <div className={styles.messages}>
                        {loading ? (
                          <p>Loading messages...</p>
                        ) : (
                          messages.map((message) => (
                            <div 
                              key={message.id} 
                              className={styles.message}
                            >
                              <div className={styles.messageHeader}>
                                {message.profilePicture ? (
                                  <img 
                                    src={message.profilePicture} 
                                    alt={message.userName}
                                    className={styles.profilePicture}
                                  />
                                ) : (
                                  <div className={styles.profilePicturePlaceholder}>
                                    {message.userName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span 
                                  className={styles.sender}
                                  style={{ color: message.userColor }}
                                >
                                  {message.userName}:
                                </span> 
                              </div>
                              <span className={styles.messageText}>
                                {message.text}
                              </span>
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      <form onSubmit={handleSubmit} className={styles.inputForm}>
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          className={styles.input}
                        />
                        <button type="submit" className={styles.sendButton}>
                          Send
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatModal;