import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Image,
  TextInput,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  doc,
  getDoc,
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase/firebaseConfig';
import colors from '../../constant/colors';
import { AntDesign, Entypo, MaterialIcons } from '@expo/vector-icons';
import { Alert } from 'react-native';

const COMMENTS_PER_PAGE = 5;

export default function PollDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentPage, setCommentPage] = useState(1);
  const [user, setUser] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [menuVisible, setMenuVisible] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const getThemeColors = () => {
    switch(poll?.theme) {
      case 'red': return { bg: colors.REDBG, main: colors.REDMAIN, sec: colors.REDSEC };
      case 'orange': return { bg: colors.ORGBG, main: colors.ORGMAIN, sec: colors.ORGSEC };
      case 'yellow': return { bg: colors.YELBG, main: colors.YELMAIN, sec: colors.YELSEC };
      case 'green': return { bg: colors.GRBG, main: colors.GRMAIN, sec: colors.GRSEC };
      case 'blue': return { bg: colors.BLBG, main: colors.BLMAIN, sec: colors.BLSEC };
      case 'violet': return { bg: colors.VIOBG, main: colors.VIOMAIN, sec: colors.VIOSEC };
      case 'pink': return { bg: colors.PINKBG, main: colors.PINKMAIN, sec: colors.PINKSEC };
      default: return { bg: 'white', main: colors.BLUE, sec: colors.LIGHTBLUE };
    }
  };

  const theme = getThemeColors();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const pollDoc = await getDoc(doc(db, 'polls', id));
      if (pollDoc.exists()) {
        const pollData = pollDoc.data();
        setPoll({ 
          id: pollDoc.id, 
          ...pollData,
          createdAt: pollData.createdAt?.toDate() || new Date(),
          isExpired: (() => {
            const createdAt = pollData.createdAt?.toDate() || new Date();
            const durationMs = 
              pollData.duration?.unit === "days" ? parseInt(pollData.duration.value) * 24 * 60 * 60 * 1000 :
              pollData.duration?.unit === "hours" ? parseInt(pollData.duration.value) * 60 * 60 * 1000 :
              pollData.duration?.unit === "minutes" ? parseInt(pollData.duration.value) * 60 * 1000 : 0;
            const expiresAt = createdAt.getTime() + durationMs;
            return expiresAt <= Date.now();
          })()
        });
      }
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const pollDoc = await getDoc(doc(db, 'polls', id));
        if (pollDoc.exists()) {
          
          
          const pollData = pollDoc.data();
         let creatorProfilePic = null;
        let creatorName = pollData.creatorName || "Unknown";
        
        if (pollData.createdBy) {  // Changed from creatorId to createdBy
          const creatorDoc = await getDoc(doc(db, 'users', pollData.createdBy));
          if (creatorDoc.exists()) {
            creatorProfilePic = creatorDoc.data().profilePic || null;
            creatorName = creatorDoc.data().username || creatorName;
          }
        }

          const createdAt = pollData.createdAt?.toDate() || new Date();
          const durationMs = 
            pollData.duration?.unit === "days" ? parseInt(pollData.duration.value) * 24 * 60 * 60 * 1000 :
            pollData.duration?.unit === "hours" ? parseInt(pollData.duration.value) * 60 * 60 * 1000 :
            pollData.duration?.unit === "minutes" ? parseInt(pollData.duration.value) * 60 * 1000 : 0;
          const expiresAt = createdAt.getTime() + durationMs;
          const isExpired = expiresAt <= Date.now();
          
          setPoll({ 
            id: pollDoc.id, 
            ...pollData,
            creatorProfilePic, // Make sure this is included
          creatorName,  
            createdAt,
            isExpired
          });
        } else {
          console.error('Poll not found');
        }
      } catch (error) {
        console.error('Error fetching poll:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const commentsRef = collection(db, 'polls', id, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedComments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }));
        setComments(fetchedComments);
      },
      (error) => {
        console.error('Error fetching comments:', error);
      }
    );

    return () => unsubscribe();
  }, [id]);

const submitComment = async () => {
  if (!newComment.trim() || !user || !id || isSubmitting) return;

  if (newComment.length > 500) {
    Alert.alert("Error", "Comments cannot exceed 500 characters.");
    return;
  }

  setIsSubmitting(true);

  try {
    const commentsRef = collection(db, "polls", id, "comments");
    const q = query(commentsRef);
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.size >= 100) {
      Alert.alert("Limit Reached", "Maximum of 100 comments per poll reached.");
      return;
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const username = userDoc.exists() ? userDoc.data().username : user.email;
    const profilePic = userDoc.exists() ? userDoc.data().profilePic : null;

    const commentData = {
      userId: user.uid,
      username,
      text: newComment.trim(),
      timestamp: serverTimestamp(),
      profilePic: profilePic || '',
    };

    if (editingCommentId) {
      const commentDocRef = doc(commentsRef, editingCommentId);
      await updateDoc(commentDocRef, {
        text: newComment.trim(),
        timestamp: serverTimestamp(),
      });
      setEditingCommentId(null);
    } else {
      await addDoc(commentsRef, commentData);
    }

    setNewComment('');
  } catch (error) {
    console.error('Failed to submit comment:', error);
    Alert.alert('Error', 'Could not post comment.');
  } finally {
    setIsSubmitting(false);
  }
};

  const editComment = (comment) => {
    setNewComment(comment.text);
    setEditingCommentId(comment.id);
    setMenuVisible(null);
  };

  const confirmDeleteComment = (commentId) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: () => deleteComment(commentId), style: "destructive" },
      ]
    );
  };

  const deleteComment = async (commentId) => {
    try {
      await deleteDoc(doc(db, 'polls', id, 'comments', commentId));
      setMenuVisible(null);
    } catch (error) {
      console.error('Failed to delete comment:', error);
      Alert.alert('Error', 'Could not delete comment.');
    }
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setNewComment('');
  };

  const formatPollTime = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (date.toDateString() === now.toDateString()) {
      if (diffInSeconds < 60) return `Just now`;
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      return `${diffInHours}h ago`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRemainingTime = (poll) => {
    if (!poll.createdAt || !poll.duration) return "No time limit";
    if (poll.isExpired) return "Poll has ended";

    const createdAt = poll.createdAt instanceof Date ? poll.createdAt : poll.createdAt.toDate();
    const durationMs = 
      poll.duration.unit === "days" ? parseInt(poll.duration.value) * 24 * 60 * 60 * 1000 :
      poll.duration.unit === "hours" ? parseInt(poll.duration.value) * 60 * 60 * 1000 :
      poll.duration.unit === "minutes" ? parseInt(poll.duration.value) * 60 * 1000 : 0;

    const expiresAt = createdAt.getTime() + durationMs;
    const remainingTime = expiresAt - Date.now();

    if (remainingTime <= 0) return "Poll has ended";

    const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));

    return `Ends in: ${days > 0 ? `${days}d ` : ""}${hours > 0 ? `${hours}h ` : ""}${minutes}m`;
  };

  const winningVoteCount = Math.max(...(poll?.options || []).map((o) => o.votes || 0));

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.BLUE} />
      </View>
    );
  }

  if (!poll) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, color: colors.GRAY }}>Poll not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.LIGHT }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <AntDesign name="arrowleft" size={24} color={colors.DARK} />
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.BLUE]}
            tintColor={colors.BLUE}
          />
        }
      >
        {/* Poll Preview */}
        <View style={[styles.pollContainer, { backgroundColor: theme.bg }]}>
          <View style={styles.pollHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={poll.creatorProfilePic 
                  ? { uri: poll.creatorProfilePic } 
                  : require("../../assets/images/default.png")}
                style={styles.creatorAvatar}
              />
              <View>
                <Text style={styles.creatorName}>{poll.creatorName || "Unknown"}</Text>
                <Text style={styles.pollTime}>
                  {formatPollTime(poll.createdAt)} • {formatTime(poll.createdAt)}
                </Text>
              </View>
            </View>
            <View style={[styles.voteCountBadge, { backgroundColor: theme.main }]}>
              <Text style={styles.voteCountText}>{poll.totalVotes || 0} Votes</Text>
            </View>
          </View>

          <Text style={styles.pollTitleText}>{poll.title}</Text>
          {poll.description && (
            <Text style={styles.pollDescriptionText}>{poll.description}</Text>
          )}

          {poll.imageBase64 && (
            <Image 
              source={{ uri: poll.imageBase64 }}
              style={styles.pollImage}
            />
          )}

          <Text style={[styles.pollTimerText, { color: poll.isExpired ? 'red' : theme.main }]}>
            {formatRemainingTime(poll)}
          </Text>

          {/* Poll Results */}
          {poll.options?.map((option, index) => {
            const optionVotes = option.votes || 0;
            const percentage = poll.totalVotes > 0 
              ? ((optionVotes / poll.totalVotes) * 100).toFixed(1) 
              : 0;
            const isWinning = optionVotes === winningVoteCount && winningVoteCount > 0;

            return (
              <View key={index} style={{ marginTop: 10 }}>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarWrapper}>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${percentage}%`,
                            backgroundColor: isWinning ? theme.main : theme.sec,
                          },
                        ]}
                      />
                      <View style={styles.progressTextContainer}>
                        <Text
                          style={[styles.progressOption, { flex: 1 }]}
                          numberOfLines={2}
                        >
                          {option.text}
                        </Text>
                        <Text style={styles.progressPercentage}>{percentage}%</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Reactions */}
          <View style={styles.pollStats}>
            <View style={styles.reactionContainer}>
              <TouchableOpacity style={styles.reactionButton}>
                <AntDesign
                  name="like2"
                  size={20}
                  color={poll.likes?.includes(user?.uid) ? theme.main : colors.LIGHTGRAY}
                />
                <Text style={styles.reactionCount}>{poll.likes?.length || 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reactionButton}>
                <AntDesign
                  name="dislike2"
                  size={20}
                  color={poll.dislikes?.includes(user?.uid) ? theme.main : colors.LIGHTGRAY}
                />
                <Text style={styles.reactionCount}>{poll.dislikes?.length || 0}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.commentStat}>
              <AntDesign name="message1" size={20} color={colors.LIGHTGRAY} />
              <Text style={styles.commentCount}>{comments.length}</Text>
            </View>
          </View>
        </View>

        {/* Comments Section */}
        <View style={{ paddingHorizontal: 15, paddingBottom: 80 }}>
          <Text style={styles.headerTitle}>Comments</Text>
          {comments.length === 0 ? (
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>No comments yet</Text>
            </View>
          ) : (
            comments.map((item) => (
              <View key={item.id} style={styles.commentContainer}>
                <Image
                  source={
                    item.profilePic
                      ? { uri: item.profilePic }
                      : require("../../assets/images/default.png")
                  }
                  style={styles.commentAvatar}
                />
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUsername}>{item.username}</Text>
                    <Text style={styles.commentTime}>
                      {formatPollTime(item.timestamp)}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>

                {item.userId === user?.uid && (
                  <TouchableOpacity 
                    onPress={() => setMenuVisible(item.id)}
                    style={styles.menuButton}
                  >
                    <Entypo name="dots-three-vertical" size={18} color={colors.GRAY} />
                  </TouchableOpacity>
                )}

                {menuVisible === item.id && (
                  <View style={styles.menuContainer}>
                    <TouchableOpacity 
                      style={styles.menuItem}
                      onPress={() => editComment(item)}
                    >
                      <MaterialIcons name="edit" size={18} color={colors.BLUE} />
                      <Text style={styles.menuText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.menuItem}
                      onPress={() => confirmDeleteComment(item.id)}
                    >
                      <MaterialIcons name="delete" size={18} color="red" />
                      <Text style={[styles.menuText, { color: 'red' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Comment Input */}
      {/* Comment Input */}
<View style={styles.commentInputContainer}>
  <View style={{ flex: 1 }}>
    <TextInput
      placeholder="Write a comment..."
      value={newComment}
      onChangeText={setNewComment}
      multiline
      maxLength={500}
      style={styles.commentInput}
    />
    <Text style={styles.charCounter}>
      {newComment.length}/500
    </Text>
  </View>
  {editingCommentId ? (
    <View style={styles.editButtons}>
      <TouchableOpacity
        onPress={cancelEdit}
        style={[styles.commentButton, styles.cancelButton]}
      >
        <Text style={styles.buttonText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={submitComment}
        disabled={!newComment.trim()}
        style={[
          styles.commentButton,
          styles.submitButton,
          (!newComment.trim() || newComment.length > 500) && styles.disabledButton,
        ]}
      >
        <Text style={styles.buttonText}>Update</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <TouchableOpacity
  onPress={submitComment}
  disabled={!newComment.trim() || newComment.length > 500 || isSubmitting}
  style={[
    styles.commentSubmitButton,
    (!newComment.trim() || newComment.length > 500 || isSubmitting) && 
      styles.commentSubmitButtonDisabled,
  ]}
>
  {isSubmitting ? (
    <ActivityIndicator size="small" color="white" />
  ) : (
    <Text style={styles.commentSubmitText}>Post</Text>
  )}
</TouchableOpacity>
  )}
</View>
    </View>
  );
}

// Use the same styles as in your comments page
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    paddingVertical: 10,
    fontWeight: "bold",
    color: colors.DARK,
  },
  pollContainer: {
    padding: 20,
    paddingBottom: 30,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 4,
    borderColor: "white",
    elevation: 2,
    marginHorizontal: 15,
    marginTop: 10,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  creatorAvatar: {
    width: 35,
    height: 35,
    borderRadius: 20,
    marginRight: 10,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.GRAY,
  },
  pollTime: {
    fontSize: 12,
    color: colors.GRAY,
    marginTop: 2,
  },
  voteCountBadge: {
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  voteCountText: {
    color: 'white',
    fontSize: 14,
  },
  pollTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 5,
    color: colors.DARK,
  },
  pollDescriptionText: {
    fontSize: 14,
    color: colors.DARK,
  },
  pollImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 10,
    resizeMode: 'cover',
  },
  pollTimerText: {
    fontSize: 14,
    marginVertical: 10,
  },
  pollStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 20,
  },
  reactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionCount: {
    marginLeft: 5,
    fontSize: 14,
  },
  commentStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentCount: {
    marginLeft: 5,
    fontSize: 14,
    color: colors.LIGHTGRAY,
  },
  commentContainer: {
    flexDirection: "row",
    marginBottom: 15,
    position: 'relative',
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  commentBody: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 10,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  commentUsername: {
    fontWeight: "bold",
    fontSize: 14,
  },
  commentTime: {
    fontSize: 12,
    color: colors.GRAY,
  },
  commentText: {
    fontSize: 14,
    color: colors.DARK,
  },
  menuButton: {
    padding: 5,
    marginLeft: 5,
    alignSelf: 'flex-start',
  },
  menuContainer: {
    position: 'absolute',
    right: 0,
    top: 30,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  menuText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.DARK,
  },
  noComments: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  noCommentsText: {
    color: colors.GRAY,
    fontSize: 16,
  },
  commentInputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    alignItems: 'flex-end',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  commentInput: {
    flex: 1,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    minHeight: 40,
    maxHeight: 100,
  },
  editButtons: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  commentButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 5,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: colors.BLUE,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: 'bold',
  },
  commentSubmitButton: {
    backgroundColor: colors.BLUE,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginLeft: 10,
    justifyContent: "center",
  },
  commentSubmitButtonDisabled: {
    opacity: 0.5,
  },
  commentSubmitText: {
    color: "#fff",
    fontWeight: "bold",
  },
  progressBarContainer: {
    minHeight: 45,
    borderRadius: 13,
    overflow: "hidden",
    justifyContent: "center",
    backgroundColor: "white",
    elevation: 2,
    shadowColor: "gray",
  },
  progressBar: {
    height: "100%",
    borderRadius: 13,
    position: "absolute",
    left: 0,
    top: 0,
  },
  progressTextContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: "100%",
    paddingHorizontal: 10,
    position: "absolute",
    width: "100%",
  },
  progressPercentage: {
    fontWeight: "bold",
    color: colors.DARK,
  },
  progressOption: {
    fontWeight: "bold",
    color: colors.DARK,
  },
});