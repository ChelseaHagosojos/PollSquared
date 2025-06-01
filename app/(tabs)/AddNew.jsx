import { View, Text, Image, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebaseConfig';
import colors from '../../constant/colors';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';

export default function AddNew() {
  const router = useRouter();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(collection(db, 'polls'), where('createdBy', '==', user.uid));
        const querySnapshot = await getDocs(q);
     
        const userPolls = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setPolls(userPolls);
      } catch (error) {
        console.error('Error fetching polls:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  const deletePoll = async (pollId) => {
    try {
      await deleteDoc(doc(db, 'polls', pollId));
      setPolls((prevPolls) => prevPolls.filter((poll) => poll.id !== pollId));
    } catch (error) {
      console.error('Error deleting poll:', error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.LIGHT }}>
      <View style={{
        backgroundColor: colors.BLUE,
        borderBottomLeftRadius: 25
      }}>
            <View style={{ width: '100%', alignItems: 'flex-end' }}>
          <Image
            style={{ width: 45, height: 45, margin: 20, marginBottom: 0, borderRadius: 5 }}
            source={require('./../../assets/images/logo3.jpg')}
          />
          
        </View>
        <View style={{padding:25, paddingTop: 8}}>
          <Text style={{ fontSize: 25, fontWeight: 'bold', color: colors.LIGHT}}>My Polls</Text>
        </View>
      </View>
  {/* ✅ Add flex: 1 to enable scrolling */}
  <View style={{ flex: 1, backgroundColor: colors.BLUE }}>
      <View style={{ backgroundColor: colors.LIGHT,  padding: 30, borderTopRightRadius:25, height:'100%' }}>
            {loading ? (
            <ActivityIndicator size="large" color={colors.BLUE} />
          ) : polls.length === 0 ? (
            <Text style={{ textAlign: 'center', fontSize: 16, color: 'gray' }}>
              No polls created yet.
            </Text>
          ) : (
            <FlatList
              data={polls}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 100 }} // ✅ Prevents last item from being hidden
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => router.push(`/pages/PollDetail?id=${item.id}`)}
                  style={{
                    backgroundColor: 'white',
                    padding: 15,
                    height: 'auto',
                    marginBottom: 10,
                    borderRadius: 10,
                    shadowColor: 'gray',
                    elevation: 3,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Poll Details */}
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', width: 200, marginBottom: 10 }}>{item.title}</Text>
                    <Text style={{ color: 'gray' }}>{item.totalVotes} Votes</Text>
                  </View>

                  {/* Status Pill & Menu */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        backgroundColor: item.status === 'active' ? colors.BLUE : 'gray',
                        paddingVertical: 5,
                        paddingHorizontal: 10,
                        borderRadius: 15,
                        marginRight: 10,
                        width: 70,
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 14, textAlign: 'center' }}>{item.status}</Text>
                    </View>

                    <Menu>
                      <MenuTrigger>
                        <MaterialIcons name="more-vert" size={24} color="black" />
                      </MenuTrigger>
                      <MenuOptions style={{padding: 10}}>
                        <MenuOption onSelect={() => deletePoll(item.id)}>
                          <Text style={{ color: 'red' }}>Delete</Text>
                        </MenuOption>
                      </MenuOptions>
                    </Menu>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
      </View>
  </View>

  {/* ✅ Floating Button - Ensure it doesn't block scrolling */}
  <View style={{ position: 'absolute', bottom: 20, right: 20, pointerEvents: 'box-none' }}>

    <TouchableOpacity
      onPress={() => router.push('pages/Create')}
      style={{
        backgroundColor: colors.DARK,
        width: 75,
        height: 75,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 99,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
        borderWidth: 5,
        borderColor: colors.LIGHT
      }}
    >
      <MaterialIcons name="add" size={30} color={colors.LIGHT} />
    </TouchableOpacity>

  </View>
</View>

  );
}
