"use client";
import { useEffect, useState, useRef } from "react";
import { firestore, storage } from "./firebaseConfig";
import { getDocs, addDoc, collection, doc, updateDoc, Timestamp, arrayUnion, getDoc } from "firebase/firestore"; 
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "../../styles/page.module.css";
import imageCompression from 'browser-image-compression';

export default function FairUploader() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [artists, setArtists] = useState([]);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [selectedArtworks, setSelectedArtworks] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    curator: "",
    curatorialTexts: [],
    openingDate: null,
    closingDate: null,
    location: "", // New field for location
    direction: "", // New field for direction
  });

  const [newCuratorialText, setNewCuratorialText] = useState("");
  const [images, setImages] = useState([]);
  const [imageDescriptions, setImageDescriptions] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef(null);
  const [fairs, setFairs] = useState([]);
  const [selectedFair, setSelectedFair] = useState(null);

  // Fetch all fairs on load
  useEffect(() => {
    const fetchFairs = async () => {
      try {
        const fairSnapshot = await getDocs(collection(firestore, "fairs"));
        const fairsData = fairSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setFairs(fairsData);
      } catch (error) {
        console.error("Error fetching fairs:", error);
      }
    };
    fetchFairs();
  }, []);

  // Load selected fair data into the form
  const handleFairSelection = async (fairId) => {
    try {
      const fairDoc = await getDoc(doc(firestore, "fairs", fairId));
      if (fairDoc.exists()) {
        const fairData = fairDoc.data();
        setSelectedFair(fairId);
        setFormData({
          ...fairData,
          openingDate: fairData.openingDate.toDate(),
          closingDate: fairData.closingDate.toDate(),
        });
        setImageDescriptions(fairData.gallery?.map((img) => img.description) || []);
        setImagePreviews(fairData.gallery?.map((img) => img.url) || []);
        setSelectedArtists(fairData.artists?.map((a) => a.artistSlug) || []);
        const artworksByArtist = {};
        (fairData.artists || []).forEach((artist) => {
          artworksByArtist[artist.artistSlug] = artist.selectedArtworks || [];
        });
        setSelectedArtworks(artworksByArtist);

      }
    } catch (error) {
      console.error("Error fetching fair:", error);
    }
  };

  const updateFair = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!selectedFair) throw new Error("No fair selected for updating.");

      const { name, openingDate, closingDate, location, direction } = formData;

      if (!name || !openingDate || !closingDate || !location || !direction) {
        throw new Error("Please complete all required fields.");
      }

      const slug = generateSlug(name);

      let galleryData;
      if (images.length > 0) {
        // Only upload images if new ones are added
        galleryData = await uploadImages(slug);
      } else {
        // Fetch current gallery data from Firebase if no new images are provided
        const fairDoc = await getDoc(doc(firestore, "fairs", selectedFair));
        galleryData = fairDoc.exists() ? fairDoc.data().gallery || [] : [];
      }

      const openingDateTimestamp = Timestamp.fromDate(new Date(openingDate));
      const closingDateTimestamp = Timestamp.fromDate(new Date(closingDate));

      const updatedFairData = {
        ...formData,
        slug,
        gallery: galleryData,
        openingDate: openingDateTimestamp,
        closingDate: closingDateTimestamp,
        artists: selectedArtists.map((artistSlug) => ({
          artistSlug,
          selectedArtworks: selectedArtworks[artistSlug] || [],
        })),
      };

      // Update the fair in Firebase
      await updateDoc(doc(firestore, "fairs", selectedFair), updatedFairData);

      setSuccess("Fair updated successfully!");
    } catch (error) {
      console.error("Error updating fair:", error);
      setError("Failed to update fair. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        const artistSnapshot = await getDocs(collection(firestore, "artists"));
        const artists = artistSnapshot.docs.map((doc) => ({
          ...doc.data(),
          slug: doc.id,
        }));
  
        if (artists.length === 0) {
          console.warn("No artists found!");
          return;
        }
  
        const artistsWithArtworks = await Promise.all(
          artists.map(async (artist) => {
            const artworksData = artist.artworks || [];
            const artworks = await Promise.all(
              artworksData.map(async (artworkId) => {
                const artworkDoc = await getDoc(doc(firestore, "artworks", artworkId));
                return artworkDoc.exists()
                  ? { id: artworkDoc.id, ...artworkDoc.data() }
                  : null;
              })
            );
            return {
              ...artist,
              artworks: artworks.filter((artwork) => artwork !== null),
            };
          })
        );
  
        setArtists(artistsWithArtworks);
        console.log("Fetched Artists with Artworks:", artistsWithArtworks);
      } catch (error) {
        console.error("Error fetching artist data:", error);
      }
    };
  
    fetchArtistData();
  }, []);

  const handleArtistSelection = (artist) => {
    const isSelected = selectedArtists.includes(artist.slug);
    const updatedArtists = isSelected
      ? selectedArtists.filter((a) => a !== artist.slug)
      : [...selectedArtists, artist.slug];
  
    setSelectedArtists(updatedArtists);
  
    if (!isSelected && !selectedArtworks[artist.slug]) {
      setSelectedArtworks((prev) => ({
        ...prev,
        [artist.slug]: [],
      }));
    }
  };
  
  const handleArtworkSelection = (artistSlug, artworkId) => {
    if (!artworkId) {
      console.error("Invalid artwork ID:", artworkId);
      return;
    }
  
    setSelectedArtworks((prevSelectedArtworks) => {
      const artistArtworks = prevSelectedArtworks[artistSlug] || [];
      const isSelected = artistArtworks.includes(artworkId);
  
      const updatedArtworks = isSelected
        ? artistArtworks.filter((id) => id !== artworkId) // Remove if already selected
        : [...artistArtworks, artworkId]; // Add if not selected
  
      return {
        ...prevSelectedArtworks,
        [artistSlug]: updatedArtworks,
      };
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    const previewURLs = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previewURLs);
  };

  const handleDateChange = (name, date) => {
    setFormData((prev) => ({ ...prev, [name]: date || "" }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleCuratorialTextChange = (e) => {
    setNewCuratorialText(e.target.value);
  };

  const addCuratorialText = () => {
    if (newCuratorialText) {
      setFormData((prev) => ({
        ...prev,
        curatorialTexts: [...prev.curatorialTexts, newCuratorialText],
      }));
      setNewCuratorialText("");
    }
  };

  const handleImageDescriptionChange = (index, value) => {
    const updatedDescriptions = [...imageDescriptions];
    updatedDescriptions[index] = value || "";
    setImageDescriptions(updatedDescriptions);
  };

const uploadImages = async (fairSlug) => {
  const galleryData = [];
  
  for (let i = 0; i < images.length; i++) {
    const imageFile = images[i];
    const description = imageDescriptions[i] || "";

    try {
      // Compress the image before uploading
      const compressedFile = await imageCompression(imageFile, {
        maxSizeMB: 1.5, // Adjust the maximum size in MB
        maxWidthOrHeight: 2000, // Adjust the maximum width or height
        useWebWorker: true, // Use web workers for better performance
      });

      // Define the storage path
      const imageRef = ref(storage, `fairs/${fairSlug}/images/${fairSlug}_image_${i + 1}`);
      
      // Upload the compressed file
      await uploadBytes(imageRef, compressedFile);

      // Get the download URL
      const downloadURL = await getDownloadURL(imageRef);

      // Push the image URL and description to the gallery data
      galleryData.push({ url: downloadURL, description });
    } catch (error) {
      console.error(`Error compressing or uploading image ${i + 1}:`, error);
      throw new Error(`Failed to upload image ${i + 1}`);
    }
  }

  return galleryData;
};


  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  };

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      curator: "",
      curatorialTexts: [],
      openingDate: "",
      closingDate: "",
      location: "",
      direction: "",
    });
    setSelectedFair(null);
    setSelectedArtists([]);
    setSelectedArtworks({});
    setImages([]);
    setImageDescriptions([]);
    setImagePreviews([]);
    setNewCuratorialText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }    
  }

  const addNewFair = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { name, openingDate, closingDate, location, direction } = formData;

      if (!name || !openingDate || !closingDate || !location || !direction) {
        throw new Error("Please complete all required fields.");
      }

      const slug = generateSlug(name);
      const galleryData = await uploadImages(slug);
      if (!galleryData) throw new Error("Image upload failed.");

      const openingDateTimestamp = Timestamp.fromDate(new Date(openingDate));
      const closingDateTimestamp = Timestamp.fromDate(new Date(closingDate));

      const newFairData = {
        ...formData,
        slug,
        gallery: galleryData,
        openingDate: openingDateTimestamp,
        closingDate: closingDateTimestamp,
        artists: selectedArtists.map((artistSlug) => ({
          artistSlug,
          selectedArtworks: selectedArtworks[artistSlug] || [],
        })),
      };

      const fairRef = await addDoc(collection(firestore, "fairs"), newFairData);

      for (const artistSlug of selectedArtists) {
        const artistRef = doc(firestore, "artists", artistSlug);
        await updateDoc(artistRef, {
          fairs: arrayUnion(fairRef.id),
        });
      }

      for (const artistSlug of Object.keys(selectedArtworks)) {
        const artworks = selectedArtworks[artistSlug];
        for (const artworkId of artworks) {
          const artworkRef = doc(firestore, "artworks", artworkId);
          await updateDoc(artworkRef, {
            fairs: arrayUnion(fairRef.id),
          });
        }
      }

      setSuccess("Fair added successfully!");
      resetForm();
    } catch (error) {
      console.error("Error adding fair:", error);
      setError("Failed to add fair. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.form}>
      <div>
      <select
        onChange={(e) => handleFairSelection(e.target.value)}
        value={selectedFair || ""}
      >
        <option value="" disabled>
          Select a Fair to Edit
        </option>
        {fairs.map((fair) => (
          <option key={fair.id} value={fair.id}>
            {fair.name}
          </option>
        ))}
      </select>
        {selectedFair && (
          <button onClick={resetForm} style={{ marginLeft: "10px" }}>
            Cancel
          </button>
        )}
      </div>

      <input
        name="name"
        placeholder="Fair Name"
        value={formData.name}
        onChange={handleInputChange}
      />
      <textarea
        name="description"
        placeholder="Fair Description"
        value={formData.description}
        onChange={handleInputChange}
      />
      <input
        name="location"
        placeholder="Fair Location"
        value={formData.location}
        onChange={handleInputChange}
      />
      <input
        name="direction"
        placeholder="Fair Direction"
        value={formData.direction}
        onChange={handleInputChange}
      />
      <input
        name="curator"
        placeholder="Curator Name"
        value={formData.curator}
        onChange={handleInputChange}
      />
      <div>
        <textarea
          placeholder="Add Curatorial Text"
          value={newCuratorialText}
          onChange={handleCuratorialTextChange}
        />
        <button onClick={addCuratorialText}>Add Curatorial Text</button>
        <ul>
          {formData.curatorialTexts.map((text, index) => (
            <li key={`${text}-${index}`}>
              <textarea
                value={text}
                onChange={(e) => {
                  const updatedTexts = [...formData.curatorialTexts];
                  updatedTexts[index] = e.target.value;
                  setFormData((prev) => ({ ...prev, curatorialTexts: updatedTexts }));
                }}
              />
              <button
                onClick={() => {
                  const updatedTexts = formData.curatorialTexts.filter((_, i) => i !== index);
                  setFormData((prev) => ({ ...prev, curatorialTexts: updatedTexts }));
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
      <DatePicker
        selected={formData.openingDate}
        onChange={(date) => handleDateChange("openingDate", date)}
        placeholderText="Opening Date"
      />
      <DatePicker
        selected={formData.closingDate}
        onChange={(date) => handleDateChange("closingDate", date)}
        placeholderText="Closing Date"
      />
      <div>
        {artists.length > 0 ? (
          artists.map((artist) => (
            <div key={artist.slug}>
              <input
                type="checkbox"
                checked={selectedArtists.includes(artist.slug)}
                onChange={() => handleArtistSelection(artist)}
              />
              <label>{artist.name}</label>
              {selectedArtists.includes(artist.slug) && artist.artworks.length > 0 && (
                <div>
                  <h4>Select Artworks</h4>
                  {artist.artworks.map((artwork) => (
                    <div key={artwork.id}>
                      <input
                        type="checkbox"
                        checked={selectedArtworks[artist.slug]?.includes(artwork.id) || false}
                        onChange={() => handleArtworkSelection(artist.slug, artwork.id)}
                      />
                      <label>{artwork.title}</label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p>Loading artists...</p>
        )}
      </div>
      <div>
        <p>Fair Images</p>
        {imagePreviews.map((preview, index) => (
          <div key={`current-image-${index}`}>
            <img src={preview} alt={`Current image ${index + 1}`} className={styles.artworkPreviewImage} />
            <textarea
              placeholder="Image Description"
              value={imageDescriptions[index] || ""}
              onChange={(e) => handleImageDescriptionChange(index, e.target.value)}
            />
          </div>
        ))}
        <input type="file" multiple onChange={handleFileChange} ref={fileInputRef} />
        {images.map((_, index) => (
          <div key={`image-${index}`}>
            <textarea
              placeholder="Image Description"
              value={imageDescriptions[index] || ""}
              onChange={(e) => handleImageDescriptionChange(index, e.target.value)}
            />
            {imagePreviews[index] && (
              <img
                src={imagePreviews[index]}
                alt={`Preview ${index + 1}`}
                className={styles.artworkPreviewImage}
              />
            )}
          </div>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}
      <button
        type="button"
        onClick={selectedFair ? updateFair : addNewFair}
        disabled={loading}
      >
        {loading ? "Processing..." : selectedFair ? "Update Fair" : "Add Fair"}
      </button>
    </div>
  );
}
