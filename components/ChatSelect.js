import { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import { collection, getDocs, query, where, doc, setDoc } from "firebase/firestore";
import styles from "../styles/ChatSelect.module.css";

export default function ChatSelect({ onSelectChat }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = collection(db, "users"); // Suponiendo que tienes una colección de "users"
      const snapshot = await getDocs(usersRef);
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
      setLoading(false);
    };

    fetchUsers();
  }, []);

  const handleSelectUser = async (selectedUserId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Generar el chatId único
    const chatId = [currentUser.uid, selectedUserId].sort().join("_");

    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    // Si el chat no existe, lo creamos
    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        users: [currentUser.uid, selectedUserId],
        createdAt: serverTimestamp(),
      });
    }

    // Pasamos el chatId al componente ChatModal
    onSelectChat(chatId);
  };

  return (
    <div className={styles.chatSelectContainer}>
      {loading ? (
        <p>Cargando usuarios...</p>
      ) : (
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              <button onClick={() => handleSelectUser(user.id)} className={styles.userButton}>
                Chatear con {user.name || user.email}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
