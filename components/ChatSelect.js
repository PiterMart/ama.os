import { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import { collection, getDocs, query, where, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import styles from "../styles/ChatSelect.module.css";
import PrivateChat from "./PrivateChat";

export default function ChatSelect() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "!=", currentUser.uid));
      const snapshot = await getDocs(q);
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const handleSelectUser = async (selectedUserId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Generate chatId
    const chatId = [currentUser.uid, selectedUserId].sort().join("_");
    const chatRef = doc(db, "chats", "privateChats", chatId);

    // Check if chat exists, if not create it
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        metadata: {
          participants: [currentUser.uid, selectedUserId],
          lastMessage: "",
          lastUpdated: serverTimestamp(),
        },
      });
    }

    setSelectedUserId(selectedUserId);
    setShowChat(true);
  };

  return (
    <div className={styles.chatSelectContainer}>
      {showChat ? (
        <PrivateChat 
          otherUserId={selectedUserId} 
          onClose={() => setShowChat(false)} 
        />
      ) : (
        <>
          <h3>Select a user to chat with:</h3>
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <ul className={styles.userList}>
              {users.map((user) => (
                <li key={user.id} className={styles.userItem}>
                  <button 
                    onClick={() => handleSelectUser(user.id)} 
                    className={styles.userButton}
                  >
                    {user.displayName || user.email}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
