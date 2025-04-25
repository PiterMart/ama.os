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
import styles from "../styles/ChatModal.module.css";

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
      console.log("Missing user or otherUserId:", { user, otherUserId });
      return;
    }

    try {
      const chatId = getChatId(user.uid, otherUserId);
      console.log("Initializing chat with ID:", chatId);
      
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        console.log("Creating new chat document");
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
        console.log("Chat initialization completed successfully");
      } else {
        console.log("Chat document already exists");
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
      console.log("Skipping chat setup - missing user or otherUserId");
      return;
    }

    console.log("Starting chat setup with user:", user.uid, "and other user:", otherUserId);
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
        } else {
          console.log("Other user document not found");
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

    console.log("Setting up message listener");

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log("Message snapshot received");
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
      console.log("Cleaning up chat listeners");
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
      console.log("Chat not initialized yet, ignoring input");
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
      console.log("Cannot send message:", {
        hasMessage: !!newMessage.trim(),
        hasUser: !!user,
        hasOtherUser: !!otherUserId,
        isInitialized: chatInitialized
      });
      return;
    }

    const chatId = getChatId(user.uid, otherUserId);
    console.log("Sending message to chat:", chatId);

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

  return (
    <div className={styles.chatContent}>
      <div className={styles.chatHeader}>
        <h3>{otherUserData?.displayName || "User"}</h3>
        <button onClick={onClose} className={styles.closeButton}>
          ×
        </button>
      </div>
      
      <div className={styles.messages}>
        {loading ? (
          <p>Loading messages...</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={styles.message}>
              <div className={styles.messageHeader}>
                {msg.profilePicture ? (
                  <img
                    src={msg.profilePicture}
                    alt={msg.userName}
                    className={styles.profilePicture}
                  />
                ) : (
                  <div className={styles.profilePicturePlaceholder}>
                    {(msg.userName || "A").charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  className={styles.sender}
                  style={{ color: msg.userColor }}
                >
                  {msg.userName}:
                </span>
              </div>
              <span className={styles.messageText}>{msg.text}</span>
            </div>
          ))
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