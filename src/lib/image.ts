import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { notify } from "./notify";

// Keep in sync with LIMITS.photoChars in the backend (lib/memoryInput.js)
const MAX_PHOTO_CHARS = 1_200_000;

// Lets the user choose a photo, shrinks it to ~640px JPEG (about 50-150 KB) and returns a data URL.
// Returns null if the user cancelled or something was wrong (the user is told why).
export async function pickPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    notify("Permission needed", "Allow photo access to add a picture.");
    return null;
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (picked.canceled) return null;

  try {
    const context = ImageManipulator.manipulate(picked.assets[0].uri);
    context.resize({ width: 640 });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
    if (!saved.base64) throw new Error("no image data");

    const dataUrl = `data:image/jpeg;base64,${saved.base64}`;
    if (dataUrl.length > MAX_PHOTO_CHARS) {
      notify("Photo is too large", "Please choose a smaller or simpler photo.");
      return null;
    }
    return dataUrl;
  } catch {
    notify("Couldn't use that photo", "Please try a different picture.");
    return null;
  }
}