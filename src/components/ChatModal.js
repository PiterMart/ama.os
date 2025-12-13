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
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userColor, setUserColor] = useState('#007bff');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('global'); // 'global' or 'conversations'
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef(null);
  const modalRef = useRef(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

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
    setSelectedUserId(userId);
    setSelectedChatId(null);
    setShowSidebar(false);
  };

  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
    setSelectedUserId(null);
    setShowSidebar(false);
  };

  const handleBackToGlobal = () => {
    setSelectedUserId(null);
    setSelectedChatId(null);
    setActiveTab('global');
  };

  const handleBackToConversations = () => {
    setSelectedUserId(null);
    setSelectedChatId(null);
    setActiveTab('conversations');
  };

  // Group consecutive messages from the same user
  const groupMessages = (messages) => {
    if (!messages || messages.length === 0) return [];
    
    const grouped = [];
    let currentGroup = null;
    
    messages.forEach((message, index) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const isSameUser = prevMessage && prevMessage.userId === message.userId;
      
      if (isSameUser && currentGroup) {
        // Add to existing group
        currentGroup.messages.push(message.text);
      } else {
        // Start new group
        if (currentGroup) {
          grouped.push(currentGroup);
        }
        currentGroup = {
          id: message.id,
          userId: message.userId,
          userName: message.userName,
          userColor: message.userColor,
          profilePicture: message.profilePicture,
          messages: [message.text],
        };
      }
    });
    
    if (currentGroup) {
      grouped.push(currentGroup);
    }
    
    return grouped;
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 850); // Match animation duration
  };

  // Swipe to close functionality (matches Navbar behavior)
  const handleTouchStart = (e) => {
    if (!isOpen) return;
    const touch = e.touches[0];
    setDragStart(touch.clientX);
  };

  const handleTouchMove = (e) => {
    if (!isOpen || dragStart === null) return;
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const diff = currentX - dragStart;
    
    // Only allow dragging to the left (negative values) to close
    if (diff < 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isOpen || dragStart === null) return;
    
    // If dragged more than 100px to the left, close the modal with animation
    if (dragOffset < -100) {
      handleClose();
      setDragOffset(0);
    } else {
      // Reset position smoothly
      setDragOffset(0);
    }
    setDragStart(null);
  };

  // Get transition style for modal (matches Navbar behavior)
  const getTransitionStyle = () => {
    if (dragOffset !== 0) {
      return 'none';
    }
    return 'transform 0.3s ease';
  };

  // Get modal style with transform
  const getModalStyle = () => {
    const style = {
      transition: getTransitionStyle()
    };
    
    if (dragOffset !== 0) {
      style.transform = `translateX(${dragOffset}px)`;
    }
    
    return style;
  };

  return (
    <>
      <button 
        className={`${styles.chatButton} ${isOpen ? styles.open : ''}`}
        onClick={() => {
          if (isOpen) {
            handleClose();
          } else {
            setIsOpen(true);
          }
        }}
      >
        <span className={styles.bar}></span>
      </button>
      
      {(isOpen || isClosing) && (
        <div 
          ref={modalRef}
          className={`${styles.modal} ${isOpen && !isClosing ? styles.open : ''} ${isClosing ? styles.closing : ''}`}
          style={isClosing ? {} : getModalStyle()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.modalContent}>
            {/* Header */}
            <div className={styles.header}>
              <button 
                className={styles.closeButton}
                onClick={handleClose}
              >
                ×
              </button>
              {user && (selectedUserId || selectedChatId) && (
                <button 
                  className={styles.backButton}
                  onClick={selectedUserId || selectedChatId ? handleBackToGlobal : () => setShowSidebar(!showSidebar)}
                >
                  ←
                </button>
              )}
            </div>
            
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
              <>
                {/* Tab Navigation */}
                {!selectedUserId && !selectedChatId && (
                  <div className={styles.tabNavigation}>
                    <div className={styles.tabContainer}>
                      <button 
                        className={`${styles.tabButton} ${activeTab === 'global' ? styles.active : ''}`}
                        onClick={() => setActiveTab('global')}
                      >
                        GLOBAL
                      </button>
                      <button 
                        className={`${styles.tabButton} ${activeTab === 'conversations' ? styles.active : ''}`}
                        onClick={() => setActiveTab('conversations')}
                      >
                        PRIVATE
                      </button>
                      <div className={`${styles.tabIndicator} ${activeTab === 'global' ? styles.indicatorLeft : styles.indicatorRight}`}></div>
                    </div>
                  </div>
                )}

                {/* Chat Content */}
                <div className={styles.chatContent}>
                  {selectedUserId ? (
                    <PrivateChat 
                      otherUserId={selectedUserId}
                      onClose={handleBackToGlobal}
                    />
                  ) : selectedChatId ? (
                    <PrivateChat 
                      chatId={selectedChatId}
                      onClose={handleBackToGlobal}
                    />
                  ) : activeTab === 'global' ? (
                    <>
                      <div className={styles.messages}>
                        {loading ? (
                          <p>Loading messages...</p>
                        ) : (
                          groupMessages(messages).map((group, groupIndex) => {
                            const isCurrentUser = group.userId === user?.uid;
                            return (
                              <div 
                                key={group.id || groupIndex} 
                                className={`${styles.message} ${isCurrentUser ? styles.messageOwn : ''}`}
                              >
                                <div className={styles.messageHeader}>
                                  {!isCurrentUser && (
                                    <>
                                      {group.profilePicture ? (
                                        <img 
                                          src={group.profilePicture} 
                                          alt={group.userName}
                                          className={styles.profilePicture}
                                        />
                                      ) : (
                                        <div className={styles.profilePicturePlaceholder}>
                                          {group.userName.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <span 
                                        className={styles.sender}
                                        style={{ color: group.userColor }}
                                      >
                                        {group.userName}:
                                      </span>
                                    </>
                                  )}
                                  <span className={styles.messageText}>
                                    {group.messages[0]}
                                  </span>
                                  {isCurrentUser && (
                                    <>
                                      <span 
                                        className={styles.sender}
                                        style={{ color: group.userColor }}
                                      >
                                        {group.userName}:
                                      </span>
                                      {group.profilePicture ? (
                                        <img 
                                          src={group.profilePicture} 
                                          alt={group.userName}
                                          className={styles.profilePicture}
                                        />
                                      ) : (
                                        <div className={styles.profilePicturePlaceholder}>
                                          {group.userName.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                                {group.messages.length > 1 && (
                                  <div className={`${styles.messageGroup} ${isCurrentUser ? styles.messageGroupOwn : ''}`}>
                                    {group.messages.slice(1).map((text, msgIndex) => (
                                      <span key={msgIndex + 1} className={styles.messageText}>
                                        {text}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
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
                  ) : (
                    <ChatSidebar 
                      onSelectUser={handleSelectUser}
                      onSelectChat={handleSelectChat}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatModal;