import { View, Text, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import colors from '../../constant/colors';
import { AntDesign } from '@expo/vector-icons'; // Back Button Icon
import { Modal, TextInput, ScrollView } from 'react-native';

export default function PollDetail() {
  const { id } = useLocalSearchParams(); // Get poll ID from URL
  const router = useRouter();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
const [showComments, setShowComments] = useState(false);
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

  if (loading) {
    return <ActivityIndicator size="large" color={colors.BLUE} style={{ marginTop: 50 }} />;
  }

  if (!poll) {
    return <Text style={{ textAlign: 'center', fontSize: 16, color: colors.GRAY }}>Poll not found.</Text>;
  }

  // Determine the winning option (max votes)
  const winningVoteCount = Math.max(...poll.options.map(option => option.votes));


  // Format timestamps
  const formatDate = timestamp => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000); // Convert Firestore timestamp to Date
    return date.toLocaleString(); // Convert to readable format
  };
  const computeEndedAt = (createdAt, duration) => {
    if (!createdAt || !duration) return null; // Ensure both values exist
  
    const date = new Date(createdAt.seconds * 1000); // Convert Firestore timestamp to Date
    const { unit, value } = duration;
    const durationValue = parseInt(value, 10); // Convert value to number
  
    if (isNaN(durationValue)) return null; // Invalid duration value
  
    switch (unit) {
      case "days":
        date.setDate(date.getDate() + durationValue);
        break;
      case "hours":
        date.setHours(date.getHours() + durationValue);
        break;
      case "minutes":
        date.setMinutes(date.getMinutes() + durationValue);
        break;
      default:
        return null; // Unknown unit
    }
  
    return date.toLocaleString(); // Return formatted date
  };
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.LIGHT, padding: 20, paddingHorizontal: 30 }}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
        <AntDesign name="arrowleft" size={24} color={colors.DARK} />
        <Text style={{ fontSize: 16, marginLeft: 5, color: colors.DARK }}>Back</Text>
      </TouchableOpacity>

      {/* Poll Title */}
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 5 }}>{poll.title}</Text>
      
      {/* Poll Description */}
      {poll.description && (
        <Text style={{ fontSize: 16, color: colors.GRAY_DARK, marginBottom: 10 }}>{poll.description}</Text>
      )}

      {/* Date and Time Info */}
      <Text style={{ fontSize: 14, color: colors.GRAY }}>
        Created: {formatDate(poll.createdAt)}
      </Text>
      <Text style={{ fontSize: 14, color: colors.GRAY, marginBottom: 15 }}>
        {poll.status === "inactive" || poll.status === "ended"
          ? `Ended: ${computeEndedAt(poll.createdAt, poll.duration) || "Unknown"}`
          : "Ongoing"}
      </Text>



      {/* Poll Results UI (Matching Homepage) */}
      <FlatList
        data={poll.options}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => {
          const percentage = poll.totalVotes > 0 ? (item.votes / poll.totalVotes) * 100 : 0;
          const isWinningOption = item.votes === winningVoteCount;
          const barColor = isWinningOption ? colors.BLUE : colors.LIGHTBLUE; 
          return (
            <View style={{ marginBottom: 8 }}>
              {/* Poll Option with Progress Bar */}
              <View
                style={{
                  backgroundColor: 'white',
                  borderRadius: 10,
                  overflow: 'hidden',
                  marginVertical: 5,
                  position: 'relative',
                  elevation: 3,
                  shadowColor: 'gray'
                }}
              >
                {/* Progress Bar */}
                <View
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: barColor,
                    position: 'absolute',
                    height: '100%',
                    borderRadius: 10,
                  }}
                />
                
                {/* Option Text and Percentage */}
                <View style={{ flexDirection: 'row', padding: 15, justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.DARK }}>{item.text}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.DARK }}>{percentage.toFixed(1)}%</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
{/* Poll Likes/Dislikes */}  
<View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
  <Text style={{ fontSize: 14, color: colors.GRAY, marginRight: 15 }}>
    👍 {poll.likes?.length || 0}
  </Text>
  <Text style={{ fontSize: 14, color: colors.GRAY }}>
    👎 {poll.dislikes?.length || 0}
  </Text>
</View>
<TouchableOpacity
  onPress={() => setShowComments(true)}
  style={{
    marginTop: 20,
    backgroundColor: colors.LIGHTBLUE,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center'
  }}
>
  <Text style={{ color: colors.DARK, fontWeight: 'bold' }}>
    Show Comments ({poll.comments?.length || 0})
  </Text>
</TouchableOpacity>
<Modal visible={showComments} animationType="slide" transparent={false}>
  <View style={{ flex: 1, padding: 20, backgroundColor: 'white' }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
      Comments
    </Text>

    <ScrollView style={{ flex: 1 }}>
      {poll.comments && poll.comments.length > 0 ? (
        poll.comments.map((item, index) => (
          <View
            key={index}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              backgroundColor: '#f2f2f2',
              borderRadius: 10,
              padding: 10,
              marginBottom: 10
            }}
          >
            <Image
              source={{ uri: item.avatar || 'https://placehold.co/40x40' }}
              style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{item.username}</Text>
              <Text style={{ fontSize: 12, color: 'gray' }}>{formatDate(item.timestamp)}</Text>
              <Text style={{ fontSize: 14, marginTop: 5 }}>{item.text}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={{ color: colors.GRAY }}>No comments yet.</Text>
      )}
    </ScrollView>

    {/* Comment Input */}
    <TextInput
      placeholder="Write a comment..."
      style={{
        borderWidth: 1,
        borderColor: colors.GRAY,
        borderRadius: 10,
        padding: 10,
        marginTop: 10
      }}
    />

    <TouchableOpacity
      style={{
        backgroundColor: colors.DARK,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10
      }}
    >
      <Text style={{ color: 'white', fontWeight: 'bold' }}>Type something...</Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={() => setShowComments(false)}
      style={{ alignItems: 'center', marginTop: 20 }}
    >
      <Text style={{ color: 'red', fontWeight: 'bold' }}>Close</Text>
    </TouchableOpacity>
  </View>
</Modal>

{/* Comments List */}
{showComments && (
  <View style={{ marginTop: 15 }}>
    {poll.comments && poll.comments.length > 0 ? (
      <FlatList
        data={poll.comments}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 10, padding: 10, backgroundColor: colors.LIGHT, borderRadius: 10 }}>
            <Text style={{ fontWeight: 'bold', color: colors.DARK }}>{item.username}</Text>
            <Text style={{ color: colors.GRAY }}>{item.text}</Text>
          </View>
        )}
      />
    ) : (
      <Text style={{ color: colors.GRAY }}>No comments yet.</Text>
    )}
  </View>
)}

      {/* Total Votes */}
      <Text style={{ textAlign: 'center', fontSize: 14, color: colors.GRAY, marginTop: 10 }}>
        {poll.totalVotes} votes
      </Text>
    </View>
  );
}
