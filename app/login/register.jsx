import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Image, Modal, ScrollView, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import colors from '../../constant/colors';
import { useRouter } from 'expo-router';
import { registerUser } from '../../firebase/auth';
import CheckBox from 'expo-checkbox'; // Import CheckBox component
import { Ionicons } from '@expo/vector-icons'; // Import Ionicons

export default function Register() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agreeToTerms, setAgreeToTerms] = useState(false); // New state for checkbox
    const [passwordError, setPasswordError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [modalVisible, setModalVisible] = useState(false); // State for modal visibility
    const [loading, setLoading] = useState(false); // Loading state

    const handleRegister = async () => {
        if (!username || !email || !password || !confirmPassword) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert("Error", "Passwords do not match");
            return;
        }

        if (!agreeToTerms) {
            Alert.alert("Error", "You must agree to the Terms and Conditions");
            return;
        }

        setLoading(true); // Start loading

        try {
            const user = await registerUser(email, password, username);
            Alert.alert(
                "Success",
                "Account created successfully! A verification email has been sent."
            );
            router.push('/login/Verification'); // Navigate to Verification screen
        } catch (error) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false); // Stop loading
        }
    };

    const handleConfirmPasswordChange = (text) => {
        setConfirmPassword(text);
        setPasswordError(text !== password ? "Passwords do not match" : "");
    };

    const validateInputs = () => username && email && password && confirmPassword && password === confirmPassword && agreeToTerms;

    return (
        <View style={styles.container}>
            <View style={{
                backgroundColor: colors.LIGHT,
                width: '100%',
                height: '30%'
            }}>
                <View style={{
                    backgroundColor: colors.BLUE,
                    width: '100%',
                    height: '100%',
                    borderBottomLeftRadius: 50
                }}>
                    <View
                        style={{
                            width: '100%',
                            alignItems: 'flex-end'
                        }}
                    >
                        <Image
                            style={{
                                width: 45,
                                height: 45,
                                margin: 25,
                                borderRadius: 5
                            }}
                            source={require('./../../assets/images/logo3.jpg')} />
                    </View>
                    <View style={{
                        padding: 25,
                        marginTop: 30
                    }}>
                        <Text style={styles.textheader}>REGISTER YOUR ACCOUNT</Text>
                    </View>
                </View>
            </View>
            <View style={{
                backgroundColor: colors.BLUE,
                width: '100%',
                height: '70%'
            }}>
                <View style={{
                    backgroundColor: colors.LIGHT,
                    width: '100%',
                    height: '100%',
                    borderTopRightRadius: 50,
                    paddingTop: 30
                }}>
                    <View>
                        <TextInput
                            style={styles.textinput}
                            placeholder="Enter your username"
                            value={username}
                            onChangeText={setUsername}
                        />
                    </View>
                    <View>
                        <TextInput
                            style={styles.textinput}
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none" />
                    </View>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.textinput}
                            secureTextEntry={!showPassword}
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="gray" />
                        </TouchableOpacity>
                    </View>
                    <View>
                        <TextInput
                            style={[styles.textinput, passwordError ? styles.inputError : null]}
                            secureTextEntry
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChangeText={handleConfirmPasswordChange}
                        />
                        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                    </View>

                    {/* Terms and Conditions Checkbox */}
                    <View style={styles.checkboxContainer}>
                        <CheckBox
                            value={agreeToTerms}
                            onValueChange={setAgreeToTerms}
                            color={agreeToTerms ? colors.DARK : undefined}
                        />
                        <TouchableOpacity onPress={() => setModalVisible(true)}>
                            <Text style={styles.checkboxLabel}>
                                I agree to the <Text style={styles.link}>Terms and Conditions</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalContainer}>
                            <View style={styles.modalContent}>
                                <ScrollView style={styles.scrollView}>
                                    <Text style={styles.modalHeader}>Terms and Conditions</Text>
                                    <Text style={styles.modalText}>
                                        Last Updated: March 9, 2025{"\n\n"}
                                        
                                        Please read these terms and conditions carefully before using our Application.{"\n\n"}

                                        Summary{"\n"}
                                        As PollSquared User, remember:{"\n"}
                                        - Use PollSquared responsibly.{"\n"}
                                        - PollSquared is designed to enhance your feedback-gathering experience.{"\n"}
                                        - These Terms and Conditions will update regularly.{"\n"}
                                        - Read the PollSquared Terms and Conditions carefully.{"\n\n"}

                                        These Terms and Conditions stand as an agreement between “We” or “Us” (the creators) 
                                        and “You” (the user), regarding your use of PollSquared. These Terms and Conditions take effect 
                                        from the date you first created an account with us.{"\n\n"}

                                        These Terms and Conditions are divided into several sections:{"\n"}
                                        - The PollSquared App{"\n"}
                                        - User Accounts and Responsibilities{"\n"}
                                        - General Terms and Conditions{"\n"}
                                        - Getting Support and Further Information{"\n\n"}

                                        <Text style={styles.sectionHeader}>The PollSquared App</Text>{"\n"}
                                        PollSquared is a mobile application available exclusively for Android users via the Google Play Store. 
                                        The app enables users to create polls, vote on polls, and share polls with others to gather 
                                        feedback and engage in discussions. By using PollSquared, users agree to participate in the 
                                        feedback-gathering process, which aims to streamline decision-making and promote interaction.{"\n\n"}
                                        
                                        PollSquared is provided as a non-commercial, personal-use service and is not operated as a business. 
                                        The creators do not assume responsibility for any commercial use or business-related applications 
                                        of the app.{"\n\n"}

                                        <Text style={styles.sectionHeader}>User Accounts and Responsibilities</Text>{"\n"}
                                        To access certain features of the PollSquared app, users must create an account by providing accurate 
                                        and complete information. You are responsible for maintaining the confidentiality of your account 
                                        credentials, including your username and password. We will not be liable for any loss or damage 
                                        resulting from unauthorized use of your account. You agree to immediately notify us of any 
                                        unauthorized use or security breach of your account.{"\n\n"}

                                        As a user of PollSquared, you are responsible for all activities conducted under your account. You agree 
                                        to use PollSquared only for lawful purposes and in accordance with these Terms. You are prohibited from 
                                        engaging in any activities that may harm the app, violate others' rights, or involve illegal actions.{"\n\n"}

                                        We expect that you are aware of the consent you have given under these Terms and Conditions.{"\n\n"}

                                        You shall not:{"\n"}
                                        - Create or share content that is unlawful, defamatory, or infringes upon intellectual rights.{"\n"}
                                        - Manipulate or interfere with the integrity of any polls, votes, or data.{"\n"}
                                        - Engage in any form of unauthorized access, including attempting to gain access to other users’ accounts or private data.{"\n\n"}

                                        We reserve the right to suspend or terminate your account if we determine that you have violated 
                                        these Terms and Conditions or engaged in any prohibited activities. Upon termination, your access 
                                        to the app may be revoked, and you may not be able to recover any data associated with your account.{"\n\n"}

                                        <Text style={styles.sectionHeader}>General Terms and Conditions</Text>{"\n"}

                                        <Text style={styles.subSectionHeader}>Data Privacy</Text>{"\n"}
                                        Per the Data Privacy Act and related regulations, you have the right, as a Data Subject, to amend, 
                                        update, revise, or delete certain parts of your personal data that you have provided to us.{"\n\n"}

                                        When necessary and appropriate, we shall aggregate and anonymize data prior to sharing to protect 
                                        your privacy. Some features of PollSquared rely on third-party content, such as Google Sign-In 
                                        (https://policies.google.com/privacy).{"\n\n"}

                                        <Text style={styles.subSectionHeader}>Intellectual Property Rights</Text>{"\n"}
                                        PollSquared and all of its contents, including but not limited to text, graphics, logos, images, software, 
                                        and trademarks, are the property of the creators or their licensors and are protected by intellectual 
                                        property laws. You agree not to reproduce, distribute, modify, or create derivative works from any 
                                        of the content without prior written permission from the creators.{"\n\n"}

                                        You shall not infringe on the intellectual property rights of PollSquared or any third party. This includes 
                                        using the app or its content in ways that violate copyright, trademark, or other intellectual property 
                                        laws. Any unauthorized use may result in the termination of your account and legal action.{"\n\n"}

                                        PollSquared’s name and logo are trademarks of the creators and may not be used, reproduced, or displayed 
                                        without express written permission. All other trademarks, logos, and service marks used in the app 
                                        are the property of their respective owners.{"\n\n"}

                                        These Terms and Conditions shall be governed by and construed in accordance with the laws of the 
                                        Republic of the Philippines.{"\n\n"}

                                        <Text style={styles.sectionHeader}>Support and Inquiries</Text>{"\n"}
                                        For any questions, concerns, or further information regarding these Terms and Conditions, please 
                                        reach out to us at: pollsquared.se2@gmail.com. We are committed to providing support and addressing 
                                        any inquiries you may have in a timely manner.{"\n"}
                                    </Text>
                                </ScrollView>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.closeButtonText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                    <View>
                        <TouchableOpacity
                            style={[styles.buttonprimary, { opacity: validateInputs() ? 1 : 0.5 }]}
                            onPress={handleRegister}
                            disabled={!validateInputs() || loading} // Disable during loading
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.LIGHT} /> // Show loading indicator
                            ) : (
                                <Text style={{ textAlign: 'center', color: colors.LIGHT }}>Register</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                    <View>
                        <Text style={{ textAlign: 'center', marginTop: 75 }}>
                            Already have an account?
                            <Text onPress={() => router.push('login/signin')} style={styles.signinText}>
                                {' '}Sign In
                            </Text>
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.LIGHT
    },
    textheader: {
        fontSize: 30,
        fontWeight: 'bold',
        color: colors.LIGHT
    },
    textinput: {
        padding: 15,
        marginHorizontal: 25,
        borderWidth: 1,
        borderColor: 'gray',
        backgroundColor: 'white',
        borderRadius: 99,
        marginBottom: 15,
    },
    buttonprimary: {
        padding: 15,
        backgroundColor: colors.DARK,
        borderRadius: 99,
        marginTop: 50,
        marginBottom: 15,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 25,
        elevation: 3,
        marginHorizontal: 25,
    },
    signinText: {
        color: colors.BLUE,
        textDecorationLine: 'underline',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 25,
        marginTop: 10,
    },
    checkboxLabel: {
        marginLeft: 10,
        fontSize: 14,
        color: 'black',
    },
    link: {
        color: colors.BLUE,
        textDecorationLine: 'underline',
    },
    inputError: {
        borderColor: 'red',
    },
    errorText: {
        color: 'red',
        marginLeft: 25,
        marginBottom: 10,
    },
    eyeIcon: {
        position: 'absolute',
        right: 45,
        top: '50%',
        transform: [{ translateY: -18 }],
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent background
    },
    modalContent: {
        width: '90%',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        elevation: 5,
    },
    modalHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalText: {
        fontSize: 14,
        marginBottom: 20,
    },
    closeButton: {
        backgroundColor: colors.BLUE,
        padding: 10,
        borderRadius: 5,
        marginTop: 10,
        alignSelf: 'flex-end',
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    scrollView: {
        maxHeight: "90%",  // Adjust height as needed
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 15,
        marginBottom: 5,
        color: "#333", // Darker text for better readability
    },
    subSectionHeader: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 10,
        marginBottom: 3,
        color: "#555", // Slightly lighter than sectionHeader for hierarchy
    },
});