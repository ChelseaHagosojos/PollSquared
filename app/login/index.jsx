import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Image } from 'react-native';
import React from 'react';
import colors from '../../constant/colors';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {/* Top Section with Background Image */}
            <View style={styles.topContainer}>
                <View style={styles.imageWrapper}>
                    <ImageBackground
                        source={require('./../../assets/images/5.png')}
                        style={styles.background}
                    />
                </View>
            </View>

            {/* Centered Logo */}
            <Image 
                source={require('./../../assets/images/logo3.jpg')} // Adjust path as needed
                style={styles.logo}
                resizeMode="contain"
            />

            {/* Bottom Section */}
            <View style={styles.bottomContainer}>
                <View style={styles.innerBottom}>

                    <View style={{
                        marginTop: 280
                    }}>
                        <TouchableOpacity style={styles?.buttonprimary}
                            onPress={()=>router.push('login/signin')}
                        >
                            <Text style={{
                                textAlign: 'center',
                                color: colors.LIGHT
                            }}
                            >Signin</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles?.button}
                            onPress={()=>router.push('login/register')}
                        >
                            <Text style={{
                                textAlign: 'center'
                            }}
                            >Register</Text>
                        </TouchableOpacity>
                    </View>
                    <View
                        style={{
                            alignItems: 'center',
                            marginTop: 60
                        }}
                    >
                        <Text
                        style={{
                            color: 'gray'
                            
                        }}
                        >BETA RELEASE</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topContainer: {
        backgroundColor: colors.DARK,
        width: '100%',
        height: '30%',
    },
    imageWrapper: {
        backgroundColor: colors.LIGHT,
        width: '100%',
        height: '100%',
        borderBottomRightRadius: 99,
        overflow: 'hidden',
    },
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    logo: {
        width: 70, 
        height: 70,
        position: 'absolute', 
        top: '50%',
        alignSelf: 'center',
        transform: [{ translateY: -200 }], 
        zIndex: 1,    
        elevation: 10,  
        borderRadius: 10
    },
    
    bottomContainer: {
        backgroundColor: colors.BLUE,
        width: '100%',
        height: '70%',
    },
    innerBottom: {
        backgroundColor: colors.DARK,
        width: '100%',
        height: '100%',
        borderTopLeftRadius: 99,
        padding: 30
    },
    button: {
        padding: 15,
        backgroundColor: colors.LIGHT,
        borderRadius:  99,
        marginTop: 20,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 25,
        elevation: 3,
    },
    buttonprimary: {
        padding: 15,
        backgroundColor: colors.BLUE,
        borderRadius:  99,
        marginTop: 20,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 25,
        elevation: 3,
    }
});

