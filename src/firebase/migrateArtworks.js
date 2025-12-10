"use client";
import { firestore } from "./firebaseConfig";
import { collection, getDocs, updateDoc, doc, writeBatch } from "firebase/firestore";

/**
 * Migration script to add price and availability_status fields to existing artworks
 * This script will add a price field (set to null) and availability_status field (set to "NOT_FOR_SALE") 
 * to all existing artworks that don't have these fields
 */
export const migrateArtworksWithPrice = async () => {
  try {
    console.log("Starting artwork migration...");
    
    // Get all artworks
    const artworksSnapshot = await getDocs(collection(firestore, "artworks"));
    const artworks = artworksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${artworks.length} artworks to check`);
    
    // Filter artworks that don't have price or availability_status fields
    const artworksToUpdate = artworks.filter(artwork => 
      artwork.price === undefined || artwork.availability_status === undefined
    );
    
    console.log(`${artworksToUpdate.length} artworks need fields added`);
    
    if (artworksToUpdate.length === 0) {
      console.log("No artworks need updating. Migration complete.");
      return;
    }
    
    // Use batch writes for better performance
    const batch = writeBatch(firestore);
    const batchSize = 500; // Firestore batch limit
    let processedCount = 0;
    
    for (let i = 0; i < artworksToUpdate.length; i += batchSize) {
      const batchArtworks = artworksToUpdate.slice(i, i + batchSize);
      
      batchArtworks.forEach(artwork => {
        const artworkRef = doc(firestore, "artworks", artwork.id);
        const updateData = {};
        
        // Only add price if it doesn't exist
        if (artwork.price === undefined) {
          updateData.price = null;
        }
        
        // Only add availability_status if it doesn't exist
        if (artwork.availability_status === undefined) {
          updateData.availability_status = "NOT_FOR_SALE";
        }
        
        batch.update(artworkRef, updateData);
      });
      
      await batch.commit();
      processedCount += batchArtworks.length;
      console.log(`Updated ${processedCount}/${artworksToUpdate.length} artworks`);
    }
    
    console.log("Migration completed successfully!");
    console.log(`Added missing fields to ${processedCount} artworks`);
    
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
};

/**
 * Function to run the migration from the browser console or a component
 * Usage: Call this function from the browser console or add it to a component
 */
export const runMigration = async () => {
  try {
    await migrateArtworksWithPrice();
    alert("Migration completed successfully! Check the console for details.");
  } catch (error) {
    console.error("Migration failed:", error);
    alert("Migration failed. Check the console for error details.");
  }
};
