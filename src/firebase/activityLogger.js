"use client";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { firestore } from "./firebaseConfig";
import { auth } from "./firebaseConfig";

/**
 * Activity Logger Utility
 * Logs user activities to Firebase Firestore
 */

// Action types
export const ACTION_TYPES = {
  LOGIN: "login",
  LOGOUT: "logout",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
};

// Resource types
export const RESOURCE_TYPES = {
  ARTIST: "artist",
  EXHIBITION: "exhibition",
  ARTWORK: "artwork",
  FAIR: "fair",
  HEADQUARTER: "headquarter",
  MEMBER: "member",
  EVENT: "event",
  ARTICLE: "article",
};

/**
 * Get current user information
 */
const getCurrentUser = () => {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  return {
    uid: user.uid,
    email: user.email || "unknown",
    displayName: user.displayName || null,
  };
};

/**
 * Create a log entry in Firebase
 * @param {string} actionType - Type of action (login, logout, create, update, delete)
 * @param {string} resourceType - Type of resource (artist, exhibition, artwork, etc.)
 * @param {string} resourceId - ID of the resource (optional)
 * @param {object} metadata - Additional metadata about the action
 */
export const logActivity = async (actionType, resourceType = null, resourceId = null, metadata = {}) => {
  try {
    const user = getCurrentUser();
    
    if (!user && actionType !== ACTION_TYPES.LOGIN) {
      console.warn("Cannot log activity: No user authenticated");
      return;
    }

    const logEntry = {
      actionType,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      user: user || {
        uid: "anonymous",
        email: "unknown",
      },
      timestamp: Timestamp.now(),
      metadata: {
        ...metadata,
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : null,
        url: typeof window !== "undefined" ? window.location.href : null,
      },
    };

    await addDoc(collection(firestore, "activityLogs"), logEntry);
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw error to prevent breaking the main flow
  }
};

/**
 * Log a login event
 */
export const logLogin = async () => {
  const user = getCurrentUser();
  await logActivity(ACTION_TYPES.LOGIN, null, null, {
    loginMethod: "email",
    email: user?.email || "unknown",
  });
};

/**
 * Log a logout event
 */
export const logLogout = async () => {
  const user = getCurrentUser();
  await logActivity(ACTION_TYPES.LOGOUT, null, null, {
    email: user?.email || "unknown",
  });
};

/**
 * Log a create operation
 * @param {string} resourceType - Type of resource (artist, exhibition, artwork, etc.)
 * @param {string} resourceId - ID of the created resource
 * @param {object} metadata - Additional metadata (e.g., resource name)
 */
export const logCreate = async (resourceType, resourceId, metadata = {}) => {
  await logActivity(ACTION_TYPES.CREATE, resourceType, resourceId, metadata);
};

/**
 * Log an update operation
 * @param {string} resourceType - Type of resource (artist, exhibition, artwork, etc.)
 * @param {string} resourceId - ID of the updated resource
 * @param {object} metadata - Additional metadata (e.g., changed fields, resource name)
 */
export const logUpdate = async (resourceType, resourceId, metadata = {}) => {
  await logActivity(ACTION_TYPES.UPDATE, resourceType, resourceId, metadata);
};

/**
 * Log a delete operation
 * @param {string} resourceType - Type of resource (artist, exhibition, artwork, etc.)
 * @param {string} resourceId - ID of the deleted resource
 * @param {object} metadata - Additional metadata (e.g., resource name)
 */
export const logDelete = async (resourceType, resourceId, metadata = {}) => {
  await logActivity(ACTION_TYPES.DELETE, resourceType, resourceId, metadata);
};

