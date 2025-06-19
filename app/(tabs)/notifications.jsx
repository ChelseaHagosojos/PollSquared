import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import colors from "../../constant/colors";
import { useRouter } from "expo-router";
import { AntDesign } from "@expo/vector-icons";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("recipientId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedNotifications = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        // ❌ Skip 'pollEnded' if user is not the poll creator
        if (data.type === "pollEnded" && data.pollOwnerId !== user.uid) return;

        fetchedNotifications.push({ id: doc.id, ...data });
      });

      // 🔽 Sort notifications by timestamp (newest first)
      fetchedNotifications.sort((a, b) => b.timestamp - a.timestamp);
      setNotifications(fetchedNotifications);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = notifications.map((notification) =>
        updateDoc(doc(db, "notifications", notification.id), {
          read: true,
        })
      );
      await Promise.all(batch);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "reaction":
        return "like1";
      case "comment":
        return "message1";
      case "vote":
        return "checkcircleo";
      case "pollEnded":
        return "clockcircleo";
      default:
        return "infocirlceo";
    }
  };

  const getNotificationMessage = (notification) => {
    switch (notification.type) {
      case "reaction":
        return `${notification.senderName} ${notification.reactionType === "like" ? "liked" : "disliked"} your poll "${notification.pollTitle}"`;
      case "comment":
        return `${notification.senderName} commented on your poll "${notification.pollTitle}": "${notification.commentText}"`;
      case "vote":
        return `${notification.senderName} voted on your poll "${notification.pollTitle}"`;
      case "pollEnded":
        return `Poll "${notification.pollTitle}" has ended. Final results are available.`;
      default:
        return "New notification";
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleNotificationPress = (notification) => {
  markAsRead(notification.id);
  if (notification.pollId) {
    router.push(`/pages/PollDetail?id=${notification.pollId}`);
  }
};


  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.DARK} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AntDesign name="bells" size={50} color={colors.GRAY} />
          <Text style={styles.emptyText}>No new notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.notificationItem,
                !item.read && styles.unreadNotification,
              ]}
              onPress={() => handleNotificationPress(item)}
            >
              <View style={styles.notificationIcon}>
                <AntDesign
                  name={getNotificationIcon(item.type)}
                  size={24}
                  color={colors.DARK}
                />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationText}>
                  {getNotificationMessage(item)}
                </Text>
                <Text style={styles.notificationTime}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
              {!item.read && <View style={styles.unreadIndicator} />}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.LIGHT,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.LIGHTGRAY,
    elevation: 2,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.DARK,
  },
  markAllText: {
    color: colors.BLUE,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 10,
    color: colors.GRAY,
    fontSize: 16,
    textAlign: "center",
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 6,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: "#e8f0fe", // light blue background
  },
  notificationIcon: {
    marginRight: 15,
    justifyContent: "center",
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: colors.DARK,
    fontWeight: "500",
    marginBottom: 3,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.GRAY,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.BLUE,
    marginLeft: 10,
  },
});
