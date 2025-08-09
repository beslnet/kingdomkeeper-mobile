import * as React from 'react';
import { StyleSheet, Platform, Dimensions, Linking, Alert, View, KeyboardAvoidingView, Image, TouchableOpacity } from 'react-native';
import { TextInput, Button, HelperText, Text } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation'; // Ajusta la ruta si es necesario
import { PANTONE_134C, PANTONE_295C } from '../theme/colors';
import { TERMS_URL, PRIVACY_URL } from '../constants/urls';
import { login } from '../utils/auth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LOGO_SIZE = Math.round(SCREEN_WIDTH * 0.45);

export default function LoginScreen() {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [usernameError, setUsernameError] = React.useState('');
    const [passwordError, setPasswordError] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [usernameTouched, setUsernameTouched] = React.useState(false);
    const [passwordTouched, setPasswordTouched] = React.useState(false);
    const [submitAttempted, setSubmitAttempted] = React.useState(false);

    const validate = () => {
        let valid = true;
        if (!username || username.trim().length === 0) {
            setUsernameError('Ingresa tu nombre de usuario');
            valid = false;
        } else {
            setUsernameError('');
        }
        if (!password || password.length < 3) {
            setPasswordError('La contraseña debe tener al menos 3 caracteres');
            valid = false;
        } else {
            setPasswordError('');
        }
        return valid;
    };

    const handleLogin = async () => {
        setSubmitAttempted(true);
        setUsernameTouched(true);
        setPasswordTouched(true);
        if (!validate()) return;
        setLoading(true);
        try {
            await login(username, password);
            setLoading(false);
            navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
            });
        } catch (error) {
            setLoading(false);
            const errorMessage = (error instanceof Error && error.message) ? error.message : 'Error al iniciar sesión';
            Alert.alert('Error', errorMessage);
        }
    };

    const showUsernameError = (usernameTouched || submitAttempted) && !!usernameError;
    const showPasswordError = (passwordTouched || submitAttempted) && !!passwordError;

    const openWhatsApp = () => {
        const phoneNumber = '56912345678'; // Cambia por tu número real
        const message = 'Hola, necesito ayuda con Kingdom Keeper';
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        Linking.openURL(url);
    };

    const openTerms = () => {
        Linking.openURL(TERMS_URL);
    };
    const openPrivacy = () => {
        Linking.openURL(PRIVACY_URL);
    };
    const goToForgotPassword = () => {
        navigation.navigate('ForgotPassword');
    };

    return (
        <KeyboardAvoidingView style={styles.outerContainer} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.logoContainer}>
                <Image
                    source={require('../../assets/logo-kingdomkeeper.png')}
                    style={[styles.logo, { width: LOGO_SIZE, height: LOGO_SIZE }]}
                    resizeMode="contain"
                />
            </View>
            <View style={styles.formContainer}>
                <TextInput
                    label="Nombre de usuario"
                    value={username}
                    onChangeText={text => {
                        setUsername(text);
                        if (!usernameTouched) setUsernameTouched(true);
                    }}
                    mode="outlined"
                    placeholder="Tu usuario"
                    placeholderTextColor="#B0B0B0"
                    left={<TextInput.Icon icon="account-outline" color={PANTONE_295C} />}
                    error={showUsernameError}
                    theme={{
                        colors: {
                            primary: PANTONE_295C,
                            outline: '#D3D6DB',
                            background: '#fff',
                            text: '#222',
                            placeholder: '#7A7A7A',
                            error: '#D32F2F',
                        }
                    }}
                    outlineColor="#D3D6DB"
                    activeOutlineColor={showUsernameError ? "#D32F2F" : PANTONE_295C}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="default"
                    dense
                    onBlur={() => setUsernameTouched(true)}
                />
                {showUsernameError && (
                    <View style={styles.helperContainer}>
                        <HelperText type="error" visible={showUsernameError}>
                            {usernameError}
                        </HelperText>
                    </View>
                )}

                <TextInput
                    label="Contraseña"
                    value={password}
                    onChangeText={text => {
                        setPassword(text);
                        if (!passwordTouched) setPasswordTouched(true);
                    }}
                    secureTextEntry
                    mode="outlined"
                    placeholder="Mínimo 3 caracteres"
                    placeholderTextColor="#B0B0B0"
                    left={<TextInput.Icon icon="lock-outline" color={PANTONE_295C} />}
                    error={showPasswordError}
                    theme={{
                        colors: {
                            primary: PANTONE_295C,
                            outline: '#D3D6DB',
                            background: '#fff',
                            text: '#222',
                            placeholder: '#7A7A7A',
                            error: '#D32F2F',
                        }
                    }}
                    outlineColor="#D3D6DB"
                    activeOutlineColor={showPasswordError ? "#D32F2F" : PANTONE_295C}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    dense
                    onBlur={() => setPasswordTouched(true)}
                />
                {showPasswordError && (
                    <View style={styles.helperContainer}>
                        <HelperText type="error" visible={showPasswordError}>
                            {passwordError}
                        </HelperText>
                    </View>
                )}

                <Button
                    mode="contained"
                    onPress={handleLogin}
                    style={styles.button}
                    labelStyle={styles.buttonLabel}
                    contentStyle={{ height: 52 }}
                    loading={loading}
                >
                    Ingresar
                </Button>

                <TouchableOpacity onPress={goToForgotPassword} style={{marginTop: 24, marginBottom: 10}}>
                    <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
                </TouchableOpacity>

                <View style={styles.termsContainer}>
                    <Text style={{color: '#222', fontSize: 13, textAlign: 'center'}}>
                        Al hacer login aceptas los{' '}
                        <Text onPress={openTerms} style={styles.linkText}>Términos</Text>
                        {' '}y{' '}
                        <Text onPress={openPrivacy} style={styles.linkText}>Política de privacidad</Text>
                    </Text>
                </View>

                <TouchableOpacity onPress={openWhatsApp} style={{marginTop: 12}}>
                    <Text style={styles.whatsappText}>Soporte por WhatsApp</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    logoContainer: {
        marginBottom: 36,
        alignItems: 'center',
    },
    logo: {
        alignSelf: 'center',
        marginBottom: 8,
    },
    formContainer: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 28,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.15,
                shadowOffset: { width: 0, height: 8 },
                shadowRadius: 12,
            },
            android: {
                elevation: 5,
            }
        }),
    },
    input: {
        marginBottom: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        fontSize: 17,
    },
    helperContainer: {
        marginBottom: 8,
        marginLeft: 4,
    },
    button: {
        backgroundColor: PANTONE_134C,
        borderRadius: 25,
        marginTop: 14,
        elevation: 0,
    },
    buttonLabel: {
        color: PANTONE_295C,
        fontWeight: 'bold',
        fontSize: 17,
        letterSpacing: 1.5,
    },
    forgotText: {
        color: PANTONE_295C,
        textAlign: 'center',
        fontSize: 15,
        textDecorationLine: 'underline',
        fontWeight: '500',
    },
    termsContainer: {
        marginTop: 10,
        marginBottom: 2,
        alignItems: 'center',
    },
    linkText: {
        color: PANTONE_295C,
        textDecorationLine: 'underline',
        fontWeight: 'bold',
    },
    whatsappText: {
        color: '#25D366',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 15,
        textDecorationLine: 'underline',
    },
});