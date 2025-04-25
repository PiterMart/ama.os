import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  getDocs,
  limit,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import styles from "../styles/ChatSidebar.module.css";

export default function ChatSidebar({ onSelectChat, onSelectUser }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Fetch all users except the current one
    const usersRef = collection(db, "users");
    const usersQuery = query(usersRef, where("email", "!=", user.email));
    
    const unsubscribeUsers = onSnapshot(usersQuery, 
      (snapshot) => {
        const userList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            online: data.online || false
          };
        });
        setUsers(userList);
      },
      (error) => {
        console.error("Error fetching users:", error);
        setError("Failed to load users");
      }
    );

    // Fetch conversations
    const conversationsRef = collection(db, "chats");
    const conversationsQuery = query(
      conversationsRef,
      where("metadata.participants", "array-contains", user.uid)
    );

    console.log("Setting up conversation listener for user:", user.uid);

    const unsubscribeConversations = onSnapshot(conversationsQuery, 
      async (snapshot) => {
        try {
          console.log("Received conversations snapshot:", snapshot.docs.length, "docs");
          
          const convos = await Promise.all(
            snapshot.docs.map(async (chatDoc) => {
              const data = chatDoc.data();
              console.log("Processing chat:", chatDoc.id, "Data:", data);
              
              // Check if this is a global chat
              if (data.metadata?.isGlobal) {
                console.log("Found global chat:", chatDoc.id);
                return {
                  id: chatDoc.id,
                  lastMessage: data.metadata?.lastMessage || "",
                  lastUpdated: data.metadata?.lastUpdated || new Date(),
                  otherUser: {
                    name: "Global Chat",
                    online: true
                  },
                  isGlobal: true
                };
              }

              // For private chats
              try {
                const otherUserId = data.metadata?.participants?.find((id) => id !== user.uid);
                console.log("Private chat participants:", data.metadata?.participants, "Other user:", otherUserId);
                
                if (!otherUserId) {
                  console.warn("No other participant found in chat:", chatDoc.id);
                  return null;
                }

                // Get the other user's data
                const otherUserRef = doc(db, "users", otherUserId);
                const otherUserDoc = await getDoc(otherUserRef);
                
                if (!otherUserDoc.exists()) {
                  console.warn("Other user document not found:", otherUserId);
                  return null;
                }

                const otherUserData = otherUserDoc.data();
                console.log("Other user data:", otherUserData);

                // Get the last message
                let lastMessage = data.metadata?.lastMessage || "";
                try {
                  const messagesRef = collection(db, `chats/${chatDoc.id}/messages`);
                  const messagesQuery = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
                  const messagesSnapshot = await getDocs(messagesQuery);
                  if (!messagesSnapshot.empty) {
                    lastMessage = messagesSnapshot.docs[0].data().content;
                  }
                  console.log("Last message for chat", chatDoc.id, ":", lastMessage);
                } catch (error) {
                  console.warn("Error fetching last message:", error);
                }

                return {
                  id: chatDoc.id,
                  lastMessage,
                  lastUpdated: data.metadata?.lastUpdated || new Date(),
                  otherUser: {
                    id: otherUserId,
                    name: otherUserData?.displayName || otherUserData?.email,
                    online: otherUserData?.online || false,
                  },
                  isGlobal: false
                };
              } catch (error) {
                console.error("Error processing private chat:", error);
                return null;
              }
            })
          );
          
          // Filter out any null conversations and sort by lastUpdated
          const validConversations = convos.filter(convo => convo !== null);
          console.log("Valid conversations:", validConversations.length);
          console.log("Conversation details:", validConversations);
          
          validConversations.sort((a, b) => {
            const timeA = a.lastUpdated?.toDate?.() || new Date(0);
            const timeB = b.lastUpdated?.toDate?.() || new Date(0);
            return timeB - timeA;
          });
          
          setConversations(validConversations);
          setLoading(false);
          setError(null);
        } catch (error) {
          console.error("Error processing conversations:", error);
          setError("Failed to load conversations");
        }
      },
      (error) => {
        console.error("Error fetching conversations:", error);
        setError("Failed to load conversations");
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeConversations();
    };
  }, [user]);

  if (error) {
    return (
      <div className={styles.sidebar}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const onlineUsers = users.filter(u => u.online === true);

  return (
    <div className={styles.sidebar}>
      <div className={styles.section}>
        <h3>ONLINE</h3>
        <div className={styles.userList}>
          {onlineUsers.length === 0 ? (
            <p>No users online</p>
          ) : (
            onlineUsers.map((user) => (
              <div
                key={user.id}
                className={styles.userItem}
                onClick={() => onSelectUser(user.id)}
              >
                <div className={styles.userInfo}>
                  <span className={styles.userName}>
                    {user.displayName || user.email}
                  </span>
                  <span className={styles.onlineStatus}></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h3>CONVERSATIONS</h3>
        <div className={styles.conversationList}>
          {loading ? (
            <p>Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <p>No conversations yet</p>
          ) : (
            conversations.map((convo) => (
              <div
                key={convo.id}
                className={styles.conversationItem}
                onClick={() => onSelectUser(convo.otherUser.id)}
              >
                <div className={styles.conversationInfo}>
                  <span className={styles.otherUserName}>
                    {convo.otherUser.name}
                  </span>
                  <span className={styles.lastMessage}>{convo.lastMessage}</span>
                </div>
                <span className={styles.lastUpdated}>
                  {convo.lastUpdated ? new Date(convo.lastUpdated.toDate?.() || convo.lastUpdated).toLocaleTimeString() : ''}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 