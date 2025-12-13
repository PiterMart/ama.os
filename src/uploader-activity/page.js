"use client";
import { useState, useEffect, useRef } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { auth, firestore } from "../firebase/firebaseConfig";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { logLogin, logLogout } from "../firebase/activityLogger";
import styles from "../../styles/uploader.module.css";

const HARDCODED_PASSWORD = "vigilando";

export default function ActivityLogsPage() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hardcodedPassword, setHardcodedPassword] = useState("");
  const [error, setError] = useState("");
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const previousUserRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const previousUser = previousUserRef.current;
      previousUserRef.current = currentUser;
      setUser(currentUser);
      
      if (currentUser && !previousUser) {
        await logLogin();
      }
      if (!currentUser && previousUser) {
        await logLogout();
        setIsAuthenticated(false);
      }
    });
  
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchActivityLogs();
    }
  }, [isAuthenticated, user]);

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      const logsQuery = query(
        collection(firestore, "activityLogs"),
        orderBy("timestamp", "desc"),
        limit(500)
      );
      const snapshot = await getDocs(logsQuery);
      const logs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          actionType: data.actionType || "unknown",
          resourceType: data.resourceType || null,
          resourceId: data.resourceId || null,
          user: data.user || { email: "unknown", uid: "unknown" },
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
          metadata: data.metadata || {},
        };
      });
      setActivityLogs(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      setError("Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError("Invalid email or password.");
    }
  };

  const handlePasswordCheck = () => {
    if (hardcodedPassword === HARDCODED_PASSWORD) {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect access password.");
    }
  };

  const handleLogout = async () => {
    await logLogout();
    setIsAuthenticated(false);
    setHardcodedPassword("");
    await signOut(auth);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      if (!user) {
        handleLogin();
      } else if (!isAuthenticated) {
        handlePasswordCheck();
      }
    }
  };

  const formatDate = (date) => {
    if (!date || !(date instanceof Date)) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  const getActionLabel = (actionType) => {
    const labels = {
      login: "Login",
      logout: "Logout",
      create: "Create",
      update: "Update",
      delete: "Delete",
    };
    return labels[actionType] || actionType;
  };

  const getResourceLabel = (resourceType) => {
    const labels = {
      artist: "Artist",
      exhibition: "Exhibition",
      artwork: "Artwork",
      fair: "Fair",
      headquarter: "Headquarter",
      member: "Member",
      event: "Event",
      article: "Article",
    };
    return labels[resourceType] || resourceType || "N/A";
  };

  // Show Firebase login if not authenticated
  if (!user) {
    return (
      <div className={styles.loginContainer}>
        <h2 className={styles.loginTitle}>
          Hello. <br></br> Login to access the activity logs.
        </h2>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.formGroup}>
          <p className={styles.helpText}>Email</p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyPress}
            className={styles.input}
          />
          <p className={styles.helpText}>Password</p>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyPress}
            className={styles.input}
          />
          <p className={styles.helpText}>Forgot your password? Contact the administrator.</p>
          <button onClick={handleLogin} className={styles.loginButton}>
            Login
          </button>
        </div>
      </div>
    );
  }

  // Show hardcoded password check if Firebase authenticated but not verified
  if (!isAuthenticated) {
    return (
      <div className={styles.loginContainer}>
        <h2 className={styles.loginTitle}>
          Additional Access Required
        </h2>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.formGroup}>
          <p className={styles.helpText}>Access Password</p>
          <input
            type="password"
            placeholder="Password"
            value={hardcodedPassword}
            onChange={(e) => setHardcodedPassword(e.target.value)}
            onKeyDown={handleKeyPress}
            className={styles.input}
          />
          <button onClick={handlePasswordCheck} className={styles.loginButton}>
            Verify
          </button>
          <button onClick={handleLogout} className={styles.loginButton} style={{ marginTop: "1rem", backgroundColor: "#666" }}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Show activity logs
  return (
    <div className={styles.page}>
      <main className={styles.main} style={{ maxWidth: "1500px", paddingTop: "10rem" }}>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
        
        <div style={{ margin: "auto", width: "100%", maxWidth: "1200px" }}>
          <p className={styles.title}>Activity Logs</p>
          
          {loading ? (
            <p style={{ textAlign: "center", padding: "2rem" }}>Loading logs...</p>
          ) : error ? (
            <p className={styles.error} style={{ textAlign: "center", padding: "2rem" }}>{error}</p>
          ) : (
            <div style={{ marginTop: "2rem", overflowX: "auto" }}>
              <table style={{ 
                width: "100%", 
                borderCollapse: "collapse",
                backgroundColor: "#fff",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                    <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Date/Time</th>
                    <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>User</th>
                    <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Action</th>
                    <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Resource Type</th>
                    <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Resource ID</th>
                    <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                        No activity logs available.
                      </td>
                    </tr>
                  ) : (
                    activityLogs.map((log) => (
                      <tr 
                        key={log.id} 
                        style={{ 
                          borderBottom: "1px solid #eee",
                          transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9f9f9"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <td style={{ padding: "1rem", fontSize: "0.9rem" }}>
                          {formatDate(log.timestamp)}
                        </td>
                        <td style={{ padding: "1rem", fontSize: "0.9rem" }}>
                          {log.user?.email || "unknown"}
                        </td>
                        <td style={{ padding: "1rem", fontSize: "0.9rem" }}>
                          <span style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.85rem",
                            fontWeight: "500",
                            backgroundColor: 
                              log.actionType === "login" ? "#e3f2fd" :
                              log.actionType === "logout" ? "#fff3e0" :
                              log.actionType === "create" ? "#e8f5e9" :
                              log.actionType === "update" ? "#fff9c4" :
                              log.actionType === "delete" ? "#ffebee" : "#f5f5f5",
                            color: 
                              log.actionType === "login" ? "#1976d2" :
                              log.actionType === "logout" ? "#f57c00" :
                              log.actionType === "create" ? "#388e3c" :
                              log.actionType === "update" ? "#f9a825" :
                              log.actionType === "delete" ? "#d32f2f" : "#666"
                          }}>
                            {getActionLabel(log.actionType)}
                          </span>
                        </td>
                        <td style={{ padding: "1rem", fontSize: "0.9rem" }}>
                          {getResourceLabel(log.resourceType)}
                        </td>
                        <td style={{ padding: "1rem", fontSize: "0.9rem", fontFamily: "monospace", color: "#666" }}>
                          {log.resourceId ? (
                            <span style={{ fontSize: "0.8rem" }}>{log.resourceId.substring(0, 8)}...</span>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td style={{ padding: "1rem", fontSize: "0.85rem", color: "#666" }}>
                          {log.metadata?.artistName && `Artist: ${log.metadata.artistName}`}
                          {log.metadata?.exhibitionName && `Exhibition: ${log.metadata.exhibitionName}`}
                          {log.metadata?.memberName && `Member: ${log.metadata.memberName}`}
                          {log.metadata?.eventName && `Event: ${log.metadata.eventName}`}
                          {log.metadata?.articleTitle && `Article: ${log.metadata.articleTitle}`}
                          {log.metadata?.fieldsUpdated && Array.isArray(log.metadata.fieldsUpdated) && `Fields: ${log.metadata.fieldsUpdated.length}`}
                          {!log.metadata?.artistName && !log.metadata?.exhibitionName && !log.metadata?.memberName && !log.metadata?.eventName && !log.metadata?.articleTitle && (!log.metadata?.fieldsUpdated || !Array.isArray(log.metadata.fieldsUpdated)) && "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              <div style={{ marginTop: "1rem", textAlign: "center", color: "#666", fontSize: "0.9rem" }}>
                Showing {activityLogs.length} logs (last 500)
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

