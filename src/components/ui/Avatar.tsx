import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/tokens';
import { initials } from '@/utils/format';

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
}

export function Avatar({ name, color = colors.primary, size = 40 }: AvatarProps) {
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2.5,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.34 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
});
