import { DefaultTheme } from 'react-native-paper';
import colors from './colors';

const paperTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        accent: colors.accent,
        background: colors.background,
        surface: colors.surface,
        text: colors.text,
        placeholder: colors.placeholder,
    },
    roundness: 8,
};

export default paperTheme;
