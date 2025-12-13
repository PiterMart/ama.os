"use client";
import { useEffect, useState, useMemo } from "react";
import { firestore } from "./firebaseConfig";
import { getDocs, collection, doc, getDoc } from "firebase/firestore";
import styles from "../../styles/uploader.module.css";

export default function ExhibitionsList() {
  const [exhibitions, setExhibitions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedExhibitions, setExpandedExhibitions] = useState(new Set());
  const [sortMode, setSortMode] = useState("date-desc");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchExhibitions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch exhibitions
        const exhibitionsSnapshot = await getDocs(collection(firestore, "exhibitions"));
        const exhibitionsData = exhibitionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Fetch artists for each exhibition
        const exhibitionsWithArtists = await Promise.all(
          exhibitionsData.map(async (exhibition) => {
            if (exhibition.artists && exhibition.artists.length > 0) {
              const artistsData = await Promise.all(
                exhibition.artists.map(async (artistEntry) => {
                  try {
                    // Handle both object format {artistSlug: "..."} and string format
                    const artistSlug = typeof artistEntry === 'object' && artistEntry.artistSlug 
                      ? artistEntry.artistSlug 
                      : (typeof artistEntry === 'string' ? artistEntry : null);
                    
                    if (!artistSlug) return null;
                    
                    const artistDoc = await getDoc(doc(firestore, "artists", artistSlug));
                    if (artistDoc.exists()) {
                      return {
                        id: artistDoc.id,
                        name: artistDoc.data().name || artistSlug,
                        ...artistDoc.data()
                      };
                    }
                    return null;
                  } catch (error) {
                    console.error(`Error fetching artist ${artistEntry}:`, error);
                    return null;
                  }
                })
              );
              return {
                ...exhibition,
                artists: artistsData.filter(artist => artist !== null)
              };
            }
            return {
              ...exhibition,
              artists: []
            };
          })
        );

        setExhibitions(exhibitionsWithArtists);
      } catch (error) {
        console.error("Error fetching exhibitions:", error);
        setError("Failed to load exhibitions data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExhibitions();
  }, []);

  const toggleExhibitionExpansion = (exhibitionId) => {
    setExpandedExhibitions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exhibitionId)) {
        newSet.delete(exhibitionId);
      } else {
        newSet.add(exhibitionId);
      }
      return newSet;
    });
  };

  // Filter exhibitions based on search query
  const filteredExhibitions = useMemo(() => {
    let filtered = exhibitions;
    
    // Filter by search query (names only)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = exhibitions.filter((exhibition) => {
        const name = (exhibition.name || "").toLowerCase();
        return name.includes(query);
      });
    }
    
    return filtered;
  }, [exhibitions, searchQuery]);

  // Sort exhibitions
  const sortedExhibitions = useMemo(() => {
    const comparator = (a, b) => {
      const nameA = String(a.name || "").toLowerCase();
      const nameB = String(b.name || "").toLowerCase();
      const nameComparison = nameA.localeCompare(nameB);
      
      // Date comparison
      const dateA = a.openingDate?.toDate ? a.openingDate.toDate().getTime() : 
                    (a.openingDate ? new Date(a.openingDate).getTime() : 0);
      const dateB = b.openingDate?.toDate ? b.openingDate.toDate().getTime() : 
                    (b.openingDate ? new Date(b.openingDate).getTime() : 0);
      const dateComparison = dateB - dateA; // Descending by default

      if (sortMode === "date-desc") {
        return dateComparison || nameComparison;
      }
      if (sortMode === "date-asc") {
        return (dateComparison * -1) || nameComparison;
      }
      if (sortMode === "name-asc") {
        return nameComparison;
      }
      if (sortMode === "name-desc") {
        return nameComparison * -1;
      }
      return nameComparison;
    };

    return [...filteredExhibitions].sort(comparator);
  }, [filteredExhibitions, sortMode]);

  if (isLoading) {
    return (
      <div className={styles.form}>
        <p>Loading exhibitions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.form}>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 className={styles.title} style={{ margin: 0 }}>
          Exhibitions ({sortedExhibitions.length})
        </h2>
        <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p className={styles.subtitle} style={{ marginBottom: "0.25rem" }}>Search</p>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.input}
              style={{ minWidth: "250px" }}
            />
          </div>
          <div>
            <p className={styles.subtitle} style={{ marginBottom: "0.25rem" }}>Sort by</p>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
              className={styles.input}
            >
              <option value="date-desc">Date (Most recent first)</option>
              <option value="date-asc">Date (Oldest first)</option>
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
            </select>
          </div>
        </div>
      </div>
      
      {sortedExhibitions.length === 0 ? (
        <p>No exhibitions found.</p>
      ) : (
        <div className={styles.artistsList}>
          {sortedExhibitions.map((exhibition) => {
            const isExpanded = expandedExhibitions.has(exhibition.id);
            const openingDate = exhibition.openingDate?.toDate ? exhibition.openingDate.toDate() : 
                               (exhibition.openingDate ? new Date(exhibition.openingDate) : null);
            const closingDate = exhibition.closingDate?.toDate ? exhibition.closingDate.toDate() : 
                               (exhibition.closingDate ? new Date(exhibition.closingDate) : null);
            
            return (
              <div key={exhibition.id} className={styles.artistCard}>
                <div 
                  className={styles.artistHeader}
                  onClick={() => toggleExhibitionExpansion(exhibition.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.artistInfo}>
                    <h3 className={styles.artistName}>
                      {exhibition.name}
                      <span className={styles.expandIcon}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </h3>
                    <p className={styles.artistId}>ID: {exhibition.id}</p>
                    {exhibition.subtitle && (
                      <p className={styles.artistOrigin}>Subtitle: {exhibition.subtitle}</p>
                    )}
                    {openingDate && closingDate && (
                      <p className={styles.artistOrigin}>
                        {openingDate.toLocaleDateString()} - {closingDate.toLocaleDateString()}
                      </p>
                    )}
                    {exhibition.isFeatured && (
                      <p className={styles.artistOrigin} style={{ color: "#8B7355", fontWeight: "600" }}>
                        Featured Exhibition
                      </p>
                    )}
                  </div>
                  {exhibition.banner && (
                    <div className={styles.artistProfilePicture}>
                      <img 
                        src={exhibition.banner} 
                        alt={`${exhibition.name} banner`}
                        className={styles.profileImage}
                      />
                    </div>
                  )}
                </div>

                <div className={`${styles.artistDetails} ${isExpanded ? styles.expanded : styles.collapsed}`}>
                  <div className={styles.artistBasicInfo}>
                    {exhibition.curator && (
                      <p className={styles.artistOrigin}>Curator: {exhibition.curator}</p>
                    )}
                    {exhibition.address && (
                      <p className={styles.artistOrigin}>Address: {exhibition.address}</p>
                    )}
                    {exhibition.googleMapsLink && (
                      <p className={styles.artistOrigin}>
                        <a href={exhibition.googleMapsLink} target="_blank" rel="noopener noreferrer">
                          View on Google Maps
                        </a>
                      </p>
                    )}
                  </div>

                  {exhibition.description && exhibition.description.length > 0 && (
                    <div className={styles.artistBio}>
                      <h4>Description:</h4>
                      {exhibition.description.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  )}

                  {exhibition.curatorialTexts && exhibition.curatorialTexts.length > 0 && (
                    <div className={styles.artistManifesto}>
                      <h4>Curatorial Texts:</h4>
                      {exhibition.curatorialTexts.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  )}

                  {exhibition.artists && exhibition.artists.length > 0 && (
                    <div className={styles.artistArtworks}>
                      <h4>Artists ({exhibition.artists.length}):</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                        {exhibition.artists.map((artist) => (
                          <span key={artist.id || artist} style={{ 
                            padding: "0.25rem 0.5rem", 
                            border: "1px solid #ccc", 
                            borderRadius: "4px",
                            fontSize: "0.9rem"
                          }}>
                            {artist.name || artist.id || artist}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {exhibition.gallery && exhibition.gallery.length > 0 && (
                    <div className={styles.artistArtworks}>
                      <h4>Gallery Images ({exhibition.gallery.length}):</h4>
                      <div className={styles.artworksGrid} style={{ marginTop: "0.5rem" }}>
                        {exhibition.gallery.slice(0, 6).map((galleryItem, index) => (
                          <div key={index} className={styles.artworkCard}>
                            <img 
                              src={galleryItem.url || galleryItem} 
                              alt={`Gallery ${index + 1}`}
                              className={styles.artworkThumbnail}
                            />
                          </div>
                        ))}
                        {exhibition.gallery.length > 6 && (
                          <div style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            border: "1px solid #ccc",
                            borderRadius: "4px"
                          }}>
                            <p>+{exhibition.gallery.length - 6} more</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

