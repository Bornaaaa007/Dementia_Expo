import { Button, colors } from "@/components/ui";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

interface Props {
  onCapture: (dataUri: string) => void | Promise<void>;
  label?: string;
  busy?: boolean;
}

export function FaceCapture({ onCapture, label = "Take photo", busy = false }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [shooting, setShooting] = useState(false);

  if (!permission) {
    return <ActivityIndicator color={colors.maroon} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>Camera access is needed to check it's really you.</Text>
        <Button title="Allow camera" onPress={requestPermission} />
      </View>
    );
  }

  const snap = async () => {
    if (!camera.current || shooting || busy) return;
    setShooting(true);
    try {
      const photo = await camera.current.takePictureAsync({ base64: true, quality: 0.5 });
      if (photo?.base64) await onCapture(`data:image/jpeg;base64,${photo.base64}`);
    } finally {
      setShooting(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.cameraBox}>
        <CameraView ref={camera} facing="front" style={StyleSheet.absoluteFill} />
        <View style={styles.guide} pointerEvents="none" />
      </View>
      <Text style={styles.hint}>Look at the camera in good light</Text>
      <Button title={label} onPress={snap} loading={shooting || busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "stretch", gap: 12 },
  center: { alignItems: "stretch", gap: 12, padding: 12 },
  msg: { fontSize: 15, color: colors.muted, textAlign: "center" },
  cameraBox: {
    height: 340,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  guide: {
    width: 200,
    height: 260,
    borderRadius: 130,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.85)",
  },
  hint: { fontSize: 14, color: colors.muted, textAlign: "center" },
});