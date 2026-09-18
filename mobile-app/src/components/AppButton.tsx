import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';
export const AppButton = ({ title, onPress }: any) => { const t = useAppTheme(); const outline = t.components.button.variant === 'outline'; const soft = t.components.button.variant === 'soft'; return <Pressable onPress={onPress} style={[styles.button, { height:t.components.button.height, borderRadius:t.radius.button, backgroundColor:outline?'transparent':soft?`${t.colors.primary}20`:t.colors.primary, borderColor:t.colors.primary, borderWidth:outline?1:0 }]}><Text style={{ color:outline||soft?t.colors.primary:t.colors.onPrimary, fontWeight:'700' }}>{title}</Text></Pressable>; };
const styles=StyleSheet.create({button:{alignItems:'center',justifyContent:'center'}});
