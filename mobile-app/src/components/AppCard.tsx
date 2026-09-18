import React from 'react';
import { View } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';
export const AppCard = ({ children, style }: any) => { const t=useAppTheme(); const bordered=t.components.card.variant==='bordered'; const elevated=t.components.card.variant==='elevated'; return <View style={[{backgroundColor:t.colors.surface,borderRadius:t.radius.card,padding:t.spacing.sm,borderWidth:bordered?1:0,borderColor:t.colors.border,elevation:elevated?3:0,shadowColor:'#10203a',shadowOpacity:elevated?.12:0,shadowRadius:elevated?8:0,shadowOffset:{width:0,height:3}},style]}>{children}</View>; };
