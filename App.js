import React, { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

// Endereço onde a versão do app está publicada.
// Se o endereço mudar, troque aqui.
const APP_URL = 'https://steady-rugelach-c106c0.netlify.app/';

export default function App() {
  const [carregando, setCarregando] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <WebView
        source={{ uri: APP_URL }}
        style={styles.webview}
        onLoadEnd={() => setCarregando(false)}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        allowsBackForwardNavigationGestures={false}
        bounces={false}
        setSupportMultipleWindows={false}
      />
      {carregando && (
        <View style={styles.carregando} pointerEvents="none">
          <ActivityIndicator size="large" color="#5EE7F5" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2A3470' },
  webview: { flex: 1, backgroundColor: '#2A3470' },
  carregando: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A3470',
  },
});
