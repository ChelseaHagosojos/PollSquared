import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Image,
  TextInput,
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
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase/firebaseConfig';
import colors from '../../constant/colors';
import { AntDesign } from '@expo/vector-icons';

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const pollDoc = await getDoc(doc(db, 'polls', id));
        if (pollDoc.exists()) {
          setPoll({ id: pollDoc.id, ...pollDoc.data() });
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
    if (!newComment.trim() || !user || !id) return;

    const commentsRef = collection(db, 'polls', id, 'comments');

    try {
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
      alert('Could not post comment.');
    }
  };

  const editComment = (comment) => {
    setNewComment(comment.text);
    setEditingCommentId(comment.id);
  };

  const deleteComment = async (commentId) => {
    if (!id || !commentId) return;

    try {
      await deleteDoc(doc(db, 'polls', id, 'comments', commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Could not delete comment.');
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString();
  };

  const winningVoteCount = Math.max(...(poll?.options || []).map((o) => o.votes || 0));

  const computeEndedAt = (createdAt, duration) => {
    if (!createdAt || !duration) return null;
    const date = new Date(createdAt.seconds * 1000);
    const { unit, value } = duration;
    const durationValue = parseInt(value, 10);
    if (isNaN(durationValue)) return null;

    switch (unit) {
      case 'days':
        date.setDate(date.getDate() + durationValue);
        break;
      case 'hours':
        date.setHours(date.getHours() + durationValue);
        break;
      case 'minutes':
        date.setMinutes(date.getMinutes() + durationValue);
        break;
      default:
        return null;
    }

    return date.toLocaleString();
  };

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color={colors.BLUE}
        style={{ marginTop: 50 }}
      />
    );
  }

  if (!poll) {
    return (
      <Text style={{ textAlign: 'center', fontSize: 16, color: colors.GRAY }}>
        Poll not found.
      </Text>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.LIGHT,
        padding: 20,
        paddingHorizontal: 30,
      }}
    >
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}
      >
        <AntDesign name="arrowleft" size={24} color={colors.DARK} />
        <Text style={{ fontSize: 16, marginLeft: 5, color: colors.DARK }}>
          Back
        </Text>
      </TouchableOpacity>

      {/* Poll Title */}
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 5 }}>
        {poll.title}
      </Text>
      {poll.description && (
        <Text
          style={{ fontSize: 16, color: colors.GRAY_DARK, marginBottom: 10 }}
        >
          {poll.description}
        </Text>
      )}
      <Text style={{ fontSize: 14, color: colors.GRAY }}>
        Created: {formatTime(poll.createdAt?.seconds * 1000)}
      </Text>
      <Text style={{ fontSize: 14, color: colors.GRAY, marginBottom: 15 }}>
        {poll.status === 'inactive' || poll.status === 'ended'
          ? `Ended: ${computeEndedAt(poll.createdAt, poll.duration) || 'Unknown'}`
          : 'Ongoing'}
      </Text>

      {/* Poll Results */}
      <FlatList
        data={poll.options}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => {
          const percentage =
            poll.totalVotes > 0 ? (item.votes / poll.totalVotes) * 100 : 0;
          const isWinning = item.votes === winningVoteCount;
          const barColor = isWinning ? colors.BLUE : colors.LIGHTBLUE;

          return (
            <View style={{ marginBottom: 8 }}>
              <View
                style={{
                  backgroundColor: 'white',
                  borderRadius: 10,
                  overflow: 'hidden',
                  marginVertical: 5,
                  position: 'relative',
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: barColor,
                    position: 'absolute',
                    height: '100%',
                    borderRadius: 10,
                  }}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    padding: 15,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: colors.DARK,
                    }}
                  >
                    {item.text}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: colors.DARK,
                    }}
                  >
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Likes / Dislikes */}
      <View
        style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}
      >
        <Text style={{ fontSize: 14, color: colors.GRAY, marginRight: 15 }}>
          👍 {poll.likes?.length || 0}
        </Text>
        <Text style={{ fontSize: 14, color: colors.GRAY }}>
          👎 {poll.dislikes?.length || 0}
        </Text>
      </View>

      {/* Show Comments */}
      <TouchableOpacity
        onPress={() => setShowComments(true)}
        style={{
          marginTop: 20,
          backgroundColor: colors.LIGHTBLUE,
          padding: 12,
          borderRadius: 10,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.DARK, fontWeight: 'bold' }}>
          Show Comments ({comments.length})
        </Text>
      </TouchableOpacity>

      {/* Comments Modal */}
      <Modal visible={showComments} animationType="slide" transparent={false}>
        <View style={{ flex: 1, padding: 20, backgroundColor: 'white' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Comments
          </Text>

          <FlatList
            data={comments.slice(0, commentPage * COMMENTS_PER_PAGE)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={{
                  backgroundColor: '#f2f2f2',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                {/* Profile Pic */}
                <Image
                  source={
                    item.profilePic
                      ? { uri: item.profilePic }
                      : require('../../assets/images/default.png')
                  }
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
                {/* Comment Body */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontWeight: 'bold',
                      fontSize: 14,
                      color: colors.DARK,
                    }}
                  >
                    {item.username}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.GRAY }}>
                    {formatTime(item.timestamp?.toDate?.() || new Date())}
                  </Text>
                  <Text style={{ fontSize: 14, marginTop: 5 }}>{item.text}</Text>

                  {item.userId === user?.uid && (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        marginTop: 10,
                        gap: 12,
                      }}
                    >
                      <TouchableOpacity onPress={() => editComment(item)}>
                        <Text
                          style={{ color: colors.BLUE, fontWeight: '600' }}
                        >
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteComment(item.id)}>
                        <Text style={{ color: 'red', fontWeight: '600' }}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
          />

          {/* Load More Button */}
          {comments.length > commentPage * COMMENTS_PER_PAGE && (
            <TouchableOpacity
              onPress={() => setCommentPage((prev) => prev + 1)}
              style={{
                padding: 12,
                backgroundColor: colors.DARK,
                borderRadius: 10,
                alignItems: 'center',
                marginTop: 10,
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Load More
              </Text>
            </TouchableOpacity>
          )}

          {/* Comment Input */}
          <View
            style={{
              marginTop: 20,
              borderTopWidth: 1,
              borderColor: '#ddd',
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
                backgroundColor: '#fff',
                minHeight: 50,
                textAlignVertical: 'top',
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
                  color: '#fff',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                {editingCommentId ? 'Update Comment' : 'Post Comment'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={() => {
              setShowComments(false);
              setNewComment('');
              setEditingCommentId(null);
              setCommentPage(1);
            }}
            style={{ alignItems: 'center', marginTop: 20 }}
          >
            <Text style={{ color: 'red', fontWeight: 'bold' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Total Votes */}
      <Text
        style={{
          textAlign: 'center',
          fontSize: 14,
          color: colors.GRAY,
          marginTop: 10,
        }}
      >
        {poll.totalVotes} votes
      </Text>
    </View>
  );
}