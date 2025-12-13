"use client";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import styles from "../../styles/uploader.module.css";
import ArtistUploader from "../firebase/ArtistUploader";
import ExhibitionUploader from "../firebase/ExhibitionUploader";
import FairUploader from "../firebase/FairUpdater";
import HeadquarterEditor from "../firebase/HeadquarterEditor";
import ArtistsList from "../firebase/ArtistsList";
import ExhibitionsList from "../firebase/ExhibitionsList";
import { runMigration } from "../firebase/migrateArtworks";

export default function Home() {
  const [activeSection, setActiveSection] = useState("artist");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("Checking authentication...");
  
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("User Status:", currentUser);
      setUser(currentUser);
    });
  
    return () => unsubscribe();
  }, []);
  

  const handleLogin = async () => {
    setError(""); // Clear previous errorsL
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError("Invalid email or password.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  if (!user) {
    return (
      <div className={styles.loginContainer}> {/* Add CSS Module class */}
        <h2 className={styles.loginTitle}>Hello. <br></br> Login to access the admin panel.</h2>
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

  return (
    <div className={styles.page}>
      <main className={styles.main} style={{ maxWidth: "1500px", paddingTop: "10rem" }}>
        {/* Logout Button */}
        {/* <button onClick={handleLogout} style={{ position: "absolute", top: 20, right: 20 }}>
          Logout
        </button> */}

        {/* Navigation Buttons */}
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
        <div style={{ margin: "auto" }}>
          <p className={styles.title}> What are you working on?</p>
        </div>
        <div className={styles.navContainer}>
          <div className={styles.navGroup}>
            <button onClick={() => setActiveSection("artist")} className={styles.navButton}>Artists</button>
            <button onClick={() => setActiveSection("artistsList")} className={styles.navButton}>Artist List</button>
          </div>
          <div className={styles.navGroup}>
            <button onClick={() => setActiveSection("exhibition")} className={styles.navButton}>Exhibitions</button>
            <button onClick={() => setActiveSection("exhibitionsList")} className={styles.navButton}>Exhibition List</button>
          </div>
          <div className={styles.navGroup}>
            <button 
              onClick={() => window.location.href = '/uploader-activity'} 
              className={styles.navButton}
              style={{ backgroundColor: "#666", color: "white" }}
            >
              Activity Logs
            </button>
          </div>
          {/* <button onClick={runMigration} className={styles.subtitle} style={{ backgroundColor: "#ff6b6b", color: "white" }}>Migrate Artworks</button> */}
          {/* <button onClick={() => setActiveSection("fair")} className={styles.subtitle}>Fairs</button>
          <button onClick={() => setActiveSection("headquarter")} className={styles.subtitle}>Headquarters</button> */}
        </div>

        {/* Artist Section */}
        {activeSection === "artist" && (
          <div id="artist" style={{ width: "100%", padding: "1rem", display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "1000px", margin: "auto" }}>
            <p className={styles.title}>ARTIST UPLOADER</p>
            <ArtistUploader />
          </div>
        )}

        {/* Artists List Section */}
        {activeSection === "artistsList" && (
          <div id="artistsList" style={{ width: "100%", padding: "1rem", display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "1000px", margin: "auto" }}>
            <p className={styles.title}>ALL ARTISTS</p>
            <ArtistsList />
          </div>
        )}

        {/* Exhibition Section */}
        {activeSection === "exhibition" && (
          <div id="exhibition" style={{ width: "100%", padding: "1rem", display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "1000px", margin: "auto" }}>
            <p className={styles.title}>EXHIBITION UPLOADER</p>
            <ExhibitionUploader />
          </div>
        )}

        {/* Exhibitions List Section */}
        {activeSection === "exhibitionsList" && (
          <div id="exhibitionsList" style={{ width: "100%", padding: "1rem", display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "1000px", margin: "auto" }}>
            <p className={styles.title}>ALL EXHIBITIONS</p>
            <ExhibitionsList />
          </div>
        )}

        {/* Fair Section */}
        {activeSection === "fair" && (
          <div id="fair" style={{ width: "100%", padding: "1rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
            <p className={styles.title}>FAIR UPDATER</p>
            <FairUploader />
          </div>
        )}

        {/* Headquarter Section */}
        {activeSection === "headquarter" && (
          <div id="headquarter" style={{ width: "100%", padding: "1rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
            <p className={styles.title}>HEADQUARTER EDITOR</p>
            <HeadquarterEditor />
          </div>
        )}
      </main>
    </div>
  );
}
