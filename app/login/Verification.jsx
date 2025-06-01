import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import colors from '../../constant/colors';

export default function Verification() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Verify Your Email</Text>
            <Text style={styles.message}>
                A verification email has been sent to your email address. Please check your inbox and verify your account before signing in.
            </Text>
            <TouchableOpacity 
                style={styles.button} 
                onPress={() => router.push('/login/signin')}
            >
                <Text style={styles.buttonText}>Go to Login</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.LIGHT
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.DARK,
        marginBottom: 15,
        textAlign: 'center'
    },
    message: {
        fontSize: 16,
        color: colors.DARK,
        textAlign: 'center',
        marginBottom: 20
    },
    button: {
        padding: 15,
        backgroundColor: colors.BLUE,
        borderRadius: 99,
        marginTop: 20,
        width: '80%',
        alignItems: 'center'
    },
    buttonText: {
        color: colors.LIGHT,
        fontWeight: 'bold'
    }
});
