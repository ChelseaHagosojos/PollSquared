import { View, Text, Image, ActivityIndicator, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { auth, db } from '../../firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, getDoc, updateDoc, doc, arrayUnion, query, where } from 'firebase/firestore';
import colors from '../../constant/colors';

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser ] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [activePolls, setActivePolls] = useState([]);
  const [inactivePolls, setInactivePolls] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [refresh, setRefresh] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
const [selectedPoll, setSelectedPoll] = useState(null);
const [comments, setComments] = useState([]);
const [newComment, setNewComment] = useState('');
const [commentPage, setCommentPage] = useState(1);
const COMMENTS_PER_PAGE = 5;
const handleReaction = async (pollId, type) => {
  const pollRef = doc(db, 'polls', pollId);
  const pollSnap = await getDoc(pollRef);
  const pollData = pollSnap.data();

  const currentArray = pollData[type === 'like' ? 'likes' : 'dislikes'] || [];
  const oppositeArray = pollData[type === 'like' ? 'dislikes' : 'likes'] || [];

  const hasReacted = currentArray.includes(user.uid);
  const updatedCurrent = hasReacted ? currentArray.filter(uid => uid !== user.uid) : [...currentArray, user.uid];
  const updatedOpposite = oppositeArray.filter(uid => uid !== user.uid);

  await updateDoc(pollRef, {
    [type === 'like' ? 'likes' : 'dislikes']: updatedCurrent,
    [type === 'like' ? 'dislikes' : 'likes']: updatedOpposite,
  });

  // Refresh poll state
  setActivePolls(prev =>
    prev.map(p =>
      p.id === pollId ? { ...p, [type === 'like' ? 'likes' : 'dislikes']: updatedCurrent, [type === 'like' ? 'dislikes' : 'likes']: updatedOpposite } : p
    )
  );
};

const openPollModal = async (poll) => {
  setSelectedPoll(poll);
  setModalVisible(true);
  setCommentPage(1);
  const pollRef = doc(db, 'polls', poll.id);
  const pollSnap = await getDoc(pollRef);
  const pollData = pollSnap.data();
  setComments(pollData.comments || []);
};

const submitComment = async () => {
  if (!newComment.trim()) return;
  const updated = [...comments, { userId: user.uid, username, text: newComment }];
  await updateDoc(doc(db, 'polls', selectedPoll.id), { comments: updated });
  setComments(updated);
  setNewComment('');
};

const editComment = (index) => {
  const toEdit = comments[index];
  setNewComment(toEdit.text);
  deleteComment(index); // Will be re-added on submit
};

const deleteComment = async (index) => {
  const updated = comments.filter((_, i) => i !== index);
  await updateDoc(doc(db, 'polls', selectedPoll.id), { comments: updated });
  setComments(updated);
};

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        console.log('No user detected, redirecting...');
        router.replace('/login');
        return;
      }
  
      setUser(currentUser);
      setLoading(true);
  
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) setUsername(userDoc.data().username);
  
        const querySnapshot = await getDocs(
          query(collection(db, 'polls'), where('createdBy', '!=', currentUser.uid))
        );
  
        const fetchedPolls = await Promise.all(querySnapshot.docs.map(async (document) => {
          const pollData = document.data();
          const userVote = pollData.votes?.find((vote) => vote.userId === currentUser.uid);
          const createdAt = pollData.createdAt?.seconds * 1000; // Convert to milliseconds
          const durationMs = pollData.duration?.unit === 'days'
            ? parseInt(pollData.duration.value) * 24 * 60 * 60 * 1000
            : pollData.duration?.unit === 'hours'
              ? parseInt(pollData.duration.value) * 60 * 60 * 1000
              : pollData.duration?.unit === 'minutes'
                ? parseInt(pollData.duration.value) * 60 * 1000 // Handle minutes
                : 0;
  
          const expiresAt = createdAt + durationMs;
          const remainingTime = expiresAt - Date.now();
          const isExpired = remainingTime <= 0;
  
          // Fetch creator's profile picture
          const creatorDoc = await getDoc(doc(db, 'users', pollData.createdBy));
          const creatorProfilePic = creatorDoc.exists() ? creatorDoc.data().profilePic : null;
  
          return {
            id: document.id,
            ...pollData,
            remainingTime,
            isExpired,
            userVotedOption: userVote ? userVote.option : null,
            creatorProfilePic, // Add the profile picture to the poll data
          };
        }));
  
        // Update Firestore for expired polls in batch (optional)
        const updates = fetchedPolls
          .filter((poll) => poll.isExpired && poll.status !== 'inactive')
          .map(async (poll) => await updateDoc(doc(db, 'polls', poll.id), { status: 'inactive' }));
  
        await Promise.all(updates); // Batch update
  
        // Separate active and inactive polls
        setActivePolls(fetchedPolls.filter((poll) => !poll.isExpired));
        setInactivePolls(fetchedPolls.filter((poll) => poll.isExpired));
  
        // Populate selectedOptions with the user's previous votes
        const userVotes = {};
        fetchedPolls.forEach((poll) => {
          if (poll.userVotedOption) {
            userVotes[poll.id] = poll.userVotedOption;
          }
        });
        setSelectedOptions(userVotes); // Set the selectedOptions state
      } catch (error) {
        console.error('Error fetching polls:', error);
      }
  
      setLoading(false);
    });
  
    return () => unsubscribe();
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

  // Submit vote
  const votePoll = async (pollId) => {
    if (!user) return;
  
    // Set loading state for this poll
    setLoadingStates((prev) => ({ ...prev, [pollId]: true }));
  
    const selectedOption = selectedOptions[pollId];
    if (!selectedOption) {
      alert('Please select an option before submitting.');
      setLoadingStates((prev) => ({ ...prev, [pollId]: false })); // Reset loading state
      return;
    }
  
    try {
      const pollRef = doc(db, 'polls', pollId);
      const pollSnap = await getDoc(pollRef);
  
      if (!pollSnap.exists()) {
        alert('Poll does not exist.');
        setLoadingStates((prev) => ({ ...prev, [pollId]: false })); // Reset loading state
        return;
      }
  
      const pollData = pollSnap.data();
  
      // Check if user already voted
      if (pollData.votes?.some(vote => vote.userId === user.uid)) {
        alert('You have already voted in this poll.');
        setLoadingStates((prev) => ({ ...prev, [pollId]: false })); // Reset loading state
        return;
      }
  
      // Update options array by incrementing votes
      const updatedOptions = pollData.options.map(option =>
        option.text === selectedOption
          ? { ...option, votes: option.votes + 1 }
          : option
      );
  
      // Update Firestore
      await updateDoc(pollRef, {
        votes: arrayUnion({ userId: user.uid, option: selectedOption }),
        options: updatedOptions,
        totalVotes: (pollData.totalVotes || 0) + 1, // Increase total vote count
      });
  
      // Re-fetch updated poll data
      const updatedPollSnap = await getDoc(pollRef);
      const updatedPollData = updatedPollSnap.data();
  
      // Update state to reflect vote submission
      setActivePolls(prevPolls =>
        prevPolls.map(poll => {
          if (poll.id === pollId) {
            // Preserve the remainingTime and creatorProfilePic from the previous state
            const remainingTime = poll.remainingTime;
            const creatorProfilePic = poll.creatorProfilePic;
  
            return {
              ...updatedPollData,
              id: pollId,
              userVotedOption: selectedOption,
              remainingTime, // Preserve the remainingTime
              creatorProfilePic, // Preserve the creatorProfilePic
            };
          }
          return poll;
        })
      );
  
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to submit vote.');
    } finally {
      // Reset loading state
      setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
    }
  };

  const clearVote = async (pollId) => {
    if (!user) return;
  
    // Set loading state for this poll
    setLoadingStates((prev) => ({ ...prev, [pollId]: true }));
  
    try {
      const pollRef = doc(db, 'polls', pollId);
      const pollSnap = await getDoc(pollRef);
  
      if (!pollSnap.exists()) {
        alert('Poll does not exist.');
        setLoadingStates((prev) => ({ ...prev, [pollId]: false })); // Reset loading state
        return;
      }
  
      const pollData = pollSnap.data();
  
      // Find the user's vote
      const userVoteIndex = pollData.votes?.findIndex(vote => vote.userId === user.uid);
  
      if (userVoteIndex === -1) {
        alert('You have not voted in this poll.');
        setLoadingStates((prev) => ({ ...prev, [pollId]: false })); // Reset loading state
        return;
      }
  
      // Remove user vote
      const updatedVotes = pollData.votes.filter(vote => vote.userId !== user.uid);
  
      // Decrease vote count for the selected option
      const selectedOption = pollData.votes[userVoteIndex].option;
      const updatedOptions = pollData.options.map(option =>
        option.text === selectedOption
          ? { ...option, votes: Math.max(0, option.votes - 1) } // Ensure votes don’t go negative
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
            ? { ...poll, votes: updatedVotes, options: updatedOptions, totalVotes: newTotalVotes, userVotedOption: null }
            : poll
        );
        return [...newPolls]; // Return a new array reference to trigger re-render
      });
  
    } catch (error) {
      console.error('Error clearing vote:', error);
      alert('Failed to remove vote.');
    } finally {
      // Reset loading state
      setLoadingStates((prev) => ({ ...prev, [pollId]: false }));
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.DARK} />
      </View>
    );
  }

  // Combine active and inactive polls
  const combinedPolls = [...activePolls, ...inactivePolls];

  return (
    <View style={{ flex: 1, backgroundColor: colors.DARK }}>
      <View style={{ backgroundColor: colors.LIGHT }}>
        <View style={{ backgroundColor: colors.DARK, paddingVertical: 20, padding: 20, borderBottomRightRadius: 25 }}>
          <Image
            style={{ width: 45, height: 45, borderRadius: 5, alignSelf: 'flex-end' }}
            source={require('./../../assets/images/logo3.jpg')}
          />
          <Text style={{ fontSize: 25, color: colors.LIGHT, fontWeight: 'bold', marginTop: 10 }}>
            Welcome, {username}!
          </Text>
        </View>
      </View>
      <View style={{ backgroundColor: colors.LIGHT, padding: 20, paddingBottom: 0, borderTopLeftRadius: 25, flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginVertical: 15 }}>Available Polls</Text>

        {/* Combined Polls Section */}
        {combinedPolls.length > 0 ? (
          <FlatList
            data={combinedPolls}
            keyExtractor={(item) => item.id}
            extraData={refresh} // Force FlatList to re-render
            renderItem={({ item }) => (
              item.isExpired ? (
                <PollResultItem item={item} />
              ) : (
                <PollItem
                  item={item}
                  userHasVoted={item.userVotedOption !== null}
                  selectedOption={selectedOptions[item.id]}
                  onSelectOption={selectOption}
                  onVote={votePoll}
                  onClearVote={clearVote}
                  loadingStates={loadingStates} // Make sure this is passed properly
                  handleReaction={handleReaction}  // <-- Pass the function here
                  openPollModal={openPollModal} 
                />
              )
            )}
          />
        ) : (
          <Text style={{ textAlign: 'center', fontSize: 16, color: colors.GRAY, marginTop: 10 }}>
            No polls available to vote.
          </Text>
        )}
      </View>
      {selectedPoll && (
  <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{selectedPoll.title}</Text>
      <Text>{selectedPoll.description}</Text>

      <FlatList
        data={comments.slice(0, commentPage * COMMENTS_PER_PAGE)}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={{ marginVertical: 5 }}>
            <Text style={{ fontWeight: 'bold' }}>{item.username}</Text>
            <Text>{item.text}</Text>
            {item.userId === user.uid && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => editComment(index)}> 
                  <Text style={{ color: 'orange' }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteComment(index)}>
                  <Text style={{ color: 'red' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListFooterComponent={() =>
          comments.length > commentPage * COMMENTS_PER_PAGE && (
            <TouchableOpacity onPress={() => setCommentPage(prev => prev + 1)}>
              <Text style={{ color: colors.BLUE, marginTop: 10 }}>View more...</Text>
            </TouchableOpacity>
          )
        }
      />

      <TextInput
        placeholder="Add a comment..."
        value={newComment}
        onChangeText={setNewComment}
        style={{ borderColor: colors.GRAY, borderWidth: 1, marginTop: 10, padding: 8, borderRadius: 5 }}
      />
      <TouchableOpacity onPress={submitComment} style={{ backgroundColor: colors.DARK, padding: 10, marginTop: 10 }}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>Post Comment</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginTop: 20 }}>
        <Text style={{ textAlign: 'center', color: 'red' }}>Close</Text>
      </TouchableOpacity>
    </View>
  </Modal>
)}

    </View>
    
  );
}

// PollItem component for active polls
const PollItem = ({ item, userHasVoted, selectedOption, onSelectOption, onVote, onClearVote, loadingStates,handleReaction, openPollModal  }) => {
  const isLoading = loadingStates[item.id] || false;

  return (
    <View
      style={{
        backgroundColor: 'white',
        padding: 20,
        paddingBottom: 30,
        marginBottom: 25,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        borderWidth: 4,
        borderColor: 'white',
        elevation: 2,
        shadowColor: 'gray'
      }}
    >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Image
        source={item.creatorProfilePic ? { uri: item.creatorProfilePic } : require('./../../assets/images/default.png')}
        style={{ width: 35, height: 35, borderRadius: 20, marginRight: 10 }}
      />
      <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.GRAY }}>{item.creatorName}</Text>
    </View>
    <View style={{
      backgroundColor: colors.BLUE, // Use your defined color
      borderRadius: 20,
      paddingVertical: 5,
      paddingHorizontal: 10,
      minWidth: 80,
      alignItems: 'center'
    }}>
      <Text style={{ color: 'white', fontSize: 14 }}>{item.totalVotes || 0} Votes</Text>
    </View>
  </View>
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginVertical: 5 }}>{item.title}</Text>
      <Text style={{ fontSize: 14}}>{item.description}</Text>
      <Text style={{ fontSize: 14, color: item.isExpired ? 'red' : colors.BLUE, marginVertical: 10}}>
        {item.isExpired
          ? 'Poll has ended'
          : (() => {
              const days = Math.floor(item.remainingTime / (1000 * 60 * 60 * 24));
              const hours = Math.floor((item.remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((item.remainingTime % (1000 * 60 * 60)) / (1000 * 60));

              return `Ends in: ${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
            })()}
      </Text>

      {item.options?.map((option, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => !userHasVoted && !item.isExpired && onSelectOption(item.id, option.text)}
          disabled={userHasVoted || item.isExpired}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: selectedOption === option.text ? colors.LIGHTBLUE : 'white',
            padding: 10,
            marginTop: 8,
            borderRadius: 15,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 5,
            borderWidth: 4,
            borderColor: 'white',
            elevation: 2,
            shadowColor: 'gray',
            opacity: (userHasVoted && selectedOption !== option.text) || item.isExpired ? 0.5 : 1,
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
              backgroundColor: selectedOption === option.text ? colors.DARK : 'transparent',
              marginRight: 10,
            }}
          />
          <Text style={{ color: selectedOption === option.text ? colors.DARK : colors.DARK }}>
            {option.text}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Submit Button - Hidden if the user already voted */}
      {!userHasVoted && (
        <TouchableOpacity
          onPress={() => onVote(item.id)}
          disabled={!selectedOption || item.isExpired || isLoading} // Disable during loading
          style={{
            backgroundColor: item.isExpired ? 'gray' : colors.BLUE,
            padding: 10,
            marginTop: 25,
            borderRadius: 25,
            alignItems: 'center',
            opacity: item.isExpired || !selectedOption || isLoading ? 0.5 : 1, // Adjust opacity
          }}
        >
          <Text style={{ color: colors.LIGHT, fontWeight: 'bold' }}>
            {isLoading ? 'Submitting...' : item.isExpired ? 'Poll Ended' : 'Submit Vote'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Clear Vote Button - Shown only if user has voted */}
      {userHasVoted && (
        <TouchableOpacity
          onPress={() => onClearVote(item.id)}
          disabled={isLoading} // Disable during loading
          style={{
            backgroundColor: 'gray',
            padding: 10,
            marginTop: 25,
            borderRadius: 25,
            alignItems: 'center',
            opacity: isLoading ? 0.5 : 1, // Adjust opacity
          }}
        >
          <Text style={{ color: colors.LIGHT, fontWeight: 'bold' }}>
            {isLoading ? 'Clearing...' : 'Clear Vote'}
          </Text>
        </TouchableOpacity>
      )}
      <View style={styles.reactionsContainer}>
        <TouchableOpacity onPress={() => handleReaction(item.id, 'like')}>
          <Text style={styles.reactionText}>👍 {item.likes?.length || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleReaction(item.id, 'dislike')}>
          <Text style={styles.reactionText}>👎 {item.dislikes?.length || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openPollModal(item)}>
          <Text style={styles.commentText}>💬 Comments</Text>
        </TouchableOpacity>
    </View>

    </View>
    
  );
};
// PollResultItem component for inactive polls
const PollResultItem = ({ item }) => {
  const totalVotes = item.totalVotes || 0;
  const maxVotes = Math.max(...item.options.map(option => option.votes || 0));


  return (
    <View
  style={{
    backgroundColor: 'white',
    padding: 20,
    paddingBottom: 30,
    marginBottom: 25,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 4,
    borderColor: 'white',
    elevation: 2,
    shadowColor: 'gray'
  }}
>
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Image
        source={item.creatorProfilePic ? { uri: item.creatorProfilePic } : require('./../../assets/images/default.png')}
        style={{ width: 35, height: 35, borderRadius: 20, marginRight: 10 }}
      />
      <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.GRAY }}>{item.creatorName}</Text>
    </View>
    <View style={{
      backgroundColor: colors.BLUE, // Use your defined color
      borderRadius: 20,
      paddingVertical: 5,
      paddingHorizontal: 10,
      minWidth: 80,
      alignItems: 'center'
    }}>
      <Text style={{ color: 'white', fontSize: 14 }}>{totalVotes} Votes</Text>
    </View>
  </View>
  <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 5 }}>{item.title}</Text>
  <Text style={{ fontSize: 16, marginVertical: 5 }}>{item.description}</Text>
  <Text style={{ fontSize: 14, color: 'red', marginBottom: 5 }}>Poll has ended</Text>

  {item.options?.map((option, index) => {
    const optionVotes = option.votes || 0;
    const percentage = totalVotes > 0 ? ((optionVotes / totalVotes) * 100).toFixed(2) : 0;

    return (
      <View key={index} style={{ marginTop: 10 }}>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: colors.LIGHTBLUE }]} />
              <View style={styles.progressTextContainer}>
                <Text style={styles.progressOption}>{option.text}</Text>
                <Text style={styles.progressPercentage}>{percentage}%</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  })}
</View>
  );
}

const styles = StyleSheet.create({
  progressBarContainer: {
    height: 45,
    borderRadius: 13,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: 'gray'
    
  },
  progressBar: {
    height: '100%',
    borderRadius: 13,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 10, 
    position: 'absolute',
    width: '100%',
  },
  progressPercentage: {
    fontWeight: 'bold',
    color: colors.DARK,
  },
  progressOption: {
    fontWeight: 'bold',
    color: colors.DARK,
  },
  reactionsContainer: { flexDirection: 'row', gap: 12, marginTop: 10 },
reactionText: { fontSize: 14, color: colors.DARK },
commentText: { fontSize: 14, color: colors.BLUE },

});

