import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase/firebaseConfig";
import colors from "../../constant/colors";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

export default function AddNew() {
  const router = useRouter();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingPollId, setDeletingPollId] = useState(null);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
          collection(db, "polls"),
          where("createdBy", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);

        const userPolls = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPolls(userPolls);
      } catch (error) {
        console.error("Error fetching polls:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  const deletePoll = async (pollId) => {
    try {
      console.log("Starting deletion of:", pollId);
      setDeletingPollId(pollId);
      await deleteDoc(doc(db, "polls", pollId));
      setPolls((prevPolls) => prevPolls.filter((poll) => poll.id !== pollId));
      console.log("Successfully deleted:", pollId);
    } catch (error) {
      console.error("Error deleting poll:", error);
    } finally {
      setDeletingPollId(null);
      console.log("Cleared deletion state for:", pollId);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            style={styles.logo}
            source={require("./../../assets/images/logo3.jpg")}
          />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>My Polls</Text>
        </View>
      </View>

      <View style={styles.contentWrapper}>
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.BLUE} />
          ) : polls.length === 0 ? (
            <Text style={styles.noPollsText}>No polls created yet.</Text>
          ) : (
            <FlatList
              data={polls}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => router.push(`/pages/PollDetail?id=${item.id}`)}
                  style={styles.pollCard}
                >
                  <View style={styles.pollInfo}>
                    <Text style={styles.pollTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.voteCount}>
                      {item.totalVotes} Votes
                    </Text>
                  </View>

                  <View style={styles.pollActions}>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            item.status === "active" ? colors.BLUE : "gray",
                        },
                      ]}
                    >
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>

                    <View style={styles.menuContainer}>
                      <Menu>
                        <MenuTrigger>
                          <MaterialIcons
                            name="more-vert"
                            size={24}
                            color="black"
                          />
                        </MenuTrigger>
                        <MenuOptions customStyles={styles.menuOptions}>
                          <MenuOption
                            onSelect={() => deletePoll(item.id)}
                            disabled={deletingPollId === item.id}
                          >
                            <View style={styles.deleteOption}>
                              <MaterialIcons
                                name="delete"
                                size={18}
                                color="red"
                              />
                              <Text style={styles.deleteText}>Delete</Text>
                            </View>
                          </MenuOption>
                        </MenuOptions>
                      </Menu>

                      {/* Fixed positioning indicator */}
                      {deletingPollId === item.id && (
                        <View style={styles.deletingIndicator}>
                          <ActivityIndicator size="small" color={colors.RED} />
                          <Text style={styles.deletingText}>Deleting...</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.push("pages/Create")}
        style={styles.addButton}
      >
        <MaterialIcons name="add" size={30} color={colors.LIGHT} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.LIGHT,
  },
  header: {
    backgroundColor: colors.BLUE,
    borderBottomLeftRadius: 25,
  },
  logoContainer: {
    width: "100%",
    alignItems: "flex-end",
  },
  logo: {
    width: 45,
    height: 45,
    margin: 20,
    marginBottom: 0,
    borderRadius: 5,
  },
  titleContainer: {
    padding: 25,
    paddingTop: 8,
  },
  titleText: {
    fontSize: 25,
    fontWeight: "bold",
    color: colors.LIGHT,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: colors.BLUE,
  },
  content: {
    backgroundColor: colors.LIGHT,
    padding: 30,
    borderTopRightRadius: 25,
    height: "100%",
  },
  noPollsText: {
    textAlign: "center",
    fontSize: 16,
    color: "gray",
    marginTop: 20,
  },
  listContent: {
    paddingBottom: 100,
  },
  pollCard: {
    backgroundColor: "white",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: "gray",
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pollInfo: {
    flex: 1,
    marginRight: 10,
  },
  pollTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  voteCount: {
    color: "gray",
  },
  pollActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginRight: 10,
    minWidth: 70,
  },
  statusText: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
  },
  menuContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  menuOptions: {
    optionsContainer: {
      borderRadius: 10,
      padding: 5,
    },
  },
  deleteOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  deleteText: {
    color: "red",
    marginLeft: 8,
  },
  deletingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 12,
    shadowColor: colors.RED,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  deletingText: {
    color: colors.RED,
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    fontStyle: "italic",
  },

  deletingText: {
    color: colors.RED,
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "500",
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: colors.DARK,
    width: 75,
    height: 75,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 99,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 5,
    borderColor: colors.LIGHT,
  },
});
