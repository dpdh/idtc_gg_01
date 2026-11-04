import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { spacing } from '../theme';

export default function ResponsiveContent({ children, style, maxWidth = 1180 }) {
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 380 ? spacing.md : width < 768 ? spacing.xl : spacing.xxl;

  return (
    <View
      style={[
        {
          width: '100%',
          maxWidth,
          alignSelf: 'center',
          paddingHorizontal: horizontalPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
