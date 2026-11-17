import React from 'react';
import { FontAwesomeIcon as RawFontAwesomeIcon } from '@fortawesome/react-native-fontawesome';

// FontAwesome rebuilds the SVG tree from the icon definition on every render, which is costly when a big
// screen (e.g. the game HUD) re-renders. Icon props are stable (icon object, size, colour), so memoise it.
export const FontAwesomeIcon = React.memo(RawFontAwesomeIcon);
export default FontAwesomeIcon;
