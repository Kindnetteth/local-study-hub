/**
 * Converts an uploaded image file to a Base64 data URL for offline storage
 * @param file The image file to convert
 * @returns Promise that resolves to the Base64 data URL string
 */
export const handleImageUpload = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Validates if a file is an image
 * @param file The file to validate
 * @returns boolean indicating if the file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Handles image upload from an input element and calls a callback with the Base64 result
 * @param event The input change event
 * @param callback Function to call with the Base64 data URL
 */
export const handleImageInputChange = async (
  event: React.ChangeEvent<HTMLInputElement>,
  callback: (dataUrl: string) => void
) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  if (!isImageFile(file)) {
    throw new Error('Please select an image file');
  }
  
  try {
    const dataUrl = await handleImageUpload(file);
    callback(dataUrl);
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};
