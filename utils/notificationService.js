// utils/notificationService.js
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export const sendNotification = async ({
  recipientId,
  senderId,
  senderName,
  type,
  pollId,
  pollTitle,
  reactionType = null,
  commentText = null,
  pollOwnerId = null, // ✅ Optional parameter
}) => {
  try {
    const payload = {
      recipientId,
      senderId,
      senderName,
      type,
      pollId,
      pollTitle,
      reactionType,
      commentText,
      read: false,
      timestamp: serverTimestamp(),
    };

    // ✅ Only add pollOwnerId if it's provided
    if (pollOwnerId) {
      payload.pollOwnerId = pollOwnerId;
    }

    await addDoc(collection(db, "notifications"), payload);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};
