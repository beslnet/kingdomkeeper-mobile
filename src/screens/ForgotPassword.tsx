import React, { useState } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, Dimensions, Text, Alert } from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { PANTONE_134C, PANTONE_295C } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ForgotPasswordScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    // Debes implementar el endpoint real para recuperar contraseña en tu backend
    const handleSend = async () => {
        if (!email || !email.includes('@')) {
            setError('Ingresa un correo válido');
            return;
        }
        setError('');
        setSubmitted(true);
        try {
            // TODO: llamar a tu endpoint de recuperación de contraseña con fetch/axios
            // Por ejemplo:
            // await fetch(`${API_BASE_URL}/api/send-reset-password/`, { method: 'POST', ... })

            Alert.alert('Listo', 'Si el correo existe, recibirás pronto las instrucciones para restablecer tu contraseña.');
            setTimeout(() => {
                setSubmitted(false);
                navigation.goBack();
            }, 2000);
        } catch (e) {
            setSubmitted(false);
            Alert.alert('Error', e.message || 'No se pudo enviar el correo');
        }
    };

    return (
        <KeyboardAvoidingView style={styles.outerContainer} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.formContainer}>
                <Text style={styles.title}>Recuperar contraseña</Text>
                <Text style={styles.desc}>
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </Text>
                <TextInput
                    label="Correo electrónico"
                    value={email}
                    onChangeText={setEmail}
                    mode="outlined"
                    placeholder="ejemplo@email.com"
                    left={<TextInput.Icon icon="email-outline" color={PANTONE_295C} />}
                    error={!!error}
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
                    activeOutlineColor={error ? "#D32F2F" : PANTONE_295C}
                    style={styles.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    dense
                />
                {!!error && (
                    <View style={styles.helperContainer}>
                        <HelperText type="error" visible={!!error}>
                            {error}
                        </HelperText>
                    </View>
                )}

                <Button
                    mode="contained"
                    onPress={handleSend}
                    style={styles.button}
                    labelStyle={styles.buttonLabel}
                    contentStyle={{ height: 52 }}
                    loading={submitted}
                    disabled={submitted}
                >
                    Enviar instrucciones
                </Button>
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
    formContainer: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 28,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowOffset: { width: 0, height: 6 },
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            }
        }),
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: PANTONE_295C,
        marginBottom: 6,
        textAlign: 'center',
    },
    desc: {
        color: '#3d3d3d',
        fontSize: 15,
        marginBottom: 18,
        textAlign: 'center',
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
        marginTop: 10,
        elevation: 0,
    },
    buttonLabel: {
        color: PANTONE_295C,
        fontWeight: 'bold',
        fontSize: 17,
        letterSpacing: 1.5,
    },
});