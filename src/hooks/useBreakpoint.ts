import { useWindowDimensions } from 'react-native';

export function useBreakpoint() {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1100;
  const isDesktop = width >= 1100;
  return { width, height, isMobile, isTablet, isDesktop, isCompact: width < 900 };
}
