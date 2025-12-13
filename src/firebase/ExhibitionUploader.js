"use client"
import { useEffect, useState, useRef } from "react";
import { firestore, storage } from "./firebaseConfig";
import { getDocs, addDoc, collection, doc, updateDoc, Timestamp, arrayUnion, getDoc, setDoc } from "firebase/firestore";  
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { logCreate, logUpdate, RESOURCE_TYPES } from "./activityLogger";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "../../styles/uploader.module.css";
import { deleteObject, ref as storageRef } from "firebase/storage";
import imageCompression from 'browser-image-compression';

export default function ExhibitionUploader() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [artists, setArtists] = useState([]);
  const [artworks, setArtworks] = useState({});
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [selectedArtworks, setSelectedArtworks] = useState({});
  const [exhibitions, setExhibitions] = useState([]);
  const [selectedExhibition, setSelectedExhibition] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    subtitle: "",
    description: [],
    isFeatured: false,
    curator: "",
    curatorialTexts: [],
    openingDate: null,
    closingDate: null,
    receptionDate: null,
    receptionTime: "",
    address: "",
    googleMapsLink: "",
    slug: "",
  });
  const [existingGallery, setExistingGallery] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imageDescriptions, setImageDescriptions] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [deletedExistingImages, setDeletedExistingImages] = useState([]);
  const [bannerImage, setBannerImage] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerMobileImage, setBannerMobileImage] = useState(null);
  const [bannerMobilePreview, setBannerMobilePreview] = useState(null);
  const [flyerImage, setFlyerImage] = useState(null);
  const [flyerPreview, setFlyerPreview] = useState(null);
  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const bannerMobileInputRef = useRef(null);
  const flyerInputRef = useRef(null);
  
  // Drag and drop states
  const [isBannerDragOver, setIsBannerDragOver] = useState(false);
  const [isBannerMobileDragOver, setIsBannerMobileDragOver] = useState(false);
  const [isFlyerDragOver, setIsFlyerDragOver] = useState(false);
  const [isGalleryDragOver, setIsGalleryDragOver] = useState(false);

  // Compression options reference
  const compressionOptions = {
    maxSizeMB: 3,       // Maximum file size in MB
    maxWidthOrHeight: 1920, // Maximum dimension (width/height)
    useWebWorker: true,   // Use web worker for better performance
    fileType: 'image/webp', // Optional: convert to webp
    initialQuality: 1,  // Optional: initial quality (0-1)
  };

  /*  FETCHING STUFF */
  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        const artistSnapshot = await getDocs(collection(firestore, "artists"));
        const artists = artistSnapshot.docs.map((doc) => ({
          ...doc.data(),
          slug: doc.id,
        }));

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
      } catch (error) {
        console.error("Error fetching artist data:", error);
      }
    };

    const fetchExhibitions = async () => {
      try {
        const exhibitionsSnapshot = await getDocs(collection(firestore, "exhibitions"));
        const exhibitionsList = exhibitionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExhibitions(exhibitionsList);
      } catch (error) {
        console.error("Error fetching exhibitions:", error);
      }
    };

    fetchArtistData();
    fetchExhibitions();
  }, []);
  

  /* HANDLERS */

  const deleteImageFromStorage = async (imageUrl) => {
    try {
      // Extract the storage path from the download URL
      // Firebase Storage URLs have the format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
      const urlObj = new URL(imageUrl);
      const pathParts = urlObj.pathname.split('/o/');
      
      if (pathParts.length < 2) {
        console.error("Invalid Firebase Storage URL format:", imageUrl);
        return;
      }
      
      const pathEncoded = pathParts[1];
      const path = decodeURIComponent(pathEncoded);
      
      const imageRef = ref(storage, path);
      await deleteObject(imageRef);
      console.log("Successfully deleted image from storage:", path);
    } catch (error) {
      console.error("Error deleting image from storage:", imageUrl, error);
      // Don't throw error - allow the operation to continue even if deletion fails
    }
  };

  const handleExhibitionSelection = async (exhibitionId) => {
    setSelectedExhibition(exhibitionId);
    if (!exhibitionId) {
      resetForm();
      return;
    }
  
    try {
      const exhibitionDoc = await getDoc(doc(firestore, "exhibitions", exhibitionId));
      if (exhibitionDoc.exists()) {
        const data = exhibitionDoc.data();
        
        // Combine all form data into a single setFormData call
        setFormData({
          name: data.name,
          subtitle: data.subtitle || "",
          description: data.description || [],
          isFeatured: data.isFeatured || false,
          curator: data.curator || "",
          curatorialTexts: data.curatorialTexts || [],
          openingDate: data.openingDate?.toDate() || null,
          closingDate: data.closingDate?.toDate() || null,
          receptionDate: data.receptionDate ? 
            (data.receptionDate.toDate ? data.receptionDate.toDate() : new Date(data.receptionDate)) : 
            null,
          receptionTime: data.receptionTime || "",
          address: data.address || "",
          googleMapsLink: data.googleMapsLink || "",
          slug: data.slug || generateSlug(data.name),
        });
  
        // Keep the rest of the state updates
        setSelectedArtists(data.artists?.map(a => a.artistSlug) || []);
        
        const artworksSelection = {};
        data.artists?.forEach(artist => {
          artworksSelection[artist.artistSlug] = artist.selectedArtworks || [];
        });
        setSelectedArtworks(artworksSelection);
        
        const existingGalleryData = data.gallery || [];
        setExistingGallery(existingGalleryData);
        setImagePreviews(existingGalleryData.map(img => img.url));
        setImageDescriptions(existingGalleryData.map(img => img.description || ''));
        setBannerPreview(data.banner || null);
        setBannerMobilePreview(data.bannermobile || null);
        setFlyerPreview(data.flyer || null);
      }
    } catch (error) {
      console.error("Error loading exhibition data:", error);
      setError("Failed to load exhibition data.");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { name, openingDate, closingDate } = formData;
      if (!name || !openingDate || !closingDate) {
        throw new Error("Please complete all required fields.");
      }

      const slug = generateSlug(name);
      
      // Generate exhibition ID - use existing ID if updating, otherwise create new one
      const exhibitionId = selectedExhibition || doc(collection(firestore, "exhibitions")).id;

      let bannerUrl;
      try {
        bannerUrl = await uploadBannerImage(exhibitionId);
      } catch (error) {
        throw new Error("Banner image processing failed: " + error.message);
      }

      let bannerMobileUrl;
      try {
        bannerMobileUrl = await uploadBannerMobileImage(exhibitionId);
      } catch (error) {
        throw new Error("Mobile banner image processing failed: " + error.message);
      }

      let flyerUrl;
      try {
        flyerUrl = await uploadFlyerImage(exhibitionId);
      } catch (error) {
        throw new Error("Flyer image processing failed: " + error.message);
      }
  
      let galleryData = [];
      try {
        if (newImages.length > 0 || deletedExistingImages.length > 0) {
          galleryData = await uploadImages(exhibitionId);
        } else if (selectedExhibition) {
          galleryData = existingGallery;
        }
      } catch (error) {
        throw new Error("Gallery image processing failed: " + error.message);
      }

      const exhibitionData = {
        ...formData,
        slug,
        banner: bannerUrl,
        bannermobile: bannerMobileUrl,
        flyer: flyerUrl,
        gallery: galleryData,
        openingDate: Timestamp.fromDate(new Date(openingDate)),
        closingDate: Timestamp.fromDate(new Date(closingDate)),
        receptionDate: formData.receptionDate ? Timestamp.fromDate(formData.receptionDate) : null,
        artists: selectedArtists.map(artistSlug => ({
          artistSlug,
          selectedArtworks: selectedArtworks[artistSlug] || [],
        })),
      };

      if (selectedExhibition) {
        await updateDoc(doc(firestore, "exhibitions", selectedExhibition), exhibitionData);
        await logUpdate(RESOURCE_TYPES.EXHIBITION, selectedExhibition, {
          exhibitionName: name,
          fieldsUpdated: Object.keys(exhibitionData),
        });
        if (deletedExistingImages.length > 0) {
          await Promise.all(
            deletedExistingImages.map(url => 
              deleteImageFromStorage(url).catch(error => {
                console.error("Failed to delete image:", url, error);
              })
            )
          );
        }
        setSuccess("Exhibition updated successfully!");
      } else {
        // Use setDoc instead of addDoc to use the pre-generated ID
        await setDoc(doc(firestore, "exhibitions", exhibitionId), exhibitionData);
        await logCreate(RESOURCE_TYPES.EXHIBITION, exhibitionId, {
          exhibitionName: name,
        });

        for (const artistSlug of selectedArtists) {
          const artist = artists.find(a => a.slug === artistSlug);
          if (artist?.slug) {
            const artistRef = doc(firestore, "artists", artist.slug);
            await updateDoc(artistRef, { exhibitions: arrayUnion(exhibitionId) });
          }
        }

        for (const artistSlug of Object.keys(selectedArtworks)) {
          const artworks = selectedArtworks[artistSlug];
          for (const artworkId of artworks) {
            const artworkRef = doc(firestore, "artworks", artworkId);
            await updateDoc(artworkRef, { exhibitions: arrayUnion(exhibitionId) });
          }
        }
        setSuccess("Exhibition added successfully!");
      }

      resetForm();
      setDeletedExistingImages([]);
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "Failed to save exhibition.");
    } finally {
      setLoading(false);
    }
  };

  const handleArtistSelection = (artist) => {
    const isSelected = selectedArtists.includes(artist.slug);
    const updatedArtists = isSelected
      ? selectedArtists.filter((a) => a !== artist.slug)
      : [...selectedArtists, artist.slug];
  
    setSelectedArtists(updatedArtists);
  

    if (!isSelected) {
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
    setNewImages(prev => [...prev, ...files]);
    
    // Create previews for new images only
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
    
    // Initialize descriptions for new images
    setImageDescriptions(prev => [...prev, ...Array(files.length).fill('')]);
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

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleBannerFile(file);
    }
  };

  const handleFlyerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFlyerFile(file);
    }
  };

  const handleBannerMobileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleBannerMobileFile(file);
    }
  };

  // Banner Drag and Drop Handlers
  const handleBannerFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setBannerImage(file);
      setBannerPreview(URL.createObjectURL(file));
    } else {
      setError('Please select a valid image file for banner.');
    }
  };

  const handleBannerDragOver = (e) => {
    e.preventDefault();
    setIsBannerDragOver(true);
  };

  const handleBannerDragLeave = (e) => {
    e.preventDefault();
    setIsBannerDragOver(false);
  };

  const handleBannerDrop = (e) => {
    e.preventDefault();
    setIsBannerDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleBannerFile(files[0]);
    }
  };

  // Banner Mobile Drag and Drop Handlers
  const handleBannerMobileFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setBannerMobileImage(file);
      setBannerMobilePreview(URL.createObjectURL(file));
    } else {
      setError('Please select a valid image file for mobile banner.');
    }
  };

  const handleBannerMobileDragOver = (e) => {
    e.preventDefault();
    setIsBannerMobileDragOver(true);
  };

  const handleBannerMobileDragLeave = (e) => {
    e.preventDefault();
    setIsBannerMobileDragOver(false);
  };

  const handleBannerMobileDrop = (e) => {
    e.preventDefault();
    setIsBannerMobileDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleBannerMobileFile(files[0]);
    }
  };

  // Flyer Drag and Drop Handlers
  const handleFlyerFile = (file) => {
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setFlyerImage(file);
      setFlyerPreview(URL.createObjectURL(file));
    } else {
      setError('Please select a valid image or video file for flyer.');
    }
  };

  const handleFlyerDragOver = (e) => {
    e.preventDefault();
    setIsFlyerDragOver(true);
  };

  const handleFlyerDragLeave = (e) => {
    e.preventDefault();
    setIsFlyerDragOver(false);
  };

  const handleFlyerDrop = (e) => {
    e.preventDefault();
    setIsFlyerDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFlyerFile(files[0]);
    }
  };

  // Gallery Drag and Drop Handlers
  const handleGalleryDragOver = (e) => {
    e.preventDefault();
    setIsGalleryDragOver(true);
  };

  const handleGalleryDragLeave = (e) => {
    e.preventDefault();
    setIsGalleryDragOver(false);
  };

  const handleGalleryDrop = (e) => {
    e.preventDefault();
    setIsGalleryDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      setNewImages(prev => [...prev, ...files]);
      
      // Create previews for new images only
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
      
      // Initialize descriptions for new images
      setImageDescriptions(prev => [...prev, ...Array(files.length).fill('')]);
    }
  };

  const uploadBannerImage = async (exhibitionId) => {
    if (!bannerImage) return bannerPreview;
  
    try {
      const compressedFile = await imageCompression(bannerImage, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 2000,
        useWebWorker: true,
      });
  
      const bannerRef = ref(storage, `exhibitions/${exhibitionId}/images/${exhibitionId}_banner`);
      await uploadBytes(bannerRef, compressedFile);
      return await getDownloadURL(bannerRef);
    } catch (error) {
      console.error("Error compressing banner image:", error);
      throw new Error("Banner image upload failed");
    }
  };

  const uploadBannerMobileImage = async (exhibitionId) => {
    if (!bannerMobileImage) return bannerMobilePreview;
  
    try {
      const compressedFile = await imageCompression(bannerMobileImage, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 2000,
        useWebWorker: true,
      });
  
      const bannerMobileRef = ref(storage, `exhibitions/${exhibitionId}/images/${exhibitionId}_bannermobile`);
      await uploadBytes(bannerMobileRef, compressedFile);
      return await getDownloadURL(bannerMobileRef);
    } catch (error) {
      console.error("Error compressing mobile banner image:", error);
      throw new Error("Mobile banner image upload failed");
    }
  };

  const uploadFlyerImage = async (exhibitionId) => {
    if (!flyerImage) return flyerPreview;
  
    try {
      // Check if it's a video file
      const isVideo = flyerImage.type.startsWith('video/');
      const fileExtension = isVideo ? flyerImage.name.split('.').pop() : 'webp';
      
      if (isVideo) {
        // For videos, upload without compression
        const flyerRef = ref(storage, `exhibitions/${exhibitionId}/flyer/${exhibitionId}_flyer.${fileExtension}`);
        await uploadBytes(flyerRef, flyerImage);
        return await getDownloadURL(flyerRef);
      } else {
        // For images, compress
        const compressedFile = await imageCompression(flyerImage, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1500,
          useWebWorker: true,
        });
  
        const flyerRef = ref(storage, `exhibitions/${exhibitionId}/flyer/${exhibitionId}_flyer`);
        await uploadBytes(flyerRef, compressedFile);
        return await getDownloadURL(flyerRef);
      }
    } catch (error) {
      console.error("Error uploading flyer:", error);
      throw new Error("Flyer upload failed");
    }
  };

  const handleImageDescriptionChange = (index, value) => {
    const updatedDescriptions = [...imageDescriptions];
    updatedDescriptions[index] = value || "";
    setImageDescriptions(updatedDescriptions);
  };

  const handleDeleteImage = (index) => {
    // Check if it's an existing image (from Firestore)
    const isExistingImage = index < existingGallery.length;
  
    if (isExistingImage) {
      // Add to deleted images list for storage cleanup
      setDeletedExistingImages(prev => [...prev, existingGallery[index].url]);
      // Remove from existing gallery
      setExistingGallery(prev => prev.filter((_, i) => i !== index));
    } else {
      // Remove from new images list
      const newIndex = index - existingGallery.length;
      setNewImages(prev => prev.filter((_, i) => i !== newIndex));
    }
  
    // Remove from previews and descriptions
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageDescriptions(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleDescriptionChange = (index, value) => {
    const updatedDescriptions = [...imageDescriptions];
    updatedDescriptions[index] = value;
    setImageDescriptions(updatedDescriptions);
  };

// Modified uploadImages with compression
const uploadImages = async (exhibitionId) => {
  // Filter out deleted existing images
  const remainingExisting = existingGallery.filter(
    img => !deletedExistingImages.includes(img.url)
  );

  // Upload and compress new images
  const newGalleryEntries = await Promise.all(
    newImages.map(async (file, index) => {
      try {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 5,
          maxWidthOrHeight: 3000,
          useWebWorker: true,
        });

        const imageRef = ref(storage, `exhibitions/${exhibitionId}/images/${exhibitionId}_gallery_${Date.now()}_${index}`);
        await uploadBytes(imageRef, compressedFile);
        const url = await getDownloadURL(imageRef);
        
        return {
          url,
          description: imageDescriptions[existingGallery.length + index] || ''
        };
      } catch (error) {
        console.error("Error compressing image:", error);
        throw new Error(`Failed to upload image ${index + 1}`);
      }
    })
  );

  // Update descriptions for remaining existing images
  const updatedExisting = remainingExisting.map((img, index) => ({
    ...img,
    description: imageDescriptions[index] || img.description
  }));

  return [...updatedExisting, ...newGalleryEntries];
};
  
  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  };

  const resetForm = () => {
    // Clean up object URLs to prevent memory leaks
    if (bannerPreview && bannerImage instanceof File) {
      URL.revokeObjectURL(bannerPreview);
    }
    if (bannerMobilePreview && bannerMobileImage instanceof File) {
      URL.revokeObjectURL(bannerMobilePreview);
    }
    if (flyerPreview && flyerImage instanceof File) {
      URL.revokeObjectURL(flyerPreview);
    }
    imagePreviews.forEach((preview, index) => {
      if (newImages[index] instanceof File) {
        URL.revokeObjectURL(preview);
      }
    });

    setFormData({
      name: "",
      subtitle: "",
      description: [],
      isFeatured: false,
      curator: "",
      curatorialTexts: [],
      openingDate: null,
      closingDate: null,
      receptionDate: null,
      receptionTime: "",
      address: "",
      googleMapsLink: "",
      slug: "",
    });
    setSelectedArtists([]);
    setSelectedArtworks({});
    setImageDescriptions([]);
    setImagePreviews([]);
    setSelectedExhibition(null);
    setBannerImage(null);
    setBannerPreview(null);
    setBannerMobileImage(null);
    setBannerMobilePreview(null);
    setFlyerImage(null);
    setFlyerPreview(null);
    setExistingGallery([]);
    setNewImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (bannerInputRef.current) {
      bannerInputRef.current.value = "";
    }
    if (bannerMobileInputRef.current) {
      bannerMobileInputRef.current.value = "";
    }
    if (flyerInputRef.current) {
      flyerInputRef.current.value = "";
    }
  };

  // Cleanup effect for preview URLs
  useEffect(() => {
    return () => {
      if (bannerPreview && bannerImage instanceof File) {
        URL.revokeObjectURL(bannerPreview);
      }
      if (bannerMobilePreview && bannerMobileImage instanceof File) {
        URL.revokeObjectURL(bannerMobilePreview);
      }
      if (flyerPreview && flyerImage instanceof File) {
        URL.revokeObjectURL(flyerPreview);
      }
      imagePreviews.forEach((preview, index) => {
        if (newImages[index] instanceof File) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [bannerPreview, bannerImage, bannerMobilePreview, bannerMobileImage, flyerPreview, flyerImage, imagePreviews, newImages]);

  const addNewExhibition = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
  
    try {
      const { name, openingDate, closingDate, receptionTime } = formData;
  

      if (!name || !openingDate || !closingDate) {
        throw new Error("Please complete all required fields.");
      }
  

      const slug = generateSlug(name);
      
      // Generate exhibition ID before uploading images
      const exhibitionId = doc(collection(firestore, "exhibitions")).id;

      const galleryData = await uploadImages(exhibitionId);
      if (!galleryData) throw new Error("Image upload failed.");

      const bannerUrl = await uploadBannerImage(exhibitionId);
      const bannerMobileUrl = await uploadBannerMobileImage(exhibitionId);
      const flyerUrl = await uploadFlyerImage(exhibitionId);
  

      const openingDateTimestamp = Timestamp.fromDate(new Date(openingDate));
      const closingDateTimestamp = Timestamp.fromDate(new Date(closingDate));
  

      const newExhibitionData = {
        ...formData,
        slug,
        gallery: galleryData,
        banner: bannerUrl,
        bannermobile: bannerMobileUrl,
        flyer: flyerUrl,
        openingDate: openingDateTimestamp,
        closingDate: closingDateTimestamp,
        receptionTime: formData.receptionTime || "",
        artists: selectedArtists.map((artistSlug) => ({
          artistSlug,
          selectedArtworks: selectedArtworks[artistSlug] || [], 
        })),
      };
  

      console.log("Selected Artworks State:", selectedArtworks);
  
      console.log("Exhibition Data:", newExhibitionData);
  

      // Use setDoc instead of addDoc to use the pre-generated ID
      await setDoc(doc(firestore, "exhibitions", exhibitionId), newExhibitionData);
  

      for (const artistSlug of selectedArtists) {
        const artist = artists.find((a) => a.slug === artistSlug);
        if (artist?.slug) {  
          const artistRef = doc(firestore, "artists", artist.slug); 
          await updateDoc(artistRef, {
            exhibitions: arrayUnion(exhibitionId),
          });
        }
      }

      for (const artistSlug of Object.keys(selectedArtworks)) {
        const artworks = selectedArtworks[artistSlug];
        for (const artworkId of artworks) {
          const artworkRef = doc(firestore, "artworks", artworkId);
          await updateDoc(artworkRef, {
            exhibitions: arrayUnion(exhibitionId),
          });
        }
      }
      
      setSuccess("Exhibition added successfully!");
      resetForm();
    } catch (error) {
      console.error("Error adding document:", error);
      setError("Failed to add exhibition. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  
  return (
    <div className={styles.form}>
      <div>
        <p className={styles.subtitle}>SELECT EXHIBITION TO EDIT</p>
        <select
          value={selectedExhibition || ""}
          onChange={(e) => handleExhibitionSelection(e.target.value)}
        >
          <option value="">Create New Exhibition</option>
          {exhibitions.map((exhibition) => (
            <option key={exhibition.id} value={exhibition.id}>
              {exhibition.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Exhibition ID Display */}
      {selectedExhibition && (
        <div className={styles.artistIdDisplay}>
          <span className={styles.artistIdLabel}>Exhibition ID:</span>
          <span className={styles.artistIdValue}>{selectedExhibition}</span>
        </div>
      )}

      {/* Exhibition Basic Information Container */}
      <div>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Exhibition Information</h3>
        <div className={styles.artistInfoContainer}>
        <div className={styles.inputGroup}>
          <p className={styles.subtitle}>EXHIBITION TITLE</p>
          <input
            name="name"
            placeholder="Exhibition Title"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className={styles.inputGroup}>
          <p className={styles.subtitle}>SUBTITLE</p>
          <input
            name="subtitle"
            placeholder="Exhibition Subtitle (optional)"
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
          />
        </div>

        <div className={styles.inputGroup}>
          <p className={styles.subtitle}>DESCRIPTION</p>
          <textarea
            name="description"
            placeholder="Add Exhibition Description (one paragraph per line)"
            value={formData.description.join('\n')}
            onChange={(e) => setFormData({ ...formData, description: e.target.value.split('\n').filter(p => p.trim()) })}
          />
          <p className={styles.helpText}>Each line will become a separate paragraph. Press Enter to create new paragraphs.</p>
        </div>

        <div className={styles.inputGroup}>
          <p className={styles.subtitle}>FEATURED EXHIBITION</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            <span>Highlight this exhibition on the homepage</span>
          </label>
        </div>
        </div>
      </div>

      {/* Dates & Times Container */}
      <div>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Dates & Times</h3>
        <div className={styles.artistInfoContainer}>
        <div className={styles.profileAndBasicInfoRow}>
          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>OPENING DATE</p>
            <DatePicker
              selected={formData.openingDate}
              onChange={(date) => handleDateChange("openingDate", date)}
              placeholderText="Opening Date"
            />
          </div>

          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>CLOSING DATE</p>
            <DatePicker
              selected={formData.closingDate}
              onChange={(date) => handleDateChange("closingDate", date)}
              placeholderText="Closing Date"
            />
          </div>
        </div>

        <div className={styles.profileAndBasicInfoRow}>
          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>RECEPTION DATE</p>
            <DatePicker
              selected={formData.receptionDate}
              onChange={(date) => handleDateChange("receptionDate", date)}
              placeholderText="Reception Date"
            />
          </div>

          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>RECEPTION TIME</p>
            <input
              type="time"
              name="receptionTime"
              placeholder="Reception Time (e.g., 6:00 PM)"
              value={formData.receptionTime || ""}
              onChange={handleInputChange}
            />
          </div>
        </div>
        </div>
      </div>

      {/* Location Information Container */}
      <div>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Location</h3>
        <div className={styles.artistInfoContainer}>
        <div className={styles.inputGroup}>
          <p className={styles.subtitle}>ADDRESS</p>
          <input
            name="address"
            placeholder="Exhibition Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div className={styles.inputGroup}>
          <p className={styles.subtitle}>GOOGLE MAPS LINK</p>
          <input
            name="googleMapsLink"
            type="url"
            placeholder="https://maps.google.com/..."
            value={formData.googleMapsLink}
            onChange={(e) => setFormData({ ...formData, googleMapsLink: e.target.value })}
          />
          <p className={styles.helpText}>
            Paste the Google Maps share link for easy navigation
          </p>
        </div>
        </div>
      </div>

      {/* Curators & Curatorial Texts Container */}
      <div>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Curators & Curatorial Texts</h3>
        <div className={styles.artistInfoContainer}>
        <div className={styles.inputGroup}>
          <p className={styles.subtitle}>CURATOR(S)</p>
          <input
            name="curator"
            placeholder="Curator Name(s)"
            value={formData.curator}
            onChange={(e) => setFormData({ ...formData, curator: e.target.value })}
          />
        </div>

        <div className={styles.inputGroup}>
          <p className={styles.subtitle}>CURATORIAL TEXTS</p>
          <textarea
            placeholder="Add Curatorial Texts (one paragraph per line)"
            value={formData.curatorialTexts.join('\n')}
            onChange={(e) => setFormData({ ...formData, curatorialTexts: e.target.value.split('\n').filter(p => p.trim()) })}
          />
          <p className={styles.helpText}>Each line will become a separate paragraph. Press Enter to create new paragraphs.</p>
        </div>
        </div>
      </div>

      {/* Images Container */}
      <div>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Images</h3>
        <div className={styles.artistInfoContainer}>
        {/* Banner and Flyer Row */}
        <div className={styles.profileAndBasicInfoRow}>
          {/* Banner Image */}
          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>BANNER IMAGE</p>
            <div
              className={`${styles.profilePictureDropZone} ${isBannerDragOver ? styles.dragOver : ''}`}
              onDragOver={handleBannerDragOver}
              onDragLeave={handleBannerDragLeave}
              onDrop={handleBannerDrop}
              onClick={() => bannerInputRef.current?.click()}
            >
              {bannerPreview ? (
                <div className={styles.profilePicturePreview}>
                  <img 
                    src={bannerPreview} 
                    alt="Banner Preview" 
                    className={styles.profilePreviewImage}
                  />
                  <div className={styles.profilePictureOverlay}>
                    <span>Click or drag to change</span>
                  </div>
                </div>
              ) : (
                <div className={styles.profilePicturePlaceholder}>
                  <p>Drag & drop banner image here</p>
                  <p>or click to browse</p>
                  <small>Max size: 2000px width</small>
                </div>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Banner Mobile Image */}
          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>BANNER IMAGE (MOBILE)</p>
            <div
              className={`${styles.profilePictureDropZone} ${isBannerMobileDragOver ? styles.dragOver : ''}`}
              onDragOver={handleBannerMobileDragOver}
              onDragLeave={handleBannerMobileDragLeave}
              onDrop={handleBannerMobileDrop}
              onClick={() => bannerMobileInputRef.current?.click()}
            >
              {bannerMobilePreview ? (
                <div className={styles.profilePicturePreview}>
                  <img 
                    src={bannerMobilePreview} 
                    alt="Mobile Banner Preview" 
                    className={styles.profilePreviewImage}
                  />
                  <div className={styles.profilePictureOverlay}>
                    <span>Click or drag to change</span>
                  </div>
                </div>
              ) : (
                <div className={styles.profilePicturePlaceholder}>
                  <p>Drag & drop mobile banner image here</p>
                  <p>or click to browse</p>
                  <small>Max size: 2000px width</small>
                </div>
              )}
            </div>
            <input
              ref={bannerMobileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerMobileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Flyer Row */}
        <div className={styles.profileAndBasicInfoRow}>
          {/* Flyer Image/Video */}
          <div className={styles.inputGroup}>
            <p className={styles.subtitle}>FLYER IMAGE/VIDEO</p>
            <div
              className={`${styles.profilePictureDropZone} ${isFlyerDragOver ? styles.dragOver : ''}`}
              onDragOver={handleFlyerDragOver}
              onDragLeave={handleFlyerDragLeave}
              onDrop={handleFlyerDrop}
              onClick={() => flyerInputRef.current?.click()}
            >
              {flyerPreview ? (
                <div className={styles.profilePicturePreview}>
                  {flyerImage?.type?.startsWith('video/') ? (
                    <video
                      src={flyerPreview}
                      controls
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  ) : (
                    <img 
                      src={flyerPreview} 
                      alt="Flyer Preview" 
                      className={styles.profilePreviewImage}
                    />
                  )}
                  <div className={styles.profilePictureOverlay}>
                    <span>Click or drag to change</span>
                  </div>
                </div>
              ) : (
                <div className={styles.profilePicturePlaceholder}>
                  <p>Drag & drop flyer image/video here</p>
                  <p>or click to browse</p>
                  <small>Images or videos accepted</small>
                </div>
              )}
            </div>
            <input
              ref={flyerInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFlyerChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Exhibition Gallery Images */}
        <div className={styles.inputGroup}>
          <p className={styles.subtitle}>EXHIBITION GALLERY IMAGES</p>
          <div
            className={`${styles.cvDropZone} ${isGalleryDragOver ? styles.dragOver : ''}`}
            onDragOver={handleGalleryDragOver}
            onDragLeave={handleGalleryDragLeave}
            onDrop={handleGalleryDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.cvFilePlaceholder}>
              <p>Drag & drop gallery images here</p>
              <p>or click to browse</p>
              <small>Multiple images allowed</small>
            </div>
          </div>
          <input 
            type="file" 
            multiple 
            accept="image/*"
            onChange={handleFileChange} 
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          
          {imagePreviews.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <p className={styles.subtitle}>UPLOADED IMAGES ({imagePreviews.length})</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '1rem' }}>
                {imagePreviews.map((preview, index) => (
                  <div key={`image-${index}`} className={styles.imageContainer} style={{ display: 'flex', flexDirection: 'column', width: '300px', border: '1px solid gray', padding: '1rem' }}>
                    <img 
                      src={preview} 
                      alt={`Preview ${index}`} 
                      className={styles.previewImage}
                      style={{width: '100%', height: 'auto', objectFit: 'cover', maxHeight: '300px', marginBottom: 'auto'}}
                    />
                    <textarea
                      value={imageDescriptions[index] || ''}
                      onChange={(e) => handleDescriptionChange(index, e.target.value)}
                      className={styles.imageDescription}
                      placeholder="Image description..."
                      style={{ marginTop: '1rem', width: '100%', minHeight: '60px', maxHeight: '100px', resize: 'vertical' }}
                    />
                    <button
                      type="button"
                      style={{color: "red", marginTop: '0.5rem', cursor: 'pointer', padding: '0.5rem'}}
                      onClick={() => handleDeleteImage(index)}
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
      </div>

      {/* Artists & Artworks Selection Container */}
      <div>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Artists & Artworks Selection</h3>
        <div className={styles.artistInfoContainer}>
          <div className={styles.exhibitionArtists}>
            {artists.map((artist) => (
              <div key={artist.slug} className={styles.artistBox}>
                <div className={styles.artistHeaderRow}>
                  <label className={styles.itemLabel}>{artist.name}</label>
                  <input
                    className={styles.itemCheckbox}
                    type="checkbox"
                    checked={selectedArtists.includes(artist.slug)}
                    onChange={() => handleArtistSelection(artist)}
                  />
                </div>
                {selectedArtists.includes(artist.slug) && (
                  <div className={styles.artworksList}>
                    <h4>Select Artworks</h4>
                    {artist.artworks.map((artwork) => (
                      <div key={artwork.id} className={styles.artworkItem}>
                        <label className={styles.itemLabel}>{artwork.title}</label>
                        <input
                          className={styles.itemCheckbox}
                          type="checkbox"
                          checked={selectedArtworks[artist.slug]?.includes(artwork.id) || false}
                          onChange={() => handleArtworkSelection(artist.slug, artwork.id)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ margin: 'auto'}}>
      <p className={styles.subtitle}> ALL READY? </p>
      <button type="button" onClick={handleSubmit} disabled={loading}>
        {loading ? (selectedExhibition ? "Updating..." : "Uploading...") : (selectedExhibition ? "UPDATE EXHIBITION" : "ADD EXHIBITION")}
      </button>


      </div>
      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}
    </div>
  );
}