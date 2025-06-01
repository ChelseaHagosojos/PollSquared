import { 
    View, 
    Text, 
    TextInput, 
    StyleSheet, 
    TouchableOpacity, 
    Alert, 
    Image, 
    KeyboardAvoidingView, 
    ScrollView, 
    Platform,
    Dimensions,
    SafeAreaView,
    Modal
} from 'react-native';
import React, { useState } from 'react';
import colors from '../../constant/colors';
import { useRouter } from 'expo-router';
import { auth } from '../../firebase/firebaseConfig';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function SignIn() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({
        email: '',
        password: ''
    });
    const [modalVisible, setModalVisible] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetEmailError, setResetEmailError] = useState('');

    const validateForm = () => {
        let valid = true;
        const newErrors = {
            email: '',
            password: ''
        };

        if (!email) {
            newErrors.email = 'Email is required';
            valid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email is invalid';
            valid = false;
        }

        if (!password) {
            newErrors.password = 'Password is required';
            valid = false;
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (!user.emailVerified) {
                Alert.alert(
                    'Verification Required',
                    'Please verify your email before signing in.',
                    [{ text: 'OK' }]
                );
                return;
            }

            router.replace('(tabs)');
        } catch (error) {
            let errorMessage = error.message;
            if (error.code === 'auth/invalid-email') {
                setErrors(prev => ({...prev, email: 'Invalid email format'}));
            } else if (error.code === 'auth/user-not-found') {
                setErrors(prev => ({...prev, email: 'No account found with this email'}));
            } else if (error.code === 'auth/wrong-password') {
                setErrors(prev => ({...prev, password: 'Incorrect password'}));
            } else {
                Alert.alert('Login Failed', errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const validateResetEmail = () => {
        if (!resetEmail) {
            setResetEmailError('Email is required');
            return false;
        } else if (!/\S+@\S+\.\S+/.test(resetEmail)) {
            setResetEmailError('Email is invalid');
            return false;
        }
        setResetEmailError('');
        return true;
    };

    const handleForgotPassword = async () => {
        if (!validateResetEmail()) return;

        try {
            await sendPasswordResetEmail(auth, resetEmail);
            Alert.alert('Success', 'Password reset email sent! Check your inbox.');
            setModalVisible(false);
            setResetEmail('');
            setResetEmailError('');
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                setResetEmailError('No account found with this email');
            } else {
                Alert.alert('Reset Failed', error.message);
            }
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.DARK }}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.topContainer}>
                        <View style={styles.logoContainer}>
                            <Image
                                style={styles.logo}
                                source={require('./../../assets/images/logo3.jpg')}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={styles.headerContainer}>
                            <Text style={styles.welcomeText}>WELCOME BACK!</Text>
                            <Text style={styles.textHeader}>SIGN IN</Text>
                        </View>
                        <View style={styles.inputContainer}>
                            <View>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter your email"
                                    placeholderTextColor="#999"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        setErrors(prev => ({...prev, email: ''}));
                                    }}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    textContentType="emailAddress"
                                />
                                {errors.email ? (
                                    <Text style={styles.errorText}>{errors.email}</Text>
                                ) : null}
                            </View>
                            
                            <View style={{ marginTop: 15 }}>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={[styles.textInput, { flex: 1 }]}
                                        secureTextEntry={!showPassword}
                                        placeholder="Enter your password"
                                        placeholderTextColor="#999"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            setErrors(prev => ({...prev, password: ''}));
                                        }}
                                        textContentType="password"
                                    />
                                    <TouchableOpacity 
                                        style={styles.eyeIcon}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons 
                                            name={showPassword ? 'eye-off' : 'eye'} 
                                            size={20} 
                                            color="#999" 
                                        />
                                    </TouchableOpacity>
                                </View>
                                {errors.password ? (
                                    <Text style={styles.errorText}>{errors.password}</Text>
                                ) : null}
                            </View>
                        </View>
                        <TouchableOpacity 
                            style={styles.forgotPasswordContainer}
                            onPress={() => setModalVisible(true)}
                        >
                            <Text style={styles.forgotPasswordText}>
                                Forgot Password?
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.bottomContainer}>
                        <View style={styles.bottomInnerContainer}>
                            <TouchableOpacity 
                                style={[styles.buttonPrimary, isLoading && styles.buttonDisabled]} 
                                onPress={handleLogin}
                                disabled={isLoading}
                            >
                                <Text style={styles.buttonText}>
                                    {isLoading ? 'Signing In...' : 'Sign In'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
                
                {/* Fixed footer at the bottom */}
                <View style={styles.footerContainer}>
                    <Text style={styles.registerText}>
                        Don't have an account yet?
                        <Text 
                            onPress={() => router.push('login/register')} 
                            style={styles.registerLink}
                        >
                            {' '}Register Now
                        </Text>
                    </Text>
                </View>
            </KeyboardAvoidingView>

            {/* Modal for Forgot Password */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(false);
                    setResetEmail('');
                    setResetEmailError('');
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Reset Password</Text>
                        <Text style={styles.modalSubtitle}>Enter your email to receive a password reset link</Text>
                        
                        <View style={styles.modalInputContainer}>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Enter your email"
                                placeholderTextColor="#999"
                                value={resetEmail}
                                onChangeText={(text) => {
                                    setResetEmail(text);
                                    if (resetEmailError) setResetEmailError('');
                                }}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                textContentType="emailAddress"
                            />
                            {resetEmailError ? (
                                <Text style={styles.modalErrorText}>{resetEmailError}</Text>
                            ) : null}
                        </View>
                        
                        <View style={styles.modalButtonContainer}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalButtonPrimary]}
                                onPress={handleForgotPassword}
                            >
                                <Text style={styles.modalButtonText}>Send Reset Link</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.modalButtonSecondary]}
                                onPress={() => {
                                    setModalVisible(false);
                                    setResetEmail('');
                                    setResetEmailError('');
                                }}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.BLUE }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 60,
    },
    topContainer: {
        width: '100%',
        minHeight: height * 0.6,
        backgroundColor: colors.LIGHT,
        borderBottomRightRadius: 50,
        paddingBottom: 20,
    },
    logoContainer: {
        width: '100%',
        alignItems: 'flex-end',
        paddingTop: Platform.OS === 'android' ? 25 : 0,
    },
    logo: {
        width: 45,
        height: 45,
        margin: 25,
        borderRadius: 5,
    },
    headerContainer: {
        paddingHorizontal: 25,
        paddingVertical: 15,
        marginTop: 10,
    },
    welcomeText: {
        fontSize: isSmallDevice ? 16 : 20,
        color: colors.DARK,
        fontWeight: '500',
    },
    textHeader: {
        fontSize: isSmallDevice ? 28 : 35,
        fontWeight: 'bold',
        color: colors.DARK,
        marginTop: 5,
    },
    inputContainer: {
        marginTop: 20,
    },
    textInput: {
        height: 50,
        padding: 15,
        marginHorizontal: 25,
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: 'white',
        borderRadius: 99,
        fontSize: isSmallDevice ? 14 : 16,
        color: colors.DARK,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eyeIcon: {
        position: 'absolute',
        right: 40,
        padding: 10,
    },
    errorText: {
        color: 'red',
        marginHorizontal: 30,
        marginTop: 5,
        fontSize: 12,
    },
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        paddingHorizontal: 30,
        paddingVertical: 10,
    },
    forgotPasswordText: {
        color: colors.BLUE,
        fontSize: isSmallDevice ? 14 : 16,
    },
    bottomContainer: {
        flex: 1,
        backgroundColor: colors.LIGHT,
    },
    bottomInnerContainer: {
        flex: 1,
        backgroundColor: colors.DARK,
        borderTopLeftRadius: 50,
        justifyContent: 'flex-start',
        paddingTop: 40,
    },
    buttonPrimary: {
        padding: 15,
        backgroundColor: colors.BLUE,
        borderRadius: 99,
        marginHorizontal: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        textAlign: 'center',
        color: colors.LIGHT,
        fontSize: isSmallDevice ? 16 : 18,
        fontWeight: '600',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.DARK,
        paddingVertical: 20,
    },
    registerText: {
        textAlign: 'center',
        color: '#aaa',
        fontSize: isSmallDevice ? 14 : 16,
    },
    registerLink: {
        color: colors.BLUE,
        fontWeight: '600',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 25,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 5,
        color: colors.DARK,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalInputContainer: {
        width: '100%',
        marginBottom: 15,
    },
    modalInput: {
        height: 50,
        width: '100%',
        padding: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        fontSize: 16,
    },
    modalErrorText: {
        color: 'red',
        fontSize: 12,
        marginTop: 5,
        marginLeft: 5,
    },
    modalButtonContainer: {
        width: '100%',
        marginTop: 10,
    },
    modalButton: {
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
    },
    modalButtonPrimary: {
        backgroundColor: colors.BLUE,
    },
    modalButtonSecondary: {
        backgroundColor: 'transparent',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});