// Utility functions for handling images in offline mode

export const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const handleImageUpload = async (
  event: React.ChangeEvent<HTMLInputElement>
): Promise<string | null> => {
  const file = event.target.files?.[0];
  if (!file) return null;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }

  // Validate file size (max 5MB for localStorage limits)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be less than 5MB');
  }

  return await convertImageToBase64(file);
};
