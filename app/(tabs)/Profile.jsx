import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
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

export default function Profile() {
  const router = useRouter();
  const user = auth.currentUser;

  const [username, setUsername] = useState("");
  const [editedUsername, setEditedUsername] = useState(""); // TEMPORARY username during edit

  const [password, setPassword] = useState("");

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
    if (!editedUsername.trim() || !password.trim()) {
      return Alert.alert("Error", "Both fields are required.");
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      await updateDoc(doc(db, "users", user.uid), { username: editedUsername });
      setUsername(editedUsername); // Only update displayed username after successful update

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
    <View style={styles.container}>
      <View style={{ width: "100%", alignItems: "flex-end" }}>
        <Image
          style={{
            width: 45,
            height: 45,
            margin: 20,
            marginBottom: 0,
            borderRadius: 5,
          }}
          source={require("./../../assets/images/logo3.jpg")}
        />
      </View>
      <View style={{ paddingHorizontal: 25 }}>
        <Text style={styles.header}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileSection}>
          <TouchableOpacity
            onPress={handleImagePick}
            style={styles.imageContainer}
          >
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profilePlaceholderText}>+</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.username}>{username}</Text>
          <Text style={{ textAlign: "center" }}>{email}</Text>
          <View style={{ padding: 25, width: 410, marginTop: 20 }}>
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
                  onPress={() => {
                    setEditedUsername(username); // <-- initialize edit copy
                    setEditMode("username");
                  }}
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
                  value={editedUsername}
                  onChangeText={setEditedUsername}
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
                  onPress={() => {
                    setEditMode(null);
                    setEditedUsername("");
                    setPassword("");
                  }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.LIGHT,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  scrollContainer: {
    alignItems: "center",
  },
  profileSection: {
    alignItems: "center",
    marginVertical: 20,
    width: "100%",
  },
  imageContainer: {
    marginBottom: 15,
    alignItems: "center",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  profilePlaceholderText: {
    fontSize: 40,
    color: "white",
  },
  username: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    marginBottom: 10,
  },
  footer: {
    padding: 25,
    backgroundColor: colors.DARK,
    borderTopLeftRadius: 25,
    alignItems: "center",
  },
  button: {
    width: "100%",
    padding: 15,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 5,
    marginTop: 10,
  },
  logoutButton: {
    backgroundColor: colors.DARK,
  },
  cancelButton: {
    backgroundColor: "gray",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
