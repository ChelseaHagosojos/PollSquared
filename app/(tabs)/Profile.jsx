import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { auth, db } from "../../firebase/firebaseConfig";
import {
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import colors from "../../constant/colors";

const { width, height } = Dimensions.get("window");

export default function Profile() {
  const router = useRouter();
  const user = auth.currentUser;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(""); // For username update security

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [profilePic, setProfilePic] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState(null); // 'username' or 'password'

  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const { username, profilePic } = userDoc.data();
        setUsername(username || "");
        setProfilePic(profilePic || null);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load user data.");
    }
  };

  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return Alert.alert(
        "Permission Required",
        "Allow access to upload a profile picture."
      );
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
    setProfilePic(base64Image);

    try {
      await updateDoc(doc(db, "users", user.uid), { profilePic: base64Image });
      Alert.alert("Success", "Profile picture updated!");
    } catch (error) {
      Alert.alert("Error", "Failed to update profile picture.");
    }
  };

  const handleUpdateUsername = async () => {
    if (!username.trim() || !password.trim()) {
      return Alert.alert("Error", "Both fields are required.");
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      await updateDoc(doc(db, "users", user.uid), { username });

      Alert.alert("Success", "Username updated successfully!");
      setEditMode(null);
    } catch (error) {
      Alert.alert("Update Failed", error.message);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return Alert.alert("Error", "All fields are required.");
    }

    if (newPassword !== confirmNewPassword) {
      return Alert.alert("Error", "New passwords do not match.");
    }

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);

      Alert.alert("Success", "Password updated successfully!");
      setEditMode(null);
    } catch (error) {
      Alert.alert("Update Failed", error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Logged Out", "You have been logged out successfully.");
      router.replace("/login");
    } catch (error) {
      Alert.alert("Logout Failed", error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Image
            style={styles.logo}
            source={require("./../../assets/images/logo3.jpg")}
          />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.header}>Profile</Text>

          <View style={styles.profileSection}>
            <TouchableOpacity
              onPress={handleImagePick}
              style={styles.imageContainer}
            >
              {profilePic ? (
                <Image
                  source={{ uri: profilePic }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profilePlaceholderText}>+</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.username}>{username}</Text>
            <Text style={styles.email}>{email}</Text>

            <TouchableOpacity
              style={[styles.button, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isEditing ? (
          <>
            {!editMode && (
              <>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => setEditMode("username")}
                >
                  <Text style={styles.buttonText}>Update Username</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => setEditMode("password")}
                >
                  <Text style={styles.buttonText}>Update Password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {editMode === "username" && (
              <>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter new username"
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleUpdateUsername}
                >
                  <Text style={styles.buttonText}>Save Username</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setEditMode(null)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {editMode === "password" && (
              <>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder="Confirm new password"
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleUpdatePassword}
                >
                  <Text style={styles.buttonText}>Save Password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setEditMode(null)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => setIsEditing(true)}
          >
            <Text style={styles.buttonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.LIGHT,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  headerContainer: {
    width: "100%",
    alignItems: "flex-end",
    paddingTop: height * 0.02,
    paddingRight: width * 0.05,
  },
  logo: {
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: 5,
  },
  contentContainer: {
    paddingHorizontal: width * 0.06,
    paddingBottom: height * 0.02,
  },
  header: {
    fontSize: width * 0.08,
    fontWeight: "bold",
    marginBottom: height * 0.02,
  },
  profileSection: {
    alignItems: "center",
    marginVertical: height * 0.02,
    width: "100%",
  },
  imageContainer: {
    marginBottom: height * 0.02,
    alignItems: "center",
  },
  profileImage: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
  },
  profilePlaceholder: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  profilePlaceholderText: {
    fontSize: width * 0.15,
    color: "white",
  },
  username: {
    fontSize: width * 0.06,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: height * 0.01,
  },
  email: {
    fontSize: width * 0.04,
    textAlign: "center",
    color: "#666",
    marginTop: height * 0.005,
  },
  input: {
    width: "100%",
    padding: width * 0.04,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    marginBottom: height * 0.01,
    fontSize: width * 0.04,
  },
  footer: {
    padding: width * 0.05,
    backgroundColor: colors.DARK,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    alignItems: "center",
  },
  button: {
    width: "100%",
    padding: width * 0.04,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: height * 0.01,
    marginTop: height * 0.01,
  },
  logoutButton: {
    backgroundColor: colors.DARK,
    marginTop: height * 0.03,
    width: "80%",
    alignSelf: "center",
  },
  cancelButton: {
    backgroundColor: "gray",
  },
  buttonText: {
    color: "white",
    fontSize: width * 0.04,
    fontWeight: "bold",
  },
});
