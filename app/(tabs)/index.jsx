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
import { color } from "react-native-elements/dist/helpers";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [filter, setFilter] = useState("ongoing");
  const [sort, setSort] = useState("newest");
  const [searchType, setSearchType] = useState("polls"); // 'polls' or 'users'
  const flatListRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduledPolls, setScheduledPolls] = useState([]);
  
const getThemeColors = (theme) => {
  switch(theme) {
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
      return { bg: 'white', main: colors.BLUE, sec: colors.LIGHTBLUE };
  }
};

 const openPollModal = (poll) => {
    router.push(`/comments?pollId=${poll.id}`);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const querySnapshot = await getDocs(
        query(collection(db, "polls"), where("createdBy", "!=", user.uid))
      );
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = (value) => {
    setFilter(value);
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  };

  const handleSortChange = (value) => {
    setSort(value);
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
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
    { label: "Scheduled", value: "scheduled" },
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
    setScheduledPolls((prev) =>
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
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username);
          setUser(prev => ({
            ...prev,
            profilePic: userDoc.data().profilePic
          }));
        }

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

              const createdAt = pollData.createdAt?.toDate
                ? pollData.createdAt.toDate().getTime()
                : pollData.createdAt?.seconds
                ? pollData.createdAt.seconds * 1000
                : Date.now();

              // Handle scheduled polls
              if (pollData.isScheduled) {
              const startTime = pollData.startTime?.toDate 
                ? pollData.startTime.toDate().getTime()
                : pollData.startTime?.seconds 
                ? pollData.startTime.seconds * 1000 
                : now;
              
              const isNotStarted = now < startTime;
              const shouldBeActive = !isNotStarted && pollData.status !== "active";

              // Automatically activate if start time has passed
              if (shouldBeActive) {
                try {
                  await updateDoc(doc(db, "polls", document.id), { 
                    status: "active",
                    isScheduled: false,
                    startTime: serverTimestamp() // Update to actual start time
                  });
                  console.log(`Poll ${document.id} activated`);
                } catch (error) {
                  console.error("Error activating scheduled poll:", error);
                }
              }

              return {
                id: document.id,
                ...pollData,
                isScheduled: isNotStarted,
                isNotStarted,
                startTime: pollData.startTime?.toDate() || new Date(startTime),
                showPreview: pollData.showPreview || false,
                userVotedOption: userVote ? userVote.option : null,
                creatorProfilePic: pollData.creatorProfilePic || null,
                creatorName: pollData.creatorName || "Unknown",
                createdAt: pollData.createdAt?.toDate() || new Date(createdAt),
              };
            }

              // Handle regular polls
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

              const creatorDoc = await getDoc(doc(db, "users", pollData.createdBy));
              const creatorProfilePic = creatorDoc.exists()
                ? creatorDoc.data().profilePic
                : null;

              if (isExpired && pollData.status !== "inactive") {
                try {
                  await updateDoc(doc(db, "polls", document.id), { 
                    status: "inactive" 
                  });

                  const voters = (pollData.votes || [])
                    .map((vote) => vote.userId)
                    .filter((uid) => uid !== pollData.createdBy);

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
          
          const userVotes = {};
          fetchedPolls.forEach((poll) => {
            if (poll.userVotedOption) {
              userVotes[poll.id] = poll.userVotedOption;
            }
          });
          setSelectedOptions(userVotes);

          setActivePolls(fetchedPolls.filter(poll => 
            !poll.isExpired && !poll.isScheduled
          ));
          setInactivePolls(fetchedPolls.filter(poll => 
            poll.isExpired && !poll.isScheduled
          ));
          setScheduledPolls(fetchedPolls.filter(poll => 
            poll.isScheduled
          ));

          const activationInterval = setInterval(() => {
      setActivePolls(prev => prev.map(poll => {
        if (poll.isScheduled && poll.startTime && new Date(poll.startTime) <= new Date()) {
          return { ...poll, isScheduled: false, isNotStarted: false };
        }
        return poll;
      }));
    }, 60000); // Check every minute

    return () => {
      unsubscribePolls();
      clearInterval(activationInterval);
    };
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

  const selectOption = (pollId, option) => {
    setSelectedOptions((prev) => {
      if (prev[pollId] === option) {
        const updatedOptions = { ...prev };
        delete updatedOptions[pollId];
        return updatedOptions;
      }
      return { ...prev, [pollId]: option };
    });
    setRefresh((prev) => !prev);
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

    setLoadingStates((prev) => ({ ...prev, [pollId]: true }));

    try {
      const pollRef = doc(db, "polls", pollId);
      const pollSnap = await getDoc(pollRef);

      if (!pollSnap.exists()) {
        alert("Poll does not exist.");
        setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
        return;
      }

      const pollData = pollSnap.data();

      const userVoteIndex = pollData.votes?.findIndex(
        (vote) => vote.userId === user.uid
      );

      if (userVoteIndex === -1) {
        alert("You have not voted in this poll.");
        setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
        return;
      }

      const updatedVotes = pollData.votes.filter(
        (vote) => vote.userId !== user.uid
      );

      const selectedOption = pollData.votes[userVoteIndex].option;
      const updatedOptions = pollData.options.map((option) =>
        option.text === selectedOption
          ? { ...option, votes: Math.max(0, option.votes - 1) }
          : option
      );

      const newTotalVotes = Math.max(0, (pollData.totalVotes || 0) - 1);

      await updateDoc(pollRef, {
        votes: updatedVotes,
        options: updatedOptions,
        totalVotes: newTotalVotes,
      });

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
        return [...newPolls];
      });
    } catch (error) {
      console.error("Error clearing vote:", error);
      alert("Failed to remove vote.");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
    }
  };

  const getFilteredAndSortedPolls = () => {
    let combinedPolls = [...activePolls, ...inactivePolls, ...scheduledPolls];

    if (searchQuery) {
      combinedPolls = combinedPolls.filter(
        (poll) =>
          poll.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          poll.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (filter) {
      case "ongoing":
        combinedPolls = combinedPolls.filter((poll) => !poll.isExpired && !poll.isScheduled);
        break;
      case "ended":
        combinedPolls = combinedPolls.filter((poll) => poll.isExpired);
        break;
      case "scheduled":
      combinedPolls = combinedPolls.filter(poll => 
        poll.isScheduled && (poll.showPreview || poll.createdBy === user?.uid)
      );
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
        break;
    }

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
            paddingBottom: 20,
            borderBottomRightRadius: 25,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Image
            style={{
              width: 45,
              height: 45,
              borderRadius: 5,
            }}
            source={require("./../../assets/images/logo3.jpg")}
          />

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
                  onChangeText={handleSearch}
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

          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center',
            minWidth: 80,
            justifyContent: 'flex-end'
          }}>
            {!searchVisible && (
              <TouchableOpacity 
                onPress={() => setSearchVisible(true)} 
                style={{ padding: 8 }}
              >
                <Ionicons name="search" size={24} color="white" />
              </TouchableOpacity>
            )}

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
        <View style={styles.filterSortRow}>
          <View style={styles.dropdownContainer}>
            <Dropdown
              style={styles.dropdown}
              onChange={(item) => handleFilterChange(item.value)}
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

          <View style={styles.dropdownContainer}>
            <Dropdown
              style={styles.dropdown}
              onChange={(item) => handleSortChange(item.value)}
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

        {filteredPolls.length > 0 ? (
          <FlatList
            ref={flatListRef}
            key={`${filter}-${sort}`}
            data={filteredPolls}
            keyExtractor={(item) => item.id}
            extraData={[filter, sort, searchQuery, refresh]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.BLUE]}
                tintColor={colors.BLUE}
              />
            }
            renderItem={({ item }) => {
              if (item.isScheduled) {
                return (
                  <ScheduledPollItem 
                    item={item} 
                    theme={getThemeColors(item.theme)} 
                    user={user}
                    router={router}
                    handleReaction={handleReaction}
                  />
                );
              } else if (item.isExpired) {
                return (
                  <PollResultItem
                    item={item}
                    user={user}
                    router={router}
                    userHasVoted={item.userVotedOption !== null}
                    selectedOption={selectedOptions[item.id]}
                    onSelectOption={selectOption}
                    onVote={votePoll}
                    onClearVote={clearVote}
                    loadingStates={loadingStates}
                    handleReaction={handleReaction}
                  />
                );
              } else {
                return (
                  <PollItem
                    item={item}
                    user={user}
                    router={router}
                    userHasVoted={item.userVotedOption !== null}
                    selectedOption={selectedOptions[item.id]}
                    onSelectOption={selectOption}
                    onVote={votePoll}
                    onClearVote={clearVote}
                    loadingStates={loadingStates}
                    handleReaction={handleReaction}
                  />
                );
              }
            }}
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
    </View>
  );
}

const ScheduledPollItem = ({ item, user, router, handleReaction }) => {
  const formatDateLabel = (date) => {
    if (!date) return 'Soon';
    
    // Handle Firebase Timestamp or Date object
    const d = date.toDate ? date.toDate() : new Date(date);
    
    if (isNaN(d.getTime())) return 'Invalid date';

    const now = new Date();
    const isThisYear = d.getFullYear() === now.getFullYear();

    // Format time as 1:00 PM
    const timeString = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(/^0/, ''); // Remove leading zero for hours

    // Format date
    if (d.toDateString() === now.toDateString()) {
      return `Today at ${timeString}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${timeString}`;
    }

    // For dates within this year, don't show year
    if (isThisYear) {
      return `${d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })} at ${timeString}`;
    }

    // For older dates, show year
    return `${d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })} at ${timeString}`;
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
        return { bg: 'white', main: colors.BLUE, sec: colors.LIGHTBLUE };
    }
  };
  
  const themeColors = getThemeColors();
  const shouldShowPreview = item.showPreview || item.createdBy === user?.uid;
  return (
    <View style={{
      backgroundColor: themeColors.bg,
      padding: 20,
      marginBottom: 25,
      borderRadius: 10,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 5,
      borderWidth: 4,
      borderColor: "white",
      elevation: 2,
      shadowColor: "gray",
      opacity: 0.9
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            source={item.creatorProfilePic 
              ? { uri: item.creatorProfilePic } 
              : require('./../../assets/images/default.png')}
            style={{ width: 35, height: 35, borderRadius: 20, marginRight: 10 }}
          />
          <View>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.GRAY }}>
              {item.creatorName}
            </Text>
            <Text style={{ fontSize: 12, color: colors.GRAY, marginTop: 2 }}>
              {formatDateLabel(item.createdAt)}
            </Text>
          </View>
        </View>
        <View style={{ 
          backgroundColor: colors.LIGHTGRAY, 
          borderRadius: 20,
          paddingVertical: 5,
          paddingHorizontal: 10,
          minWidth: 80,
          alignItems: "center",
        }}>
          <Text style={{ color: "white", fontSize: 14 }}>Scheduled</Text>
        </View>
      </View>

      <Text style={{ fontSize: 16, fontWeight: "bold", marginVertical: 5 }}>
        {item.title}
      </Text>
      {item.description && <Text style={{ fontSize: 14 }}>{item.description}</Text>}
      
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

      {/* Only show preview section if showPreview is true */}
      {item.showPreview && (
        <>
          <Text style={{ 
            color: colors.GRAY, 
            marginVertical: 10,
            fontStyle: 'italic'
          }}>
            Preview (poll not started yet)
          </Text>
          
          {item.options?.map((option, index) => (
            <View key={index} style={{
              minHeight: 50,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "white",
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
            }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: colors.DARK,
                  backgroundColor: "transparent",
                  marginRight: 10,
                }}
              />
              <Text style={{ color: colors.DARK, flex: 1, flexWrap: "wrap" }}>
                {option.text}
              </Text>
            </View>
          ))}
        </>
      )}

      <Text style={{ 
        marginTop: 10,
        color: themeColors.main,
        fontSize: 14,
        fontWeight: 'bold'
      }}>
        Starts at: {formatDateLabel(item.startTime)}
      </Text>
      
      {item.endTime && (
        <Text style={{ 
          color: themeColors.main,
          fontSize: 14,
          fontWeight: 'bold'
        }}>
          Ends at: {formatDateLabel(item.endTime)}
        </Text>
      )}

      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
        paddingHorizontal: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 20,
      }}>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onPress={() => handleReaction(item.id, "like")}
        >
          <AntDesign
            name={item.likes?.includes(user?.uid) ? "like1" : "like2"}
            size={20}
            color={item.likes?.includes(user?.uid) ? themeColors.main : colors.LIGHTGRAY}
          />
          <Text style={{
            marginLeft: 5,
            fontSize: 14,
            color: item.likes?.includes(user?.uid) ? themeColors.main : colors.LIGHTGRAY
          }}>
            {item.likes?.length || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3 }}
          onPress={() => handleReaction(item.id, "dislike")}
        >
          <AntDesign
            name={item.dislikes?.includes(user?.uid) ? "dislike1" : "dislike2"}
            size={20}
            color={item.dislikes?.includes(user?.uid) ? themeColors.main : colors.LIGHTGRAY}
          />
          <Text style={{
            marginLeft: 5,
            fontSize: 14,
            color: item.dislikes?.includes(user?.uid) ? themeColors.main : colors.LIGHTGRAY
          }}>
            {item.dislikes?.length || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 40 }}
          onPress={() => router.push(`../pages/comments?pollId=${item.id}`)}
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
  user,
  router
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
        return { bg: 'white', main: colors.BLUE, sec: colors.LIGHTBLUE }; // Default theme
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
    onPress={() => router.push(`../pages/comments?pollId=${item.id}`)}
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
const PollResultItem = ({ item, handleReaction, openPollModal, user, router }) => {
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
        return { bg: 'white', main: colors.BLUE, sec: colors.LIGHTBLUE }; // Default theme
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
    onPress={() => router.push(`../pages/comments?pollId=${item.id}`)}
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
