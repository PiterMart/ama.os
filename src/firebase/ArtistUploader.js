"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { firestore, storage } from "./firebaseConfig";
import { getDocs, addDoc, collection, doc, updateDoc, Timestamp, arrayUnion, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { logCreate, logUpdate, RESOURCE_TYPES } from "./activityLogger";
import styles from "../../styles/uploader.module.css";
import imageCompression from 'browser-image-compression';

export default function ArtistUploader() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [existingArtworks, setExistingArtworks] = useState([]);
  const [deletedArtworks, setDeletedArtworks] = useState([]);

  const fileInputRef = useRef(null);
  const mainArtworkInputRef = useRef(null);
  const detailImagesInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    origin: "",
    bio: [],
    manifesto: [],
    web: "",
    slug: "",
    profilePicture: "",
    cvUrl: "",
    birthDate: null,
  });

  const [newArtwork, setNewArtwork] = useState({
    file: null,
    images: [],
    title: "",
    date: "",
    medium: "",
    measurements: "",
    description: "",
    price: "",
    availability_status: "NOT_FOR_SALE",
    extras: [],
  });

  const [newExtra, setNewExtra] = useState("");
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [artworkImageUpdates, setArtworkImageUpdates] = useState({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCvDragOver, setIsCvDragOver] = useState(false);
  const [isMainArtworkDragOver, setIsMainArtworkDragOver] = useState(false);
  const [isDetailImagesDragOver, setIsDetailImagesDragOver] = useState(false);
  const [editingArtworkIndex, setEditingArtworkIndex] = useState(null);
  const [updateMainImageDragOver, setUpdateMainImageDragOver] = useState({});
  const [updateDetailImagesDragOver, setUpdateDetailImagesDragOver] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const artistSnapshot = await getDocs(collection(firestore, "artists"));
        const artistsData = artistSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setArtists(artistsData);
      } catch (error) {
        console.error("Error fetching artists:", error);
      }
    };
    fetchArtists();
  }, []);

  // Filter artists based on search query and get top 4 matches
  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim()) {
      return artists;
    }
    const query = searchQuery.toLowerCase().trim();
    const matches = artists.filter((artist) => {
      const name = (artist.name || "").toLowerCase();
      return name.includes(query);
    });
    
    // Sort by relevance (exact matches first, then by position of match)
    const sorted = matches.sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      
      // Exact match gets highest priority
      if (nameA === query) return -1;
      if (nameB === query) return 1;
      
      // Starts with query gets second priority
      if (nameA.startsWith(query)) return -1;
      if (nameB.startsWith(query)) return 1;
      
      // Otherwise sort by position of match (earlier match = higher priority)
      const indexA = nameA.indexOf(query);
      const indexB = nameB.indexOf(query);
      if (indexA !== indexB) return indexA - indexB;
      
      // Finally sort alphabetically
      return nameA.localeCompare(nameB);
    });
    
    return sorted;
  }, [artists, searchQuery]);

  // Get top 4 search results for dropdown
  const topSearchResults = useMemo(() => {
    if (!searchQuery.trim() || filteredArtists.length === 0) {
      return [];
    }
    return filteredArtists.slice(0, 4);
  }, [filteredArtists, searchQuery]);

  const handleArtistSelection = async (artistId) => {
    setSelectedArtist(artistId);
    setDeletedArtworks([]); // Clear deleted artworks when selecting artist
    if (!artistId) {
      resetForm();
      return;
    }

    try {
      const artistDoc = await getDoc(doc(firestore, "artists", artistId));
      if (artistDoc.exists()) {
        const data = artistDoc.data();
        setFormData({
          ...data,
          birthDate: data.birthDate?.toDate() || null,
          bio: data.bio || [],
          manifesto: data.manifesto || []
        });

        // Load profile picture preview
        setProfilePicturePreview(data.profilePicture || null);

        // Fetch artworks
        if (data.artworks?.length > 0) {
          const artworksData = await Promise.all(
            data.artworks.map(async artworkId => {
              const artworkDoc = await getDoc(doc(firestore, "artworks", artworkId));
              if (!artworkDoc.exists()) return null;
              
              const artworkData = artworkDoc.data();
              return {
                id: artworkDoc.id,
                title: artworkData.title,
                date: artworkData.date,
                medium: artworkData.medium,
                measurements: artworkData.measurements,
                description: artworkData.description,
                price: artworkData.price || null,
                availability_status: artworkData.availability_status || "NOT_FOR_SALE",
                url: artworkData.url,  // Ensure this matches Firestore field name
                images: artworkData.images || artworkData.detailImages || [],  // Handle both field names
                extras: artworkData.extras || []
              };
            })
          );
          setExistingArtworks(artworksData.filter(artwork => artwork !== null));
        }
      }
    } catch (error) {
      console.error("Error loading artist data:", error);
      setError("Failed to load artist data.");
    }
  };

  const compressImage = async (file, options) => {
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error("Compression error:", error);
      throw error;
    }
  };

  const uploadProfilePicture = async (artistId) => {
    if (!(profilePictureFile instanceof File)) {
      return formData.profilePicture; // Return existing URL if no new file
    }
  
    try {
      const compressedFile = await imageCompression(profilePictureFile, {
        maxSizeMB: 0.25,
        maxWidthOrHeight: 800
      });
      
      const profilePicRef = ref(storage, `artists/${artistId}/profilePicture/${artistId}_profilePicture`);
      await uploadBytes(profilePicRef, compressedFile);
      return await getDownloadURL(profilePicRef);
    } catch (error) {
      console.error("Profile picture upload failed:", error);
      throw error;
    }
  };

  const uploadArtworkImages = async (artistId, artworkId, artworkData) => {
    try {
      if (!(artworkData.file instanceof File)) {
        throw new Error("Invalid main artwork file");
      }
  
      // Upload main artwork image
      const compressedMain = await imageCompression(artworkData.file, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 2000,
        useWebWorker: true
      });
      
      const mainRef = ref(storage, `artists/${artistId}/artworks/${artworkId}/${artworkId}`);
      await uploadBytes(mainRef, compressedMain);
      const mainUrl = await getDownloadURL(mainRef);
  
      // Upload detail images
      const detailUrls = [];
      for (let imgIndex = 0; imgIndex < artworkData.images.length; imgIndex++) {
        const imageFile = artworkData.images[imgIndex];
        const compressedDetail = await imageCompression(imageFile, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 2000,
          useWebWorker: true
        });
        
        const detailRef = ref(
          storage, 
          `artists/${artistId}/artworks/${artworkId}/details/${artworkId}_detail_${imgIndex + 1}`
        );
        await uploadBytes(detailRef, compressedDetail);
        const detailUrl = await getDownloadURL(detailRef);
        detailUrls.push(detailUrl);
      }
  
      return { mainUrl, detailUrls };
    } catch (error) {
      console.error("Artwork upload failed:", error);
      throw error;
    }
  };

  const updateArtworkImages = async (artistId, artworkId, imageUpdates, currentArtwork) => {
    try {
      const updateData = {};
      
      // Handle main image update
      if (imageUpdates.mainImage instanceof File) {
        // Delete old main image if it exists
        if (currentArtwork.url) {
          try {
            const oldMainRef = ref(storage, currentArtwork.url);
            await deleteObject(oldMainRef);
          } catch (deleteError) {
            console.warn("Could not delete old main image:", deleteError);
          }
        }
        
        const compressedMain = await imageCompression(imageUpdates.mainImage, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 2000,
          useWebWorker: true
        });
        
        const mainRef = ref(storage, `artists/${artistId}/artworks/${artworkId}/${artworkId}`);
        await uploadBytes(mainRef, compressedMain);
        const mainUrl = await getDownloadURL(mainRef);
        updateData.url = mainUrl;
      }
      
      // Handle detail images update
      if (imageUpdates.detailImages && imageUpdates.detailImages.length > 0) {
        // Delete old detail images if they exist
        if (currentArtwork.images && currentArtwork.images.length > 0) {
          for (const oldDetailUrl of currentArtwork.images) {
            try {
              const oldDetailRef = ref(storage, oldDetailUrl);
              await deleteObject(oldDetailRef);
            } catch (deleteError) {
              console.warn("Could not delete old detail image:", deleteError);
            }
          }
        }
        
        const detailUrls = [];
        for (let imgIndex = 0; imgIndex < imageUpdates.detailImages.length; imgIndex++) {
          const imageFile = imageUpdates.detailImages[imgIndex];
          const compressedDetail = await imageCompression(imageFile, {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 2000,
            useWebWorker: true
          });
          
          const detailRef = ref(
            storage, 
            `artists/${artistId}/artworks/${artworkId}/details/${artworkId}_detail_${imgIndex + 1}`
          );
          await uploadBytes(detailRef, compressedDetail);
          const detailUrl = await getDownloadURL(detailRef);
          detailUrls.push(detailUrl);
        }
        updateData.images = detailUrls;
      }
      
      // Update the artwork document in Firestore
      if (Object.keys(updateData).length > 0) {
        await updateDoc(doc(firestore, "artworks", artworkId), updateData);
      }
      
      return updateData;
    } catch (error) {
      console.error("Artwork image update failed:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
  
    try {
      const { name, origin, bio, manifesto, web } = formData;
      if (!name) throw new Error("Name is required");
  
      const slug = generateSlug(name);
      const artistId = selectedArtist || doc(collection(firestore, "artists")).id;
  
      // Upload profile picture
      const profilePicUrl = await uploadProfilePicture(artistId);
  
      // Upload CV
      let cvUrl = formData.cvUrl || "";
      if (cvFile instanceof File) {
        const cvRef = ref(storage, `artists/${artistId}/cv/${artistId}_cv`);
        await uploadBytes(cvRef, cvFile);
        cvUrl = await getDownloadURL(cvRef);
      }
  
      // Process artworks
      const artworkIds = [];
      
      // Delete artworks that were removed from the collection
      for (const deletedArtwork of deletedArtworks) {
        if (deletedArtwork.id) {
          try {
            // Delete from artworks collection
            await deleteDoc(doc(firestore, "artworks", deletedArtwork.id));
            
            // Delete images from storage if they exist
            if (deletedArtwork.url) {
              try {
                const mainImageRef = ref(storage, deletedArtwork.url);
                await deleteObject(mainImageRef);
              } catch (storageError) {
                console.warn("Could not delete main image from storage:", storageError);
              }
            }
            
            // Delete detail images from storage
            if (deletedArtwork.images && deletedArtwork.images.length > 0) {
              for (const detailUrl of deletedArtwork.images) {
                try {
                  const detailImageRef = ref(storage, detailUrl);
                  await deleteObject(detailImageRef);
                } catch (storageError) {
                  console.warn("Could not delete detail image from storage:", storageError);
                }
              }
            }
          } catch (deleteError) {
            console.error("Error deleting artwork:", deleteError);
            // Continue with other operations even if deletion fails
          }
        }
      }
      
      // Process existing artworks
      for (const artwork of existingArtworks) {
        if (!artwork.id) { // New artwork added in form
          const artworkId = doc(collection(firestore, "artworks")).id;
          const { mainUrl, detailUrls } = await uploadArtworkImages(artistId, artworkId, artwork);
          
          const artworkDoc = {
            artistId,
            artistSlug: slug,
            artworkSlug: artworkId, // Use artwork ID for consistency with migrated data
            title: artwork.title,
            date: artwork.date,
            medium: artwork.medium,
            measurements: artwork.measurements,
            description: artwork.description,
            price: artwork.price ? parseFloat(artwork.price) : null,
            availability_status: artwork.availability_status || "NOT_FOR_SALE",
            extras: artwork.extras || [],
            url: mainUrl,
            images: detailUrls,
            exhibitions: [],
            fairs: [],
            createdAt: Timestamp.now()
          };
  
          await setDoc(doc(firestore, "artworks", artworkId), artworkDoc);
          artworkIds.push(artworkId);
        } else {
          // Update existing artwork if data has changed
          try {
            const artworkUpdateData = {
              title: artwork.title,
              date: artwork.date,
              medium: artwork.medium,
              measurements: artwork.measurements,
              description: artwork.description,
              price: artwork.price ? parseFloat(artwork.price) : null,
              availability_status: artwork.availability_status || "NOT_FOR_SALE",
              extras: artwork.extras || []
            };
            
            // Check if there are image updates for this artwork
            const imageUpdates = artworkImageUpdates[artwork.id];
            if (imageUpdates) {
              const imageUpdateData = await updateArtworkImages(artistId, artwork.id, imageUpdates, artwork);
              Object.assign(artworkUpdateData, imageUpdateData);
            }
            
            await updateDoc(doc(firestore, "artworks", artwork.id), artworkUpdateData);
            artworkIds.push(artwork.id);
          } catch (updateError) {
            console.error("Error updating artwork:", updateError);
            // Still include the artwork ID even if update fails
            artworkIds.push(artwork.id);
          }
        }
      }
  
      // Update/Create artist document
      const artistData = {
        name,
        origin,
        bio,
        manifesto,
        web,
        slug,
        profilePicture: profilePicUrl,
        cvUrl,
        birthDate: formData.birthDate ? Timestamp.fromDate(formData.birthDate) : null,
        artworks: artworkIds
      };
  
      if (selectedArtist) {
        await updateDoc(doc(firestore, "artists", selectedArtist), artistData);
        await logUpdate(RESOURCE_TYPES.ARTIST, selectedArtist, {
          artistName: name,
          fieldsUpdated: Object.keys(artistData),
        });
        setSuccess("Artist updated successfully! Please refresh the page to see the updated artist.");
      } else {
        const artistRef = doc(firestore, "artists", artistId);
        await setDoc(artistRef, artistData);
        await logCreate(RESOURCE_TYPES.ARTIST, artistId, {
          artistName: name,
        });
        setSelectedArtist(artistId);
        setSuccess("Artist created successfully! Please refresh the page to see the new artist.");
      }
  
      // Clear deleted artworks after successful submission
      setDeletedArtworks([]);
      resetForm();
    } catch (error) {
      console.error("Submission error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Profile Picture Drag and Drop Handlers
  const handleProfilePictureFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setProfilePictureFile(file);
      setProfilePicturePreview(URL.createObjectURL(file));
    } else {
      setError('Please select a valid image file.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleProfilePictureFile(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleProfilePictureFile(file);
    }
  };

  // CV Drag and Drop Handlers
  const handleCvFile = (file) => {
    if (file && file.type === 'application/pdf') {
      setCvFile(file);
    } else {
      setError('Please select a valid PDF file.');
    }
  };

  const handleCvDragOver = (e) => {
    e.preventDefault();
    setIsCvDragOver(true);
  };

  const handleCvDragLeave = (e) => {
    e.preventDefault();
    setIsCvDragOver(false);
  };

  const handleCvDrop = (e) => {
    e.preventDefault();
    setIsCvDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleCvFile(files[0]);
    }
  };

  const handleCvFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleCvFile(file);
    }
  };


  const resetForm = () => {
    if (profilePicturePreview) URL.revokeObjectURL(profilePicturePreview);
    if (newArtwork.file) URL.revokeObjectURL(URL.createObjectURL(newArtwork.file));
    newArtwork.images.forEach(file => URL.revokeObjectURL(URL.createObjectURL(file)));

    setFormData({
      name: "",
      origin: "",
      bio: [],
      manifesto: [],
      web: "",
      slug: "",
      profilePicture: "",
      cvUrl: "",
      birthDate: null,
    });
    setNewArtwork({
      file: null,
      images: [],
      title: "",
      date: "",
      medium: "",
      measurements: "",
      description: "",
      price: "",
      availability_status: "NOT_FOR_SALE",
      extras: [],
    });
    setExistingArtworks([]);
    setDeletedArtworks([]);
    setProfilePictureFile(null);
    setProfilePicturePreview(null);
    setCvFile(null);
    setArtworkImageUpdates({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  useEffect(() => {
    return () => {
      if (profilePicturePreview) URL.revokeObjectURL(profilePicturePreview);
    };
  }, [profilePicturePreview]);


  const deleteArtwork = async (index) => {
    try {
      const artworkToDelete = existingArtworks[index];
      
      // Add to deleted artworks list
      setDeletedArtworks(prev => [...prev, artworkToDelete]);
      
      // Remove from existing artworks
      setExistingArtworks(prev => prev.filter((_, i) => i !== index));
      
    } catch (error) {
      console.error("Error deleting artwork:", error);
      setError("Failed to delete artwork");
    }
  };

  const handleExistingArtworkChange = (index, field, value) => {
    setExistingArtworks(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  };

  const handleExistingArtworkExtrasChange = (index, extras) => {
    setExistingArtworks(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        extras: extras
      };
      return updated;
    });
  };

  const handleArtworkMainImageChange = (artworkId, file) => {
    if (file instanceof File) {
      setArtworkImageUpdates(prev => ({
        ...prev,
        [artworkId]: {
          ...prev[artworkId],
          mainImage: file
        }
      }));
    }
  };

  const handleArtworkDetailImagesChange = (artworkId, files) => {
    const fileArray = Array.from(files).filter(file => file instanceof File);
    if (fileArray.length > 0) {
      setArtworkImageUpdates(prev => ({
        ...prev,
        [artworkId]: {
          ...prev[artworkId],
          detailImages: fileArray
        }
      }));
    }
  };

  // Update Main Image Drag and Drop Handlers
  const handleUpdateMainImageDragOver = (e, artworkId) => {
    e.preventDefault();
    setUpdateMainImageDragOver(prev => ({ ...prev, [artworkId]: true }));
  };

  const handleUpdateMainImageDragLeave = (e, artworkId) => {
    e.preventDefault();
    setUpdateMainImageDragOver(prev => ({ ...prev, [artworkId]: false }));
  };

  const handleUpdateMainImageDrop = (e, artworkId) => {
    e.preventDefault();
    setUpdateMainImageDragOver(prev => ({ ...prev, [artworkId]: false }));
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleArtworkMainImageChange(artworkId, files[0]);
    }
  };

  // Update Detail Images Drag and Drop Handlers
  const handleUpdateDetailImagesDragOver = (e, artworkId) => {
    e.preventDefault();
    setUpdateDetailImagesDragOver(prev => ({ ...prev, [artworkId]: true }));
  };

  const handleUpdateDetailImagesDragLeave = (e, artworkId) => {
    e.preventDefault();
    setUpdateDetailImagesDragOver(prev => ({ ...prev, [artworkId]: false }));
  };

  const handleUpdateDetailImagesDrop = (e, artworkId) => {
    e.preventDefault();
    setUpdateDetailImagesDragOver(prev => ({ ...prev, [artworkId]: false }));
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      handleArtworkDetailImagesChange(artworkId, files);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleBirthDateChange = (e) => {
    setFormData({ ...formData, birthDate: new Date(e.target.value) });
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file instanceof File) {
      setProfilePictureFile(file);
      setProfilePicturePreview(URL.createObjectURL(file));
    } else {
      setError("Invalid profile picture file");
    }
  };
  
  const handleNewArtworkFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleMainArtworkFile(file);
    }
  };
  
  const handleArtworkImagesChange = (e) => {
    const files = Array.from(e.target.files).filter(file => file instanceof File);
    if (files.length > 0) {
      setNewArtwork(prev => ({ ...prev, images: files }));
    }
  };

  // Main Artwork Drag and Drop Handlers
  const handleMainArtworkFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setNewArtwork(prev => ({ ...prev, file }));
    } else {
      setError("Please select a valid main artwork image file");
    }
  };

  const handleMainArtworkDragOver = (e) => {
    e.preventDefault();
    setIsMainArtworkDragOver(true);
  };

  const handleMainArtworkDragLeave = (e) => {
    e.preventDefault();
    setIsMainArtworkDragOver(false);
  };

  const handleMainArtworkDrop = (e) => {
    e.preventDefault();
    setIsMainArtworkDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleMainArtworkFile(files[0]);
    }
  };

  // Detail Images Drag and Drop Handlers
  const handleDetailImagesDragOver = (e) => {
    e.preventDefault();
    setIsDetailImagesDragOver(true);
  };

  const handleDetailImagesDragLeave = (e) => {
    e.preventDefault();
    setIsDetailImagesDragOver(false);
  };

  const handleDetailImagesDrop = (e) => {
    e.preventDefault();
    setIsDetailImagesDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      setNewArtwork(prev => ({ ...prev, images: files }));
    }
  };

  const handleNewArtworkChange = (field, value) => {
    setNewArtwork((prevArtwork) => ({
      ...prevArtwork,
      [field]: value,
    }));
  };

  const addArtwork = () => {
    if (!(newArtwork.file instanceof File)) {
      setError("Please select a valid main image file");
      return;
    }
    if (!newArtwork.title.trim() || !newArtwork.medium.trim()) {
      setError("Title and Medium are required fields");
      return;
    }
  
    setExistingArtworks(prev => [...prev, newArtwork]);
    setNewArtwork({
      file: null,
      images: [],
      title: "",
      date: "",
      medium: "",
      measurements: "",
      description: "",
      price: "",
      availability_status: "NOT_FOR_SALE",
      extras: [],
    });
  };





  const handleCvChange = (e) => {
    const file = e.target.files[0];
    setCvFile(file);
  };

  const addExtra = (index) => {
    if (newExtra.trim()) {
      handleExtraChange(index, newExtra.trim());
      setNewExtra("");
    }
  };

  const handleExtraChange = (index, value) => {
    setExistingArtworks(prev => {
      const updated = [...prev];
      if (!updated[index].extras) {
        updated[index].extras = [];
      }
      updated[index].extras.push(value);
      return updated;
    });
  };

  const removeExtra = (artworkIndex, extraIndex) => {
    setExistingArtworks(prev => {
      const updated = [...prev];
      updated[artworkIndex].extras.splice(extraIndex, 1);
      return updated;
    });
  };

  const uploadCv = async (artistId) => {
    if (!cvFile) return null;
    const cvRef = ref(storage, `artists/${artistId}/cv/${artistId}_cv`);
    await uploadBytes(cvRef, cvFile);
    return await getDownloadURL(cvRef);
  };

  return (
    <div className={styles.form}>
      <div>
      <p className={styles.subtitle}>SELECT ARTIST TO EDIT</p>
        <div style={{ marginBottom: "0.5rem", position: "relative" }}>
          <input
            type="text"
            placeholder="Search artist..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => {
              if (searchQuery.trim()) {
                setShowSearchResults(true);
              }
            }}
            onBlur={(e) => {
              // Delay hiding dropdown to allow click events
              setTimeout(() => {
                // Check if the blur is due to clicking on a result
                const relatedTarget = e.relatedTarget || document.activeElement;
                if (!relatedTarget || !relatedTarget.closest('.search-results-dropdown')) {
                  setShowSearchResults(false);
                }
              }, 200);
            }}
            style={{
              width: "100%",
              padding: "0.5rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          {/* Search Results Dropdown */}
          {showSearchResults && searchQuery.trim() && topSearchResults.length > 0 && (
            <div 
              className="search-results-dropdown"
              onMouseDown={(e) => e.preventDefault()} // Prevent input blur
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                borderRadius: "4px",
                marginTop: "0.25rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                zIndex: 1000,
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {topSearchResults.map((artist) => (
                <div
                  key={artist.id}
                  onClick={() => {
                    handleArtistSelection(artist.id);
                    setSearchQuery("");
                    setShowSearchResults(false);
                  }}
                  style={{
                    padding: "0.75rem 1rem",
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div style={{ fontWeight: "500", color: "#333" }}>
                    {artist.name}
                  </div>
                  {artist.origin && (
                    <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
                      {artist.origin}
                    </div>
                  )}
                </div>
              ))}
              {filteredArtists.length > 4 && (
                <div style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  color: "#666",
                  borderTop: "1px solid #eee",
                  backgroundColor: "#f9f9f9",
                }}>
                  +{filteredArtists.length - 4} more results. Use dropdown to see all.
                </div>
              )}
            </div>
          )}
          {showSearchResults && searchQuery.trim() && topSearchResults.length === 0 && (
            <div 
              className="search-results-dropdown"
              onMouseDown={(e) => e.preventDefault()}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                borderRadius: "4px",
                marginTop: "0.25rem",
                padding: "0.75rem 1rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                zIndex: 1000,
                color: "#666",
              }}
            >
              No artists found
            </div>
          )}
        </div>
        <select
          value={selectedArtist || ""}
          onChange={(e) => handleArtistSelection(e.target.value)}
        >
          <option value="">Create New Artist</option>
          {filteredArtists.map(artist => (
            <option key={artist.id} value={artist.id}>
              {artist.name}
            </option>
          ))}
        </select>
      </div>
      {/* Artist ID Display */}
      {selectedArtist && (
        <div className={styles.artistIdDisplay}>
          <span className={styles.artistIdLabel}>Artist ID:</span>
          <span className={styles.artistIdValue}>{selectedArtist}</span>
        </div>
      )}

      {/* Artist Information Container */}
      <div className={styles.artistInfoContainer}>
        {/* Profile Picture and Basic Info Row */}
        <div className={styles.profileAndBasicInfoRow}>
          {/* Profile Picture Upload */}
          <div className={styles.profilePictureContainer}>
            <p className={styles.subtitle}>PROFILE PICTURE</p>
            <div
              className={`${styles.profilePictureDropZone} ${isDragOver ? styles.dragOver : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {profilePicturePreview ? (
                <div className={styles.profilePicturePreview}>
                  <img 
                    src={profilePicturePreview} 
                    alt="Profile Preview" 
                    className={styles.profilePreviewImage}
                  />
                  <div className={styles.profilePictureOverlay}>
                    <span>Click or drag to change</span>
                  </div>
                </div>
              ) : (
                <div className={styles.profilePicturePlaceholder}>
                  <p>Drag & drop an image here</p>
                  <p>or click to browse</p>
                  <small>Max size: 500px width</small>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Basic Information Container */}
          <div className={styles.basicInfoContainer}>
          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>NAME</p>
            <input
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>ORIGIN</p>
            <input
              name="origin"
              placeholder="Origin"
              value={formData.origin}
              onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>BIRTH DATE</p>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate ? formData.birthDate.toISOString().split('T')[0] : ''}
              onChange={handleBirthDateChange}
            />
          </div>

          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>WEBSITE</p>
            <input
              name="web"
              placeholder="Website"
              value={formData.web}
              onChange={(e) => setFormData({ ...formData, web: e.target.value })}
            />
          </div>
          </div>
        </div>

        {/* Bio Paragraphs Input */}
        <div>
          <p className={styles.subtitle}>BIO</p>
          <textarea
            placeholder="Add Bio Text (one paragraph per line)"
            value={formData.bio.join('\n')}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value.split('\n').filter(p => p.trim()) })}
          />
          <p className={styles.helpText}>Each line will become a separate paragraph. Press Enter to create new paragraphs.</p>
        </div>

        {/* Manifesto Paragraphs Input */}
        <div>
          <p className={styles.subtitle}>MANIFESTO</p>
          <textarea
            placeholder="Add Manifesto Text (one paragraph per line)"
            value={formData.manifesto.join('\n')}
            onChange={(e) => setFormData({ ...formData, manifesto: e.target.value.split('\n').filter(p => p.trim()) })}
          />
          <p className={styles.helpText}>Each line will become a separate paragraph. Press Enter to create new paragraphs.</p>
        </div>

        {/* CV File Input */}
        <div>
          <p className={styles.subtitle}>CV (PDF)</p>
          <div
            className={`${styles.cvDropZone} ${isCvDragOver ? styles.dragOver : ''}`}
            onDragOver={handleCvDragOver}
            onDragLeave={handleCvDragLeave}
            onDrop={handleCvDrop}
            onClick={() => document.getElementById('cv-file-input')?.click()}
          >
            {cvFile ? (
              <div className={styles.cvFileSelected}>
                <p>{cvFile.name}</p>
                <span>Click or drag to change</span>
              </div>
            ) : (
              <div className={styles.cvFilePlaceholder}>
                <p>Drag & drop a PDF here</p>
                <p>or click to browse</p>
                <small>PDF files only</small>
              </div>
            )}
          </div>
          <input
            id="cv-file-input"
            type="file"
            name="cv"
            accept=".pdf"
            onChange={handleCvFileInputChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Add New Artwork Container */}
      <div>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Add New Artwork</h3>
        <div className={styles.artistInfoContainer}>
          <div className={styles.artworkFormSection}>
        
        {/* Artwork Metadata Inputs */}
        <div className={styles.artworkMetadata}>
          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>TITLE *</p>
            <input
              type="text"
              placeholder="Artwork Title"
              value={newArtwork.title}
              onChange={(e) => handleNewArtworkChange('title', e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>DATE *</p>
            <input
              type="text"
              placeholder="Date"
              value={newArtwork.date}
              onChange={(e) => handleNewArtworkChange('date', e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>MEDIUM *</p>
            <input
              type="text"
              placeholder="Medium"
              value={newArtwork.medium}
              onChange={(e) => handleNewArtworkChange('medium', e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>MEASUREMENTS</p>
            <input
              type="text"
              placeholder="Measurements"
              value={newArtwork.measurements}
              onChange={(e) => handleNewArtworkChange('measurements', e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>DESCRIPTION *</p>
            <textarea
              placeholder="Artwork Description"
              value={newArtwork.description}
              onChange={(e) => handleNewArtworkChange('description', e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>PRICE</p>
            <input
              type="number"
              placeholder="Price"
              value={newArtwork.price}
              onChange={(e) => handleNewArtworkChange('price', e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>AVAILABILITY STATUS</p>
            <select
              value={newArtwork.availability_status}
              onChange={(e) => handleNewArtworkChange('availability_status', e.target.value)}
            >
              <option value="NOT_FOR_SALE">Not For Sale</option>
              <option value="FOR_SALE">For Sale</option>
              <option value="ON_AUCTION">On Auction</option>
              <option value="SOLD">Sold</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>
          
          {/* Extras Input */}
          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>EXTRA INFORMATION</p>
            <div className={styles.extrasInput}>
              <input
                type="text"
                placeholder="Add extra information"
                value={newExtra}
                onChange={(e) => setNewExtra(e.target.value)}
              />
              <button 
                type="button" 
                onClick={() => {
                  if (newExtra.trim()) {
                    setNewArtwork(prev => ({
                      ...prev,
                      extras: [...(prev.extras || []), newExtra.trim()]
                    }));
                    setNewExtra("");
                  }
                }}
              >
                Add Extra
              </button>
            </div>
            
            {/* Display Extras */}
            {newArtwork.extras && newArtwork.extras.length > 0 && (
              <div className={styles.extrasList}>
                {newArtwork.extras.map((extra, index) => (
                  <span key={index} className={styles.extraTag}>
                    {extra}
                    <button 
                      type="button" 
                      onClick={() => setNewArtwork(prev => ({
                        ...prev,
                        extras: prev.extras.filter((_, i) => i !== index)
                      }))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Image Upload Sections */}
        <div className={styles.imageUploadSection}>
          {/* Main Artwork Image */}
          <div className={styles.uploadGroup}>
            <p className={styles.subtitle}>MAIN ARTWORK IMAGE *</p>
            <div
              className={`${styles.cvDropZone} ${isMainArtworkDragOver ? styles.dragOver : ''}`}
              onDragOver={handleMainArtworkDragOver}
              onDragLeave={handleMainArtworkDragLeave}
              onDrop={handleMainArtworkDrop}
              onClick={() => mainArtworkInputRef.current?.click()}
            >
              {newArtwork.file ? (
                <div className={styles.profilePicturePreview}>
                  <img 
                    src={URL.createObjectURL(newArtwork.file)} 
                    alt="Main artwork preview" 
                    style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                  />
                  <div className={styles.profilePictureOverlay}>
                    <span>Click or drag to change</span>
                  </div>
                </div>
              ) : (
                <div className={styles.cvFilePlaceholder}>
                  <p>Drag & drop main artwork image here</p>
                  <p>or click to browse</p>
                  <small>Required - Single image</small>
                </div>
              )}
            </div>
            <input
              ref={mainArtworkInputRef}
              type="file"
              accept="image/*"
              onChange={handleNewArtworkFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Detail Images */}
          <div className={styles.uploadGroup}>
            <p className={styles.subtitle}>DETAIL IMAGES (OPTIONAL)</p>
            <div
              className={`${styles.cvDropZone} ${isDetailImagesDragOver ? styles.dragOver : ''}`}
              onDragOver={handleDetailImagesDragOver}
              onDragLeave={handleDetailImagesDragLeave}
              onDrop={handleDetailImagesDrop}
              onClick={() => detailImagesInputRef.current?.click()}
            >
              <div className={styles.cvFilePlaceholder}>
                <p>Drag & drop detail images here</p>
                <p>or click to browse</p>
                <small>Multiple images allowed</small>
              </div>
            </div>
            <input
              ref={detailImagesInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleArtworkImagesChange}
              style={{ display: 'none' }}
            />
            
            {/* Detail Images Preview */}
            {newArtwork.images.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <p className={styles.subtitle}>SELECTED DETAIL IMAGES ({newArtwork.images.length})</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '1rem' }}>
                  {newArtwork.images.map((file, index) => (
                    <div key={`detail-${index}`} className={styles.imageContainer} style={{ display: 'flex', flexDirection: 'column', width: '300px', border: '1px solid gray', padding: '1rem' }}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Detail preview ${index + 1}`}
                        className={styles.previewImage}
                        style={{ width: '100%', height: 'auto', objectFit: 'cover', maxHeight: '300px', marginBottom: 'auto' }}
                      />
                      <button
                        type="button"
                        style={{ color: "red", marginTop: '0.5rem', cursor: 'pointer', padding: '0.5rem' }}
                        onClick={() => setNewArtwork(prev => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index)
                        }))}
                      >
                        DELETE
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button 
          type="button" 
          onClick={addArtwork}
          disabled={!newArtwork.file || !newArtwork.title || !newArtwork.medium}
        >
          Add Artwork to Collection
        </button>
          </div>
        </div>
      </div>

      {/* Existing Artworks Container */}
      {existingArtworks.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Existing Artworks ({existingArtworks.length})</h3>
          <div className={styles.artistInfoContainer}>
            {/* Artworks List */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
              {existingArtworks.map((artwork, index) => {
                // Determine the image source: use url for existing artworks, or create object URL for newly added ones
                const imageSrc = artwork.url || (artwork.file instanceof File ? URL.createObjectURL(artwork.file) : null);
                
                return (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '200px', border: '1px solid #ddd', padding: '1rem' }}>
                    {imageSrc ? (
                      <img 
                        src={imageSrc} 
                        alt={artwork.title} 
                        style={{ width: '100%', height: '150px', objectFit: 'cover', marginBottom: '0.5rem' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '150px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ color: '#999', fontSize: '0.8rem' }}>No image</span>
                      </div>
                    )}
                    <p style={{ fontWeight: '600', textAlign: 'center', margin: '0.5rem 0', fontSize: '0.9rem' }}>{artwork.title}</p>
                    <button 
                      type="button" 
                      onClick={() => setEditingArtworkIndex(editingArtworkIndex === index ? null : index)}
                      style={{ padding: '0.5rem 1rem', cursor: 'pointer', marginTop: '0.5rem', backgroundColor: editingArtworkIndex === index ? '#333' : '#fff', color: editingArtworkIndex === index ? '#fff' : '#000' }}
                    >
                      {editingArtworkIndex === index ? 'Close Edit' : 'Edit'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Artwork Information Section */}
      {editingArtworkIndex !== null && existingArtworks[editingArtworkIndex] && (
        <div>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Edit Artwork Information</h3>
          <div className={styles.artistInfoContainer}>
            {(() => {
              const artwork = existingArtworks[editingArtworkIndex];
              const index = editingArtworkIndex;
              return (
        <div className={styles.artworkFormSection}>
          <p style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '1rem' }}>Editing: {artwork.title}</p>
          
          {/* Current Images Preview */}
          <div style={{ marginBottom: '2rem' }}>
            <p className={styles.subtitle}>CURRENT IMAGES</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: '#666' }}>Main Image</p>
                {artwork.url ? (
                  <img 
                    src={artwork.url} 
                    alt="Main Artwork Preview" 
                    style={{ width: '150px', height: '150px', objectFit: 'cover', border: '1px solid #ddd' }}
                  />
                ) : artwork.file instanceof File ? (
                  <img 
                    src={URL.createObjectURL(artwork.file)} 
                    alt="Main Artwork Preview" 
                    style={{ width: '150px', height: '150px', objectFit: 'cover', border: '1px solid #ddd' }}
                  />
                ) : (
                  <div style={{ width: '150px', height: '150px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd' }}>
                    <span style={{ color: '#999', fontSize: '0.8rem' }}>No image</span>
                  </div>
                )}
              </div>
              {artwork.images && artwork.images.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: '#666' }}>Detail Images ({artwork.images.length})</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {artwork.images.map((img, imgIndex) => {
                      // Handle both URL strings and File objects
                      const imgSrc = typeof img === 'string' ? img : (img instanceof File ? URL.createObjectURL(img) : null);
                      return imgSrc ? (
                        <img
                          key={imgIndex}
                          src={imgSrc}
                          alt={`Detail ${imgIndex + 1}`}
                          style={{ width: '80px', height: '80px', objectFit: 'cover', border: '1px solid #ddd' }}
                        />
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Editable Fields */}
          <div className={styles.artworkMetadata}>
            <div className={styles.inputGroup}>
              <p className={styles.subtitle}>TITLE</p>
              <input
                type="text"
                placeholder="Artwork Title"
                value={artwork.title}
                onChange={(e) => handleExistingArtworkChange(index, 'title', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <p className={styles.subtitle}>DATE</p>
              <input
                type="text"
                placeholder="Date"
                value={artwork.date}
                onChange={(e) => handleExistingArtworkChange(index, 'date', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <p className={styles.subtitle}>MEDIUM</p>
              <input
                type="text"
                placeholder="Medium"
                value={artwork.medium}
                onChange={(e) => handleExistingArtworkChange(index, 'medium', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <p className={styles.subtitle}>MEASUREMENTS</p>
              <input
                type="text"
                placeholder="Measurements"
                value={artwork.measurements}
                onChange={(e) => handleExistingArtworkChange(index, 'measurements', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <p className={styles.subtitle}>DESCRIPTION</p>
              <textarea
                placeholder="Artwork Description"
                value={artwork.description}
                onChange={(e) => handleExistingArtworkChange(index, 'description', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <p className={styles.subtitle}>PRICE</p>
              <input
                type="number"
                placeholder="Price"
                value={artwork.price || ""}
                onChange={(e) => handleExistingArtworkChange(index, 'price', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <p className={styles.subtitle}>AVAILABILITY STATUS</p>
              <select
                value={artwork.availability_status || "NOT_FOR_SALE"}
                onChange={(e) => handleExistingArtworkChange(index, 'availability_status', e.target.value)}
              >
                <option value="NOT_FOR_SALE">Not For Sale</option>
                <option value="FOR_SALE">For Sale</option>
                <option value="ON_AUCTION">On Auction</option>
                <option value="SOLD">Sold</option>
                <option value="ON_HOLD">On Hold</option>
              </select>
            </div>

            {/* Extras for Existing Artworks */}
            <div className={styles.inputGroup}>
              <p className={styles.subtitle}>EXTRA INFORMATION</p>
              <div className={styles.extrasInput}>
                <input
                  type="text"
                  placeholder="Add extra information"
                  value={newExtra}
                  onChange={(e) => setNewExtra(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => addExtra(index)}
                >
                  Add Extra
                </button>
              </div>
              
              {/* Display Extras for Existing Artworks */}
              {artwork.extras && artwork.extras.length > 0 && (
                <div className={styles.extrasList}>
                  {artwork.extras.map((extra, extraIndex) => (
                    <span key={extraIndex} className={styles.extraTag}>
                      {extra}
                      <button 
                        type="button" 
                        onClick={() => removeExtra(index, extraIndex)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Image Update Section */}
          <div className={styles.imageUpdateSection}>
            <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>UPDATE IMAGES (OPTIONAL)</p>
            
            {/* Main Image Update */}
            <div className={styles.uploadGroup}>
              <p className={styles.subtitle}>UPDATE MAIN IMAGE</p>
              <div
                className={`${styles.cvDropZone} ${updateMainImageDragOver[artwork.id] ? styles.dragOver : ''}`}
                onDragOver={(e) => handleUpdateMainImageDragOver(e, artwork.id)}
                onDragLeave={(e) => handleUpdateMainImageDragLeave(e, artwork.id)}
                onDrop={(e) => handleUpdateMainImageDrop(e, artwork.id)}
                onClick={() => document.getElementById(`update-main-${artwork.id}`)?.click()}
              >
                {artworkImageUpdates[artwork.id]?.mainImage ? (
                  <div className={styles.profilePicturePreview}>
                    <img
                      src={URL.createObjectURL(artworkImageUpdates[artwork.id].mainImage)}
                      alt="New main image preview"
                      style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }}
                    />
                    <div className={styles.profilePictureOverlay}>
                      <span>Click or drag to change</span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.cvFilePlaceholder}>
                    <p>Drag & drop new main image here</p>
                    <p>or click to browse</p>
                    <small>Leave empty to keep current image</small>
                  </div>
                )}
              </div>
              <input
                id={`update-main-${artwork.id}`}
                type="file"
                accept="image/*"
                onChange={(e) => handleArtworkMainImageChange(artwork.id, e.target.files[0])}
                style={{ display: 'none' }}
              />
            </div>

            {/* Detail Images Update */}
            <div className={styles.uploadGroup}>
              <p className={styles.subtitle}>UPDATE DETAIL IMAGES</p>
              <div
                className={`${styles.cvDropZone} ${updateDetailImagesDragOver[artwork.id] ? styles.dragOver : ''}`}
                onDragOver={(e) => handleUpdateDetailImagesDragOver(e, artwork.id)}
                onDragLeave={(e) => handleUpdateDetailImagesDragLeave(e, artwork.id)}
                onDrop={(e) => handleUpdateDetailImagesDrop(e, artwork.id)}
                onClick={() => document.getElementById(`update-details-${artwork.id}`)?.click()}
              >
                <div className={styles.cvFilePlaceholder}>
                  <p>Drag & drop new detail images here</p>
                  <p>or click to browse</p>
                  <small>Multiple images - Leave empty to keep current</small>
                </div>
              </div>
              <input
                id={`update-details-${artwork.id}`}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleArtworkDetailImagesChange(artwork.id, e.target.files)}
                style={{ display: 'none' }}
              />
              
              {/* Preview Selected Detail Images */}
              {artworkImageUpdates[artwork.id]?.detailImages && artworkImageUpdates[artwork.id].detailImages.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontSize: '0.9rem', color: '#666' }}>New Detail Images Preview ({artworkImageUpdates[artwork.id].detailImages.length}):</p>
                  <div className={styles.detailImages} style={{ marginTop: '0.5rem' }}>
                    {artworkImageUpdates[artwork.id].detailImages.map((file, imgIndex) => (
                      <img
                        key={imgIndex}
                        src={URL.createObjectURL(file)}
                        alt={`New detail preview ${imgIndex + 1}`}
                        style={{ width: '100px', height: '100px', objectFit: 'cover', border: '1px solid #ddd', margin: '0.25rem' }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button 
            type="button" 
            onClick={() => deleteArtwork(index)}
            style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', marginTop: '1.5rem', backgroundColor: '#dc3545', color: '#fff', border: 'none', fontWeight: '600' }}
          >
            Delete Artwork
          </button>
        </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <p className={styles.error}>{error}</p>}

      {/* Success Message */}
      {success && <p className={styles.success}>{success}</p>} {/* Optional: Add CSS for success messages */}

      {/* Submit Button */}
      <button type="button" onClick={handleSubmit} disabled={loading}>
        {loading ? "Processing..." : selectedArtist ? "Update Artist" : "Create Artist"}
      </button>
    </div>
  );
}