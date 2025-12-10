import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import styles from "../../styles/ChatModal.module.css";

export default function PrivateChat({ otherUserId, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherUserData, setOtherUserData] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [chatInitialized, setChatInitialized] = useState(false);
  const typingTimeoutRef = useRef(null);
  const bottomRef = useRef(null);

  const getChatId = (userA, userB) => {
    return [userA, userB].sort().join("_");
  };

  // Initialize chat and typing documents
  const initializeChat = async () => {
    if (!user || !otherUserId) {
      return;
    }

    try {
      const chatId = getChatId(user.uid, otherUserId);
      
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        const batch = writeBatch(db);
        
        // Create chat document
        batch.set(chatRef, {
          metadata: {
            participants: [user.uid, otherUserId],
            lastMessage: "",
            lastUpdated: serverTimestamp(),
          },
        });

        // Create typing documents for both users
        const userTypingRef = doc(db, "chats", chatId, "typing", user.uid);
        const otherUserTypingRef = doc(db, "chats", chatId, "typing", otherUserId);
        
        batch.set(userTypingRef, { isTyping: false });
        batch.set(otherUserTypingRef, { isTyping: false });

        await batch.commit();
      }

      setChatInitialized(true);
      setLoading(false);
    } catch (error) {
      console.error("Error initializing chat:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !otherUserId) {
      return;
    }

    setLoading(true);

    // Initialize chat first
    initializeChat();

    // Fetch other user's data
    const fetchOtherUserData = async () => {
      try {
        const otherUserRef = doc(db, "users", otherUserId);
        const otherUserDoc = await getDoc(otherUserRef);
        if (otherUserDoc.exists()) {
          setOtherUserData(otherUserDoc.data());
        }
      } catch (error) {
        console.error("Error fetching other user data:", error);
      }
    };

    fetchOtherUserData();

    const chatId = getChatId(user.uid, otherUserId);
    const chatRef = doc(db, "chats", chatId);
    const messagesRef = collection(chatRef, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            userName: data.userName || data.senderName || "Anonymous",
            userColor: data.userColor || "#007bff",
            profilePicture: data.profilePicture || null,
          };
        });
        setMessages(msgs);
        setLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      },
      (error) => {
        console.error("Error in message listener:", error);
        setLoading(false);
      }
    );

    // Set up typing status listener
    const typingRef = doc(db, "chats", chatId, "typing", otherUserId);
    const typingUnsubscribe = onSnapshot(typingRef, 
      (doc) => {
        setOtherUserTyping(doc.exists() && doc.data().isTyping);
      },
      (error) => {
        console.error("Error in typing listener:", error);
      }
    );

    return () => {
      unsubscribe();
      typingUnsubscribe();
      // Clear typing status when leaving
      if (chatInitialized) {
        const typingRef = doc(db, "chats", chatId, "typing", user.uid);
        updateDoc(typingRef, { isTyping: false }).catch(error => {
          console.error("Error clearing typing status:", error);
        });
      }
    };
  }, [user, otherUserId]);

  const handleInputChange = (e) => {
    if (!chatInitialized) {
      return;
    }
    
    const inputValue = e.target.value;
    setNewMessage(inputValue);
    
    // Update typing status based on input content
    const chatId = getChatId(user.uid, otherUserId);
    const typingRef = doc(db, "chats", chatId, "typing", user.uid);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing status based on whether there's content
    const isTyping = inputValue.trim().length > 0;
    updateDoc(typingRef, { isTyping }).catch(error => {
      console.error("Error updating typing status:", error);
    });
    
    // Set timeout to set typing to false after 1.5 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(typingRef, { isTyping: false }).catch(error => {
        console.error("Error clearing typing status:", error);
      });
    }, 1500);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !otherUserId || !chatInitialized) {
      return;
    }

    const chatId = getChatId(user.uid, otherUserId);
    const chatRef = doc(db, "chats", chatId);
    const messagesRef = collection(chatRef, "messages");

    try {
      // Clear typing status
      const typingRef = doc(db, "chats", chatId, "typing", user.uid);
      await updateDoc(typingRef, { isTyping: false });

      // Get user's profile picture URL
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const profilePicture = userData?.profilePicture || null;
      const userColor = userData?.chatColor || "#007bff";

      // Add the message
      await addDoc(messagesRef, {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName || user.email || "Anonymous",
        userColor: userColor,
        profilePicture: profilePicture,
        timestamp: serverTimestamp(),
      });

      // Update chat metadata
      await updateDoc(chatRef, {
        "metadata.lastMessage": newMessage,
        "metadata.lastUpdated": serverTimestamp(),
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
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

  return (
    <div className={styles.chatContent}>
      <div className={styles.chatHeader}>
        <span className={styles.otherUserName}>{otherUserData?.displayName || otherUserData?.userName || "User"}</span>
        <button onClick={onClose} className={styles.closeButton}>
          ×
        </button>
      </div>
      
      <div className={styles.messages}>
        {loading ? (
          <p>Loading messages...</p>
        ) : (
          groupMessages(messages).map((group, groupIndex) => {
            const isCurrentUser = group.userId === user?.uid;
            return (
              <div key={group.id || groupIndex} className={`${styles.message} ${isCurrentUser ? styles.messageOwn : ''}`}>
                <div className={styles.messageHeader}>
                  <span className={styles.messageText}>
                    {group.messages[0]}
                  </span>
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
        {otherUserTyping && (
          <div className={styles.typingIndicator}>
            <span>Typing...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className={styles.inputForm}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={handleInputChange}
          className={styles.input}
        />
        <button type="submit" className={styles.sendButton}>
          Send
        </button>
      </form>
    </div>
  );
} 