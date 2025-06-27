import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { auth, db } from "../../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  getDoc,
  arrayUnion,
} from "firebase/firestore";
import { AntDesign, Entypo, MaterialIcons, Feather } from "@expo/vector-icons";
import colors from "../../constant/colors";
import { sendNotification } from "../../utils/notificationService";

export default function CommentsPage() {
  const router = useRouter();
  const { pollId } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [poll, setPoll] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [refreshing, setRefreshing] = useState(false);
const handleRefresh = async () => {
  setRefreshing(true);
  try {
    // Re-fetch the poll data
    const pollDoc = await getDoc(doc(db, "polls", pollId));
    if (pollDoc.exists()) {
      const pollData = pollDoc.data();
      
      // Keep the existing poll data and only update what might have changed
      setPoll(prev => ({
        ...prev, // Keep all existing data
        ...pollData, // Update with new data from Firestore
        id: pollDoc.id,
        // Preserve these values if they exist in the current state
        creatorProfilePic: prev?.creatorProfilePic || null,
        creatorName: prev?.creatorName || "Unknown",
        userVotedOption: prev?.userVotedOption || null,
        // Update timestamps if they exist in the new data
        createdAt: pollData.createdAt?.toDate() || prev?.createdAt || new Date(),
        // Recalculate expiration status
        isExpired: (() => {
          const createdAt = pollData.createdAt?.toDate() || prev?.createdAt || new Date();
          const durationMs = 
            pollData.duration?.unit === "days" ? parseInt(pollData.duration.value) * 24 * 60 * 60 * 1000 :
            pollData.duration?.unit === "hours" ? parseInt(pollData.duration.value) * 60 * 60 * 1000 :
            pollData.duration?.unit === "minutes" ? parseInt(pollData.duration.value) * 60 * 1000 : 0;
          const expiresAt = createdAt.getTime() + durationMs;
          return expiresAt <= Date.now();
        })()
      }));
    }
  } catch (error) {
    console.error("Error refreshing:", error);
    Alert.alert("Error", "Failed to refresh data");
  } finally {
    setRefreshing(false);
  }
};
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!pollId) return;

    const fetchPoll = async () => {
      try {
        const pollDoc = await getDoc(doc(db, "polls", pollId));
        if (pollDoc.exists()) {
          const pollData = pollDoc.data();
          
          const createdAt = pollData.createdAt?.toDate() || new Date();
          const durationMs = 
            pollData.duration?.unit === "days" ? parseInt(pollData.duration.value) * 24 * 60 * 60 * 1000 :
            pollData.duration?.unit === "hours" ? parseInt(pollData.duration.value) * 60 * 60 * 1000 :
            pollData.duration?.unit === "minutes" ? parseInt(pollData.duration.value) * 60 * 1000 : 0;
          const expiresAt = createdAt.getTime() + durationMs;
          const isExpired = expiresAt <= Date.now();

          const userVotedOption = pollData.votes?.find(vote => vote.userId === user?.uid)?.option || null;

          let creatorProfilePic = null;
          let creatorName = "Unknown";
          
          if (pollData.createdBy) {
            const creatorDoc = await getDoc(doc(db, "users", pollData.createdBy));
            if (creatorDoc.exists()) {
              creatorProfilePic = creatorDoc.data().profilePic || null;
              creatorName = creatorDoc.data().username || creatorDoc.data().email || "Unknown";
            }
          }

          setPoll({
            id: pollDoc.id,
            ...pollData,
            createdAt,
            createdBy: pollData.createdBy || "Unknown",
            creatorProfilePic,
            creatorName,
            title: pollData.title || "No title",
            description: pollData.description || "",
            options: pollData.options || [],
            totalVotes: pollData.totalVotes || 0,
            votes: pollData.votes || [],
            likes: pollData.likes || [],
            dislikes: pollData.dislikes || [],
            isExpired,
            userVotedOption,
          });

          if (userVotedOption) {
            setSelectedOptions(prev => ({ ...prev, [pollDoc.id]: userVotedOption }));
          }
        }
      } catch (error) {
        console.error("Error fetching poll:", error);
      }
    };

    fetchPoll();

    const commentsRef = collection(db, "polls", pollId, "comments");
    const q = query(commentsRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map((doc) => {
        const commentData = doc.data();
        return {
          id: doc.id,
          ...commentData,
          username: commentData.username || "Anonymous",
          text: commentData.text || "",
          profilePic: commentData.profilePic || null,
          timestamp: commentData.timestamp?.toDate() || new Date(),
        };
      });
      setComments(fetchedComments);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pollId, user?.uid]);

  const selectOption = (pollId, option) => {
    setSelectedOptions((prev) => {
      if (prev[pollId] === option) {
        const updatedOptions = { ...prev };
        delete updatedOptions[pollId];
        return updatedOptions;
      }
      return { ...prev, [pollId]: option };
    });
  };

  const votePoll = async (pollId) => {
    if (!user || !poll) return;

    setLoadingStates((prev) => ({ ...prev, [pollId]: true }));

    const selectedOption = selectedOptions[pollId];
    if (!selectedOption) {
      alert("Please select an option before submitting.");
      setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
      return;
    }

    try {
      const pollRef = doc(db, "polls", pollId);
      const updatedOptions = poll.options.map((option) =>
        option.text === selectedOption
          ? { ...option, votes: option.votes + 1 }
          : option
      );

      await updateDoc(pollRef, {
        votes: arrayUnion({ userId: user.uid, option: selectedOption }),
        options: updatedOptions,
        totalVotes: (poll.totalVotes || 0) + 1,
      });

      setPoll((prev) => ({
        ...prev,
        votes: [...(prev.votes || []), { userId: user.uid, option: selectedOption }],
        options: updatedOptions,
        totalVotes: (prev.totalVotes || 0) + 1,
        userVotedOption: selectedOption,
      }));

      if (poll.createdBy !== user.uid) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const username = userDoc.exists() ? userDoc.data().username : user.email;
        
        await sendNotification({
          recipientId: poll.createdBy,
          senderId: user.uid,
          senderName: username,
          pollId: pollId,
          pollTitle: poll.title,
          type: "vote",
        });
      }
    } catch (error) {
      console.error("Error voting:", error);
      alert("Failed to submit vote.");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
    }
  };

  const clearVote = async (pollId) => {
    if (!user || !poll) return;

    setLoadingStates((prev) => ({ ...prev, [pollId]: true }));

    try {
      const pollRef = doc(db, "polls", pollId);
      const userVoteIndex = poll.votes?.findIndex(
        (vote) => vote.userId === user.uid
      );

      if (userVoteIndex === -1) {
        alert("You have not voted in this poll.");
        setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
        return;
      }

      const selectedOption = poll.votes[userVoteIndex].option;
      const updatedOptions = poll.options.map((option) =>
        option.text === selectedOption
          ? { ...option, votes: Math.max(0, option.votes - 1) }
          : option
      );

      const updatedVotes = poll.votes.filter(
        (vote) => vote.userId !== user.uid
      );

      await updateDoc(pollRef, {
        votes: updatedVotes,
        options: updatedOptions,
        totalVotes: Math.max(0, (poll.totalVotes || 0) - 1),
      });

      setPoll((prev) => ({
        ...prev,
        votes: updatedVotes,
        options: updatedOptions,
        totalVotes: Math.max(0, (prev.totalVotes || 0) - 1),
        userVotedOption: null,
      }));

      setSelectedOptions(prev => {
        const newOptions = {...prev};
        delete newOptions[pollId];
        return newOptions;
      });
    } catch (error) {
      console.error("Error clearing vote:", error);
      alert("Failed to remove vote.");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
    }
  };

  const handleReaction = async (pollId, type) => {
    if (!user) return;

    const pollRef = doc(db, "polls", pollId);
    const currentArray = poll[type === "like" ? "likes" : "dislikes"] || [];
    const oppositeArray = poll[type === "like" ? "dislikes" : "likes"] || [];

    const hasReacted = currentArray.includes(user.uid);
    const updatedCurrent = hasReacted
      ? currentArray.filter((uid) => uid !== user.uid)
      : [...currentArray, user.uid];
    const updatedOpposite = oppositeArray.filter((uid) => uid !== user.uid);
    
    await updateDoc(pollRef, {
      [type === "like" ? "likes" : "dislikes"]: updatedCurrent,
      [type === "like" ? "dislikes" : "likes"]: updatedOpposite,
    });

    setPoll((prev) => ({
      ...prev,
      [type === "like" ? "likes" : "dislikes"]: updatedCurrent,
      [type === "like" ? "dislikes" : "likes"]: updatedOpposite,
    }));

    if (!hasReacted && poll.createdBy !== user.uid) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const username = userDoc.exists() ? userDoc.data().username : user.email;
      
      await sendNotification({
        recipientId: poll.createdBy,
        senderId: user.uid,
        senderName: username,
        pollId: pollId,
        pollTitle: poll.title,
        type: "reaction",
        reactionType: type,
      });
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !user || !pollId) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const username = userDoc.exists() ? userDoc.data().username : user.email;
      const profilePic = userDoc.exists() ? userDoc.data().profilePic : null;

      const commentData = {
        userId: user.uid,
        username,
        text: newComment.trim(),
        timestamp: serverTimestamp(),
        profilePic: profilePic || "",
      };

      if (editingCommentId) {
        await updateDoc(doc(db, "polls", pollId, "comments", editingCommentId), {
          text: newComment.trim(),
          timestamp: serverTimestamp(),
        });
        setEditingCommentId(null);
      } else {
        await addDoc(collection(db, "polls", pollId, "comments"), commentData);

        if (poll?.createdBy && poll.createdBy !== user.uid) {
          await sendNotification({
            recipientId: poll.createdBy,
            senderId: user.uid,
            senderName: username,
            pollId: pollId,
            pollTitle: poll.title,
            type: "comment",
            commentText: commentData.text,
          });
        }
      }

      setNewComment("");
    } catch (error) {
      console.error("Failed to submit comment:", error);
      Alert.alert("Error", "Could not post comment.");
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
      await deleteDoc(doc(db, "polls", pollId, "comments", commentId));
      setMenuVisible(null);
    } catch (error) {
      console.error("Failed to delete comment:", error);
      Alert.alert("Error", "Could not delete comment.");
    }
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setNewComment("");
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

  if (loading || !poll) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.BLUE} />
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
        {/* <Text style={styles.headerTitle}>Comments</Text> */}
        <TouchableOpacity>
          <Feather name="share-2" size={20} color={colors.DARK} />
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView style={{ flex: 1 }}
      refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={[colors.BLUE]} // Customize as needed
      tintColor={colors.BLUE} // For iOS
    />
  }>
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
                <Text style={styles.creatorName}>{poll.creatorName}</Text>
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

          {/* Poll Options */}
          {poll.options?.map((option, index) => {
            if (poll.isExpired) {
              const optionVotes = option.votes || 0;
              const percentage = poll.totalVotes > 0 
                ? ((optionVotes / poll.totalVotes) * 100).toFixed(2) 
                : 0;

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
                              backgroundColor: theme.sec,
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
            } else {
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => !poll.userVotedOption && selectOption(poll.id, option.text)}
                  disabled={!!poll.userVotedOption}  // Explicit boolean conversion
                  style={[styles.pollOption, { 
                    backgroundColor: poll.userVotedOption === option.text || selectedOptions[poll.id] === option.text 
                      ? theme.sec 
                      : 'white',
                  }]}
                >
                  <View style={[styles.optionIndicator, {
                    borderColor: colors.DARK,
                    backgroundColor: poll.userVotedOption === option.text || selectedOptions[poll.id] === option.text 
                      ? colors.DARK 
                      : 'transparent'
                  }]} />
                  <Text style={styles.optionText}>{option.text}</Text>
                </TouchableOpacity>
              );
            }
          })}

          {/* Voting Buttons */}
          {poll.isExpired ? (
            <Text style={[styles.pollTimerText, { color: 'red', textAlign: 'center', height:0 }]}>
              
            </Text>
          ) : !poll.userVotedOption ? (
            <TouchableOpacity
              onPress={() => votePoll(poll.id)}
              disabled={!selectedOptions[poll.id] || !!loadingStates[poll.id]}  // Explicit boolean conversion
              style={{
                backgroundColor: theme.main,
                padding: 10,
                marginTop: 25,
                borderRadius: 25,
                alignItems: "center",
                opacity: !selectedOptions[poll.id] || loadingStates[poll.id] ? 0.5 : 1,
              }}
            >
              <Text style={{ color: colors.LIGHT, fontWeight: "bold" }}>
                {loadingStates[poll.id] ? "Submitting..." : "Submit Vote"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => clearVote(poll.id)}
              disabled={!!loadingStates[poll.id]}  // Explicit boolean conversion
              style={{
                backgroundColor: "gray",
                padding: 10,
                marginTop: 25,
                borderRadius: 25,
                alignItems: "center",
                opacity: loadingStates[poll.id] ? 0.5 : 1,
              }}
            >
              <Text style={{ color: colors.LIGHT, fontWeight: "bold" }}>
                {loadingStates[poll.id] ? "Clearing..." : "Clear Vote"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Reactions */}
          <View style={styles.pollStats}>
            <View style={styles.reactionContainer}>
              <TouchableOpacity 
                style={styles.reactionButton}
                onPress={() => handleReaction(poll.id, "like")}
              >
                <AntDesign
                  name={poll.likes?.includes(user?.uid) ? "like1" : "like2"}
                  size={20}
                  color={poll.likes?.includes(user?.uid) ? theme.main : colors.LIGHTGRAY}
                />
                <Text style={styles.reactionCount}>{poll.likes?.length || 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.reactionButton}
                onPress={() => handleReaction(poll.id, "dislike")}
              >
                <AntDesign
                  name={poll.dislikes?.includes(user?.uid) ? "dislike1" : "dislike2"}
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
        {/* Comments List */}
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
      <View style={styles.commentInputContainer}>
        <TextInput
          placeholder="Write a comment..."
          value={newComment}
          onChangeText={setNewComment}
          multiline
          style={styles.commentInput}
        />
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
                !newComment.trim() && styles.disabledButton,
              ]}
            >
              <Text style={styles.buttonText}>Update</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={submitComment}
            disabled={!newComment.trim()}
            style={[
              styles.commentSubmitButton,
              !newComment.trim() && styles.commentSubmitButtonDisabled,
            ]}
          >
            <Text style={styles.commentSubmitText}>Post</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Stylesheet remains the same as in your original code


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
  pollOption: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginTop: 8,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 4,
    borderColor: "white",
    elevation: 2,
  },
  optionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 10,
  },
  optionText: {
    color: colors.DARK,
    flex: 1,
    flexWrap: 'wrap',
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