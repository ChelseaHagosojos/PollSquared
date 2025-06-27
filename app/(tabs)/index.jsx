import {
  View,
  Text,
  Image,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { auth, db } from "../../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { sendNotification } from "../../utils/notificationService";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  arrayUnion,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import colors from "../../constant/colors";
import { Dropdown } from "react-native-element-dropdown";
import { AntDesign } from "@expo/vector-icons";
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { registerScrollToTop } from '../../utils/scrollManager';
import { useRef } from "react";
export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [activePolls, setActivePolls] = useState([]);
  const [inactivePolls, setInactivePolls] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [refresh, setRefresh] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentPage, setCommentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [filter, setFilter] = useState("ongoing");
  const [sort, setSort] = useState("newest");
  const [searchType, setSearchType] = useState("polls"); // 'polls' or 'users'
  const flatListRef = useRef(null);
  const COMMENTS_PER_PAGE = 5;
  const [refreshing, setRefreshing] = useState(false);

const onRefresh = async () => {
  setRefreshing(true);
  try {
    // Re-fetch polls data
    const querySnapshot = await getDocs(
      query(collection(db, "polls"), where("createdBy", "!=", user.uid))
    );
    // Process the data as you did in the useEffect
    // ...
  } catch (error) {
    console.error("Error refreshing:", error);
  } finally {
    setRefreshing(false);
  }
};

React.useEffect(() => {
    registerScrollToTop(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return () => registerScrollToTop(null);
  }, []);
  
  const filterOptions = [
    { label: "All Polls", value: "all" },
    { label: "Ongoing", value: "ongoing" },
    { label: "Ended", value: "ended" },
    { label: "Participated", value: "participated" },
    { label: "Not Participated", value: "notParticipated" },
  ];

  const sortOptions = [
    { label: "Newest", value: "newest" },
    { label: "Oldest", value: "oldest" },
    { label: "Most Votes", value: "mostVotes" },
    { label: "Least Votes", value: "leastVotes" },
  ];

  const handleReaction = async (pollId, type) => {
    const pollRef = doc(db, "polls", pollId);
    const pollSnap = await getDoc(pollRef);
    const pollData = pollSnap.data();

    const currentArray = pollData[type === "like" ? "likes" : "dislikes"] || [];
    const oppositeArray =
      pollData[type === "like" ? "dislikes" : "likes"] || [];

    const hasReacted = currentArray.includes(user.uid);
    const updatedCurrent = hasReacted
      ? currentArray.filter((uid) => uid !== user.uid)
      : [...currentArray, user.uid];
    const updatedOpposite = oppositeArray.filter((uid) => uid !== user.uid);
    
    await updateDoc(pollRef, {
      [type === "like" ? "likes" : "dislikes"]: updatedCurrent,
      [type === "like" ? "dislikes" : "likes"]: updatedOpposite,
    });

    // Send notification for new reactions only (not when removing)
    if (!hasReacted && pollData.createdBy !== user.uid) {
      await sendNotification({
        recipientId: pollData.createdBy,
        senderId: user.uid,
        senderName: username,
        pollId: pollId,
        pollTitle: pollData.title,
        type: "reaction",
        reactionType: type,
      });
    }

    // Update both active and inactive polls
    setActivePolls((prev) =>
      prev.map((p) =>
        p.id === pollId
          ? {
              ...p,
              [type === "like" ? "likes" : "dislikes"]: updatedCurrent,
              [type === "like" ? "dislikes" : "likes"]: updatedOpposite,
            }
          : p
      )
    );
    setInactivePolls((prev) =>
      prev.map((p) =>
        p.id === pollId
          ? {
              ...p,
              [type === "like" ? "likes" : "dislikes"]: updatedCurrent,
              [type === "like" ? "dislikes" : "likes"]: updatedOpposite,
            }
          : p
      )
    );
  };

const openPollModal = async (poll) => {
  setSelectedPoll(poll);
  setModalVisible(true);
  setCommentPage(1); // Reset to first page when opening modal
  setNewComment("");
  setEditingCommentId(null);

  try {
    const commentsRef = collection(db, "polls", poll.id, "comments");
    const q = query(commentsRef, orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);

    const fetchedComments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setComments(fetchedComments);
  } catch (error) {
    console.error("Failed to load comments:", error);
    alert("Could not load comments.");
    setComments([]);
  }
};

  const [editingCommentId, setEditingCommentId] = useState(null);

const submitComment = async () => {
  if (!newComment.trim() || !user || !selectedPoll?.id) return;

  const commentsRef = collection(db, "polls", selectedPoll.id, "comments");

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
      const commentDocRef = doc(commentsRef, editingCommentId);
      await updateDoc(commentDocRef, {
        text: newComment.trim(),
        timestamp: serverTimestamp(),
      });
      setEditingCommentId(null);
    } else {
      // REMOVED THE COMMENT LIMIT CHECK
      await addDoc(commentsRef, commentData);

      if (selectedPoll.createdBy !== user.uid) {
        await sendNotification({
          recipientId: selectedPoll.createdBy,
          senderId: user.uid,
          senderName: username,
          pollId: selectedPoll.id,
          pollTitle: selectedPoll.title,
          type: "comment",
          commentText: commentData.text,
        });
      }
    }

    setNewComment("");
    openPollModal(selectedPoll); // Refresh comments
  } catch (error) {
    console.error("Failed to submit comment:", error);
    alert("Could not post comment.");
  }
};


  const editComment = (comment) => {
    setNewComment(comment.text);
    setEditingCommentId(comment.id);
  };

  const deleteComment = async (commentId) => {
    if (!selectedPoll?.id || !commentId) return;

    try {
      await deleteDoc(doc(db, "polls", selectedPoll.id, "comments", commentId));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error("Failed to delete comment:", error);
      alert("Could not delete comment.");
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
      console.log("No user detected, redirecting...");
      router.replace("/login");
      return;
    }

    setUser(currentUser);
    setLoading(true);

    try {
      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        setUsername(userDoc.data().username);
        setUser(prev => ({
          ...prev,
          profilePic: userDoc.data().profilePic
        }));
      }

      // Set up real-time listener for polls
      const pollsQuery = query(
        collection(db, "polls"),
        where("createdBy", "!=", currentUser.uid)
      );

      const unsubscribePolls = onSnapshot(pollsQuery, async (querySnapshot) => {
        const fetchedPolls = await Promise.all(
          querySnapshot.docs.map(async (document) => {
            const pollData = document.data();
            const userVote = pollData.votes?.find(
              (vote) => vote.userId === currentUser.uid
            );

            // Handle timestamps
            const createdAt = pollData.createdAt?.toDate
              ? pollData.createdAt.toDate().getTime()
              : pollData.createdAt?.seconds
              ? pollData.createdAt.seconds * 1000
              : Date.now();

            const durationMs =
              pollData.duration?.unit === "days"
                ? parseInt(pollData.duration.value) * 24 * 60 * 60 * 1000
                : pollData.duration?.unit === "hours"
                ? parseInt(pollData.duration.value) * 60 * 60 * 1000
                : pollData.duration?.unit === "minutes"
                ? parseInt(pollData.duration.value) * 60 * 1000
                : 0;

            const expiresAt = createdAt + durationMs;
            const remainingTime = expiresAt - Date.now();
            const isExpired = remainingTime <= 0;

            // Fetch creator's profile picture
            const creatorDoc = await getDoc(doc(db, "users", pollData.createdBy));
            const creatorProfilePic = creatorDoc.exists()
              ? creatorDoc.data().profilePic
              : null;

            // Check if poll just expired
            const wasActive = pollData.status !== "inactive";
            const isNowExpired = isExpired;

            if (wasActive && isNowExpired) {
              try {
                // Update status in Firestore
                await updateDoc(doc(db, "polls", document.id), { 
                  status: "inactive" 
                });

                // Get all voters who aren't the creator
                const voters = (pollData.votes || [])
                  .map((vote) => vote.userId)
                  .filter((uid) => uid !== pollData.createdBy);

                // Notify voters and creator
                const notifications = [
                  ...voters.map((voterId) =>
                    sendNotification({
                      recipientId: voterId,
                      senderId: currentUser.uid,
                      senderName: username || "Poll System",
                      pollId: document.id,
                      pollTitle: pollData.title,
                      type: "pollEnded",
                    })
                  ),
                  sendNotification({
                    recipientId: pollData.createdBy,
                    senderId: currentUser.uid,
                    senderName: username || "Poll System",
                    pollId: document.id,
                    pollTitle: pollData.title,
                    type: "pollEnded",
                  })
                ];

                await Promise.all(notifications);
              } catch (error) {
                console.error("Error handling expired poll:", error);
              }
            }

            return {
              id: document.id,
              ...pollData,
              remainingTime,
              isExpired,
              userVotedOption: userVote ? userVote.option : null,
              creatorProfilePic,
              creatorName: pollData.creatorName || "Unknown",
              createdAt: pollData.createdAt?.toDate() || new Date(createdAt),
            };
          })
        );

        // Update selectedOptions with user's votes
        const userVotes = {};
        fetchedPolls.forEach((poll) => {
          if (poll.userVotedOption) {
            userVotes[poll.id] = poll.userVotedOption;
          }
        });
        setSelectedOptions(userVotes);

        // Separate active and inactive polls
        setActivePolls(fetchedPolls.filter((poll) => !poll.isExpired));
        setInactivePolls(fetchedPolls.filter((poll) => poll.isExpired));
      });

      return () => unsubscribePolls();
    } catch (error) {
      console.error("Error initializing polls:", error);
    } finally {
      setLoading(false);
    }
  });

  return () => unsubscribeAuth();
}, []);

  // Handle vote selection
  const selectOption = (pollId, option) => {
    setSelectedOptions((prev) => {
      // If the selected option is already chosen, remove it (toggle off)
      if (prev[pollId] === option) {
        const updatedOptions = { ...prev };
        delete updatedOptions[pollId]; // Remove selection
        return updatedOptions;
      }
      return { ...prev, [pollId]: option }; // Otherwise, select the new option
    });
    setRefresh((prev) => !prev); // Force re-render
  };

  const votePoll = async (pollId) => {
    if (!user) return;

    setLoadingStates((prev) => ({ ...prev, [pollId]: true }));

    const selectedOption = selectedOptions[pollId];
    if (!selectedOption) {
      alert("Please select an option before submitting.");
      setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
      return;
    }

    try {
      const pollRef = doc(db, "polls", pollId);
      const pollSnap = await getDoc(pollRef);

      if (!pollSnap.exists()) {
        alert("Poll does not exist.");
        setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
        return;
      }

      const pollData = pollSnap.data();

      if (pollData.votes?.some((vote) => vote.userId === user.uid)) {
        alert("You have already voted in this poll.");
        setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
        return;
      }

      const updatedOptions = pollData.options.map((option) =>
        option.text === selectedOption
          ? { ...option, votes: option.votes + 1 }
          : option
      );

      await updateDoc(pollRef, {
        votes: arrayUnion({ userId: user.uid, option: selectedOption }),
        options: updatedOptions,
        totalVotes: (pollData.totalVotes || 0) + 1,
      });

      // Send notification to poll creator
      if (pollData.createdBy !== user.uid) {
        await sendNotification({
          recipientId: pollData.createdBy,
          senderId: user.uid,
          senderName: username,
          pollId: pollId,
          pollTitle: pollData.title,
          type: "vote",
        });
      }

      // Re-fetch updated poll data
      const updatedPollSnap = await getDoc(pollRef);
      const updatedPollData = updatedPollSnap.data();

      setActivePolls((prevPolls) =>
        prevPolls.map((poll) => {
          if (poll.id === pollId) {
            return {
              ...updatedPollData,
              id: pollId,
              userVotedOption: selectedOption,
              remainingTime: poll.remainingTime,
              creatorProfilePic: poll.creatorProfilePic,
            };
          }
          return poll;
        })
      );
    } catch (error) {
      console.error("Error voting:", error);
      alert("Failed to submit vote.");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
    }
  };

  const clearVote = async (pollId) => {
    if (!user) return;

    // Set loading state for this poll
    setLoadingStates((prev) => ({ ...prev, [pollId]: true }));

    try {
      const pollRef = doc(db, "polls", pollId);
      const pollSnap = await getDoc(pollRef);

      if (!pollSnap.exists()) {
        alert("Poll does not exist.");
        setLoadingStates((prev) => ({ ...prev, [pollId]: false })); // Reset loading state
        return;
      }

      const pollData = pollSnap.data();

      // Find the user's vote
      const userVoteIndex = pollData.votes?.findIndex(
        (vote) => vote.userId === user.uid
      );

      if (userVoteIndex === -1) {
        alert("You have not voted in this poll.");
        setLoadingStates((prev) => ({ ...prev, [pollId]: false })); // Reset loading state
        return;
      }

      // Remove user vote
      const updatedVotes = pollData.votes.filter(
        (vote) => vote.userId !== user.uid
      );

      // Decrease vote count for the selected option
      const selectedOption = pollData.votes[userVoteIndex].option;
      const updatedOptions = pollData.options.map((option) =>
        option.text === selectedOption
          ? { ...option, votes: Math.max(0, option.votes - 1) } // Ensure votes don't go negative
          : option
      );

      // Calculate new total votes count
      const newTotalVotes = Math.max(0, (pollData.totalVotes || 0) - 1);

      // Update Firestore
      await updateDoc(pollRef, {
        votes: updatedVotes,
        options: updatedOptions,
        totalVotes: newTotalVotes,
      });

      // Update state to force re-render
      setActivePolls((prevPolls) => {
        const newPolls = prevPolls.map((poll) =>
          poll.id === pollId
            ? {
                ...poll,
                votes: updatedVotes,
                options: updatedOptions,
                totalVotes: newTotalVotes,
                userVotedOption: null,
              }
            : poll
        );
        return [...newPolls]; // Return a new array reference to trigger re-render
      });
    } catch (error) {
      console.error("Error clearing vote:", error);
      alert("Failed to remove vote.");
    } finally {
      // Reset loading state
      setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
    }
  };

  // Filter and sort the polls
  const getFilteredAndSortedPolls = () => {
    let combinedPolls = [...activePolls, ...inactivePolls];

    // Apply search filter
    if (searchQuery) {
      combinedPolls = combinedPolls.filter(
        (poll) =>
          poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          poll.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    switch (filter) {
      case "ongoing":
        combinedPolls = combinedPolls.filter((poll) => !poll.isExpired);
        break;
      case "ended":
        combinedPolls = combinedPolls.filter((poll) => poll.isExpired);
        break;
      case "participated":
        combinedPolls = combinedPolls.filter(
          (poll) => poll.userVotedOption !== null
        );
        break;
      case "notParticipated":
        combinedPolls = combinedPolls.filter(
          (poll) => poll.userVotedOption === null
        );
        break;
      default:
        // "all" - no filter
        break;
    }

    // Apply sorting
    switch (sort) {
      case "newest":
        combinedPolls.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        combinedPolls.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "mostVotes":
        combinedPolls.sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));
        break;
      case "leastVotes":
        combinedPolls.sort((a, b) => (a.totalVotes || 0) - (b.totalVotes || 0));
        break;
      default:
        break;
    }

    return combinedPolls;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.DARK} />
      </View>
    );
  }


  const filteredPolls = getFilteredAndSortedPolls();

  return (
    <View style={{ flex: 1, backgroundColor: colors.BLUE }}>
      <View style={{ backgroundColor: colors.LIGHT }}>
<View
  style={{
    backgroundColor: colors.BLUE,
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 20, // Added proper bottom padding
    borderBottomRightRadius: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}
>
  {/* Logo on the left */}
  <Image
    style={{
      width: 45,
      height: 45,
      borderRadius: 5,
    }}
    source={require("./../../assets/images/logo3.jpg")}
  />

  {/* Search bar in the middle */}
  <View style={{ flex: 1, marginHorizontal: 15}}>
    {searchVisible ? (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 100,
        paddingHorizontal: 5,
        paddingVertical: 5,
      }}>
        <TextInput
          style={{
            flex: 1,
            color: 'black',
            paddingVertical: 8,
            paddingHorizontal: 10,
          }}
          placeholder="Search polls..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.GRAY}
          autoFocus
        />
        <TouchableOpacity
          onPress={() => {
            setSearchVisible(false);
            setSearchQuery('');
          }}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="close" size={22} color={colors.DARK} />
        </TouchableOpacity>
      </View>
    ) : null}
  </View>

  {/* Right side icons */}
  <View style={{ 
    flexDirection: 'row', 
    alignItems: 'center',
    minWidth: 80, // Ensures consistent spacing
    justifyContent: 'flex-end'
  }}>
    {/* Search Icon */}
    {!searchVisible && (
      <TouchableOpacity 
        onPress={() => setSearchVisible(true)} 
        style={{ padding: 8 }}
      >
        <Ionicons name="search" size={24} color="white" />
      </TouchableOpacity>
    )}

    {/* Notification button */}
    <TouchableOpacity
  style={{ padding: 8 }}
  onPress={() => router.push('./pages/notifications')}
>
  <Ionicons name="notifications-outline" size={24} color="white" />
</TouchableOpacity>


<TouchableOpacity style={{ marginLeft: 8 }}>
  <Image
    style={{
      width: 36,
      height: 36,
      borderRadius: 18,
    }}
    source={
      user?.profilePic
        ? { uri: user.profilePic }
        : require('./../../assets/images/default.png')
    }
  />
</TouchableOpacity>
  </View>
</View>
</View>
      <View
        style={{
          backgroundColor: colors.LIGHT,
          padding: 20,
          paddingBottom: 0,
          borderTopLeftRadius: 25,
          flex: 1,
        }}
      >
        {/* Filter and Sort Row */}
        <View style={styles.filterSortRow}>
          {/* Filter Dropdown */}
          <View style={styles.dropdownContainer}>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              inputSearchStyle={styles.dropdownInputSearch}
              iconStyle={styles.dropdownIconStyle}
              data={filterOptions}
              search={false}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select filter"
              value={filter}
              onChange={(item) => setFilter(item.value)}
              renderLeftIcon={() => (
                <AntDesign
                  style={styles.dropdownIcon}
                  color={colors.DARK}
                  name="filter"
                  size={18}
                />
              )}
            />
          </View>

          {/* Sort Dropdown */}
          <View style={styles.dropdownContainer}>
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              inputSearchStyle={styles.dropdownInputSearch}
              iconStyle={styles.dropdownIconStyle}
              data={sortOptions}
              search={false}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select sort"
              value={sort}
              onChange={(item) => setSort(item.value)}
              renderLeftIcon={() => (
                <AntDesign
                  style={styles.dropdownIcon}
                  color={colors.DARK}
                  name="arrowup"
                  size={18}
                />
              )}
            />
          </View>
        </View>

        {/* Combined Polls Section */}
        {filteredPolls.length > 0 ? (
          <FlatList
          ref={flatListRef}
            data={filteredPolls}
            keyExtractor={(item) => item.id}
            extraData={refresh} // Force FlatList to re-render
            refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[colors.BLUE]}
      tintColor={colors.BLUE}
    />
  }
            renderItem={({ item }) =>
              item.isExpired ? (
                <PollResultItem
                  item={item}
                  user={user}
                  userHasVoted={item.userVotedOption !== null}
                  selectedOption={selectedOptions[item.id]}
                  onSelectOption={selectOption}
                  onVote={votePoll}
                  onClearVote={clearVote}
                  loadingStates={loadingStates}
                  handleReaction={handleReaction}
                  openPollModal={openPollModal}
                />
              ) : (
                <PollItem
                  item={item}
                  user={user}
                  userHasVoted={item.userVotedOption !== null}
                  selectedOption={selectedOptions[item.id]}
                  onSelectOption={selectOption}
                  onVote={votePoll}
                  onClearVote={clearVote}
                  loadingStates={loadingStates}
                  handleReaction={handleReaction}
                  openPollModal={openPollModal}
                />
              )
            }
          />
        ) : (
          <Text
            style={{
              textAlign: "center",
              fontSize: 16,
              color: colors.GRAY,
              marginTop: 10,
            }}
          >
            No polls match your criteria.
          </Text>
        )}
      </View>
      {selectedPoll && (
        <Modal
          visible={modalVisible}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={{ flex: 1, padding: 20, backgroundColor: "#fff" }}>
            <View style={{ marginBottom: 20 }}>
              {/* Title */}
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: colors.DARK,
                  marginBottom: 8,
                }}
              >
                {selectedPoll.title}
              </Text>

              {/* Creator Info */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <Image
                  source={
                    selectedPoll.creatorProfilePic
                      ? { uri: selectedPoll.creatorProfilePic }
                      : require("./../../assets/images/default.png")
                  }
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: "#ccc",
                  }}
                />
                <Text style={{ fontSize: 14, color: colors.GRAY }}>
                  Created by:{" "}
                  <Text style={{ fontWeight: "600", color: colors.DARK }}>
                    {selectedPoll.creatorName || "Unknown"}
                  </Text>
                </Text>
              </View>
              <View
                style={{
                  borderBottomWidth: 1,
                  borderColor: "#eee",
                  marginTop: 15,
                }}
              />

              {/* Description */}
              <Text
                style={{ fontSize: 15, color: colors.GRAY, lineHeight: 20 }}
              >
                {selectedPoll.description}
              </Text>
            </View>
            <FlatList
                data={comments.slice(0, commentPage * COMMENTS_PER_PAGE)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                <View
                  style={{
                    backgroundColor: "#f2f2f2",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  {/* Profile Picture */}
                  <Image
                    source={
                      item.profilePic
                        ? { uri: item.profilePic }
                        : require("./../../assets/images/default.png")
                    }
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                  />

                  {/* Comment Body */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: "bold",
                        fontSize: 14,
                        color: colors.DARK,
                      }}
                    >
                      {item.username}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.GRAY }}>
                      {formatTime(item.timestamp?.toDate?.() || new Date())}
                    </Text>
                    <Text style={{ fontSize: 14, marginTop: 5 }}>
                      {item.text}
                    </Text>

                    {/* Edit/Delete Options */}
                    {item.userId === user.uid && (
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "flex-end",
                          marginTop: 10,
                          gap: 12,
                        }}
                      >
                        <TouchableOpacity onPress={() => editComment(item)}>
                          <Text
                            style={{ color: colors.BLUE, fontWeight: "600" }}
                          >
                            Edit
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => deleteComment(item.id)}
                        >
                          <Text style={{ color: "red", fontWeight: "600" }}>
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}
            />
            {comments.length > commentPage * COMMENTS_PER_PAGE && (
        <TouchableOpacity
          onPress={() => setCommentPage(prev => prev + 1)}
          style={{
            padding: 12,
            backgroundColor: colors.DARK,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: 10,
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            See More Comments
          </Text>
        </TouchableOpacity>
      )}
            {/* Input Section */}
            <View
              style={{
                marginTop: 10,
                borderTopWidth: 1,
                borderColor: "#ddd",
                paddingTop: 15,
              }}
            >
              <TextInput
                placeholder="Write a comment..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
                style={{
                  borderColor: colors.GRAY,
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 14,
                  backgroundColor: "#fff",
                  minHeight: 50,
                  textAlignVertical: "top",
                }}
              />
              <TouchableOpacity
                onPress={submitComment}
                style={{
                  backgroundColor: colors.DARK,
                  padding: 12,
                  borderRadius: 10,
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  {newComment.trim() ? "Post Comment" : "Type something..."}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{ marginTop: 20 }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: "red",
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}

// PollItem component for active polls
const PollItem = ({
  item,
  userHasVoted,
  selectedOption,
  onSelectOption,
  onVote,
  onClearVote,
  loadingStates,
  handleReaction,
  openPollModal,
  user,
}) => {
  const isLoading = loadingStates[item.id] || false;
const formatDateLabel = (date) => {
  if (!date) return 'Unknown date';
  
  // Handle Firebase Timestamp, JavaScript Date, or ISO string
  const postDate = typeof date.toDate === 'function' 
    ? date.toDate() 
    : new Date(date);
  
  if (isNaN(postDate.getTime())) return 'Invalid date';

  const now = new Date();
  const diffInSeconds = Math.floor((now - postDate) / 1000);
  
  // Format time as 1:00 PM (12-hour format)
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(/^0/, ''); // Remove leading zero for hours
  };

  // For today's posts
  if (postDate.toDateString() === now.toDateString()) {
    if (diffInSeconds < 60) return `Just now`;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    return `${diffInHours}h ago`;
  }

  // For yesterday's posts
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (postDate.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${formatTime(postDate)}`;
  }

  // For older posts
  return postDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + ` at ${formatTime(postDate)}`;
};
  const getThemeColors = () => {
    switch(item.theme) {
      case 'red':
        return { bg: colors.REDBG, main: colors.REDMAIN, sec: colors.REDSEC};
      case 'orange':
        return { bg: colors.ORGBG, main: colors.ORGMAIN, sec: colors.ORGSEC };
      case 'yellow':
        return { bg: colors.YELBG, main: colors.YELMAIN, sec: colors.YELSEC };
      case 'green':
        return { bg: colors.GRBG, main: colors.GRMAIN, sec: colors.GRSEC };
      case 'blue':
        return { bg: colors.BLBG, main: colors.BLMAIN, sec: colors.BLSEC };
      case 'violet':
        return { bg: colors.VIOBG, main: colors.VIOMAIN, sec: colors.VIOSEC };
      case 'pink':
        return { bg: colors.PINKBG, main: colors.PINKMAIN, sec: colors.PINKSEC };
      default:
        return { bg: 'white', main: colors.BLUE, sec: 'white' }; // Default theme
    }
  };
  const theme = getThemeColors();
  return (
    <View
      style={{
        backgroundColor: theme.bg,
        padding: 20,
        paddingBottom: 30,
        marginBottom: 25,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        borderWidth: 4,
        borderColor: "white",
        elevation: 2,
        shadowColor: "gray",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <Image
    source={
      item.creatorProfilePic
        ? { uri: item.creatorProfilePic }
        : require('./../../assets/images/default.png')
    }
    style={{
      width: 35,
      height: 35,
      borderRadius: 20,
      marginRight: 10,
    }}
  />
  <View>
    <Text
      style={{
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.GRAY,
      }}
    >
      {item.creatorName}
    </Text>
    <Text style={{ fontSize: 12, color: colors.GRAY, marginTop: 2 }}>
  {formatDateLabel(item.createdAt)}
</Text>

  </View>
</View>
        <View
          style={{
            backgroundColor: theme.main,
            borderRadius: 20,
            paddingVertical: 5,
            paddingHorizontal: 10,
            minWidth: 80,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 14 }}>
            {item.totalVotes || 0} Votes
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 16, fontWeight: "bold", marginVertical: 5 }}>
        {item.title}
      </Text>
      <Text style={{ fontSize: 14 }}>{item.description}</Text>
      {item.imageBase64 && (
  <Image 
    source={{ uri: item.imageBase64 }}
    style={{
      width: '100%',
      height: 200,
      borderRadius: 10,
      marginTop: 10,
      resizeMode: 'cover'
    }}
  />
)}
      <Text
        style={{
          fontSize: 14,
          color: item.isExpired ? "red" : theme.main,
          marginVertical: 10,
        }}
      >
        {item.isExpired
          ? "Poll has ended"
          : (() => {
              const days = Math.floor(
                item.remainingTime / (1000 * 60 * 60 * 24)
              );
              const hours = Math.floor(
                (item.remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
              );
              const minutes = Math.floor(
                (item.remainingTime % (1000 * 60 * 60)) / (1000 * 60)
              );

              return `Ends in: ${days > 0 ? `${days}d ` : ""}${
                hours > 0 ? `${hours}h ` : ""
              }${minutes}m`;
            })()}
      </Text>

      {item.options?.map((option, index) => (
        <TouchableOpacity
          key={index}
          onPress={() =>
            !userHasVoted &&
            !item.isExpired &&
            onSelectOption(item.id, option.text)
          }
          disabled={userHasVoted || item.isExpired}
          style={{
            minHeight: 50,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor:
              selectedOption === option.text ? theme.sec : "white",
            padding: 10,
            marginTop: 8,
            borderRadius: 15,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 5,
            borderWidth: 4,
            borderColor: "white",
            elevation: 2,
            shadowColor: "gray",
            opacity:
              (userHasVoted && selectedOption !== option.text) || item.isExpired
                ? 0.5
                : 1,
          }}
        >
          {/* Circle Indicator */}
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: colors.DARK,
              backgroundColor:
                selectedOption === option.text ? colors.DARK : "transparent",
              marginRight: 10,
            }}
          />
          <Text
            style={{
              color: selectedOption === option.text ? colors.DARK : colors.DARK,
              flex: 1, // Allow text to take available space
              flexWrap: "wrap", // Allow text to wrap
            }}
          >
            {option.text}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Submit Button - Hidden if the user already voted */}
      {!userHasVoted && (
        <TouchableOpacity
          onPress={() => onVote(item.id)}
          disabled={!selectedOption || item.isExpired || isLoading}
          style={{
            backgroundColor: item.isExpired ? "gray" : theme.main,
            padding: 10,
            marginTop: 25,
            borderRadius: 25,
            alignItems: "center",
            opacity: item.isExpired || !selectedOption || isLoading ? 0.5 : 1,
          }}
        >
          <Text style={{ color: colors.LIGHT, fontWeight: "bold" }}>
            {isLoading
              ? "Submitting..."
              : item.isExpired
              ? "Poll Ended"
              : "Submit Vote"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Clear Vote Button - Shown only if user has voted */}
      {userHasVoted && (
        <TouchableOpacity
          onPress={() => onClearVote(item.id)}
          disabled={isLoading}
          style={{
            backgroundColor: "gray",
            padding: 10,
            marginTop: 25,
            borderRadius: 25,
            alignItems: "center",
            opacity: isLoading ? 0.5 : 1,
          }}
        >
          <Text style={{ color: colors.LIGHT, fontWeight: "bold" }}>
            {isLoading ? "Clearing..." : "Clear Vote"}
          </Text>
        </TouchableOpacity>
      )}
      {/* Reactions and Actions Row */}
<View style={{
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 15,
  paddingHorizontal: 10,
  borderTopWidth: 1,
  borderTopColor: '#f0f0f0',
  paddingTop: 20,
}}>

  {/* Like Button */}
  <TouchableOpacity 
    style={{ flexDirection: 'row', alignItems: 'center' }}
    onPress={() => handleReaction(item.id, "like")}
  >
    <AntDesign
      name={item.likes?.includes(user?.uid) ? "like1" : "like2"}
      size={20}
      color={item.likes?.includes(user?.uid) ? theme.main : colors.LIGHTGRAY}
    />
    <Text style={{
      marginLeft: 5,
      fontSize: 14,
      color: item.likes?.includes(user?.uid) ? theme.main : colors.LIGHTGRAY
    }}>
      {item.likes?.length || 0}
    </Text>
  </TouchableOpacity>

  {/* Dislike Button */}
  <TouchableOpacity 
    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3 }}
    onPress={() => handleReaction(item.id, "dislike")}
  >
    <AntDesign
      name={item.dislikes?.includes(user?.uid) ? "dislike1" : "dislike2"}
      size={20}
      color={item.dislikes?.includes(user?.uid) ? theme.main : colors.LIGHTGRAY}
    />
    <Text style={{
      marginLeft: 5,
      fontSize: 14,
      color: item.dislikes?.includes(user?.uid) ? theme.main : colors.LIGHTGRAY
    }}>
      {item.dislikes?.length || 0}
    </Text>
  </TouchableOpacity>

  {/* Comment Button */}
  <TouchableOpacity 
    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 40 }}
    onPress={() => openPollModal(item)}
  >
    <AntDesign
      name="message1"
      size={20}
      color={colors.LIGHTGRAY}
    />
    <Text style={{ marginLeft: 5, fontSize: 14, color: colors.LIGHTGRAY }}>
      Comments
    </Text>
  </TouchableOpacity>

  {/* Share Button */}
  <TouchableOpacity 
    style={{ flexDirection: 'row', alignItems: 'center' }}
    onPress={() => handleShare(item)}
  >
    <AntDesign
      name="sharealt"
      size={20}
      color={colors.LIGHTGRAY}
    />
  </TouchableOpacity>

</View>

    </View>
  );
};

// PollResultItem component for inactive polls
const PollResultItem = ({ item, handleReaction, openPollModal, user }) => {
  const totalVotes = item.totalVotes || 0;
  const maxVotes = Math.max(...item.options.map((option) => option.votes || 0));
const formatDateLabel = (date) => {
  if (!date) return 'Unknown date';
  
  // Handle Firebase Timestamp, JavaScript Date, or ISO string
  const postDate = typeof date.toDate === 'function' 
    ? date.toDate() 
    : new Date(date);
  
  if (isNaN(postDate.getTime())) return 'Invalid date';

  const now = new Date();
  const diffInSeconds = Math.floor((now - postDate) / 1000);
  
  // Format time as 1:00 PM (12-hour format)
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(/^0/, ''); // Remove leading zero for hours
  };

  // For today's posts
  if (postDate.toDateString() === now.toDateString()) {
    if (diffInSeconds < 60) return `Just now (${formatTime(postDate)})`;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago (${formatTime(postDate)})`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    return `${diffInHours}h ago (${formatTime(postDate)})`;
  }

  // For yesterday's posts
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (postDate.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${formatTime(postDate)}`;
  }

  // For older posts
  return postDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + ` at ${formatTime(postDate)}`;
};
  const getThemeColors = () => {
    switch(item.theme) {
      case 'red':
        return { bg: colors.REDBG, main: colors.REDMAIN, sec: colors.REDSEC};
      case 'orange':
        return { bg: colors.ORGBG, main: colors.ORGMAIN, sec: colors.ORGSEC };
      case 'yellow':
        return { bg: colors.YELBG, main: colors.YELMAIN, sec: colors.YELSEC };
      case 'green':
        return { bg: colors.GRBG, main: colors.GRMAIN, sec: colors.GRSEC };
      case 'blue':
        return { bg: colors.BLBG, main: colors.BLMAIN, sec: colors.BLSEC };
      case 'violet':
        return { bg: colors.VIOBG, main: colors.VIOMAIN, sec: colors.VIOSEC };
      case 'pink':
        return { bg: colors.PINKBG, main: colors.PINKMAIN, sec: colors.PINKSEC };
      default:
        return { bg: 'white', main: colors.BLUE, sec: 'white' }; // Default theme
    }
  };
  const theme = getThemeColors();
  return (
    <View
      style={{
        backgroundColor: theme.bg,
        padding: 20,
        paddingBottom: 30,
        marginBottom: 25,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        borderWidth: 4,
        borderColor: "white",
        elevation: 2,
        shadowColor: "gray",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 5,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image
            source={
              item.creatorProfilePic
                ? { uri: item.creatorProfilePic }
                : require("./../../assets/images/default.png")
            }
            style={{ width: 35, height: 35, borderRadius: 20, marginRight: 10 }}
          />
  <View>
    <Text
      style={{
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.GRAY,
      }}
    >
      {item.creatorName}
    </Text>
    <Text style={{ fontSize: 12, color: colors.GRAY, marginTop: 2 }}>
  {formatDateLabel(item.createdAt)}
</Text>

  </View>
        </View>
        <View
          style={{
            backgroundColor: theme.main,
            borderRadius: 20,
            paddingVertical: 5,
            paddingHorizontal: 10,
            minWidth: 80,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontSize: 14 }}>
            {totalVotes} Votes
          </Text>
        </View>
      </View>
      <Text style={{ fontSize: 16, fontWeight: "bold", marginTop: 5 }}>
        {item.title}
      </Text>
      <Text style={{ fontSize: 16, marginVertical: 5 }}>
        {item.description}
      </Text>
      {item.imageBase64 && (
  <Image 
    source={{ uri: item.imageBase64 }}
    style={{
      width: '100%',
      height: 200,
      borderRadius: 10,
      marginTop: 10,
      resizeMode: 'cover'
    }}
  />
)}
      <Text style={{ fontSize: 14, color: "red", marginVertical: 5 }}>
        Poll has ended
      </Text>

      {item.options?.map((option, index) => {
        const optionVotes = option.votes || 0;
        const percentage =
          totalVotes > 0 ? ((optionVotes / totalVotes) * 100).toFixed(2) : 0;

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
                      numberOfLines={2} // Allow text to wrap
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

      {/* Add reactions and comments section */}
      <View style={{
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 15,
  paddingHorizontal: 10,
  borderTopWidth: 1,
  borderTopColor: '#f0f0f0',
  paddingTop: 20,
}}>

  {/* Like Button */}
  <TouchableOpacity 
    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}
    onPress={() => handleReaction(item.id, "like")}
  >
    <AntDesign
      name={item.likes?.includes(user?.uid) ? "like1" : "like2"}
      size={20}
      color={item.likes?.includes(user?.uid) ? theme.main : colors.LIGHTGRAY}
    />
    <Text style={{
      marginLeft: 5,
      fontSize: 14,
      color: item.likes?.includes(user?.uid) ? theme.main : colors.LIGHTGRAY
    }}>
      {item.likes?.length || 0}
    </Text>
  </TouchableOpacity>

  {/* Dislike Button */}
  <TouchableOpacity 
    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}
    onPress={() => handleReaction(item.id, "dislike")}
  >
    <AntDesign
      name={item.dislikes?.includes(user?.uid) ? "dislike1" : "dislike2"}
      size={20}
      color={item.dislikes?.includes(user?.uid) ? colors.BLUE : colors.LIGHTGRAY}
    />
    <Text style={{
      marginLeft: 5,
      fontSize: 14,
      color: item.dislikes?.includes(user?.uid) ? colors.BLUE : colors.LIGHTGRAY
    }}>
      {item.dislikes?.length || 0}
    </Text>
  </TouchableOpacity>

  {/* Comment Button */}
  <TouchableOpacity 
    style={{ flexDirection: 'row', alignItems: 'center' }}
    onPress={() => openPollModal(item)}
  >
    <AntDesign
      name="message1"
      size={20}
      color={colors.LIGHTGRAY}
    />
    <Text style={{ marginLeft: 5, fontSize: 14, color: colors.LIGHTGRAY }}>
      Comments
    </Text>
  </TouchableOpacity>

  {/* Share Button */}
  <TouchableOpacity 
    style={{ flexDirection: 'row', alignItems: 'center' }}
    onPress={() => handleShare(item)}
  >
    <AntDesign
      name="sharealt"
      size={20}
      color={colors.LIGHTGRAY}
    />
  </TouchableOpacity>

</View>

    </View>
  );
};

const styles = StyleSheet.create({
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
  reactionsContainer: { flexDirection: "row", gap: 12, marginTop: 10 },
  reactionText: { fontSize: 14, color: colors.DARK },
  commentText: { fontSize: 14, color: colors.BLUE },
  searchContainer: {
    marginVertical: 20,
    borderRadius: 100,
    overflow: "hidden",
    backgroundColor: colors.LIGHT,
    elevation: 2,
    shadowColor: "gray",
    flex: 1,
    marginHorizontal: 15,
  },
  filterSortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  dropdownContainer: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: colors.LIGHT,
    elevation: 2,
    shadowColor: "gray",
  },
  dropdown: {
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.LIGHT,
    paddingHorizontal: 10,
  },
  dropdownLabel: {
    fontSize: 14,
    color: colors.DARK,
    marginBottom: 5,
    paddingLeft: 10,
  },
  dropdownPlaceholder: {
    color: colors.GRAY,
  },
  dropdownSelectedText: {
    color: colors.DARK,
  },
  dropdownInputSearch: {
    height: 40,
    fontSize: 16,
  },
  dropdownIconStyle: {
    width: 20,
    height: 20,
  },
});
