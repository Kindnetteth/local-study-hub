import JSZip from 'jszip';
import { Bundle, Flashcard, getBundles, getFlashcards, saveBundle, saveFlashcard } from './storage';

export interface ExportData {
  bundles: Bundle[];
  flashcards: Flashcard[];
}

/**
 * Export bundles with flashcards and images to a ZIP file
 */
export async function exportBundles(bundleIds: string[]): Promise<Blob> {
  const zip = new JSZip();
  const bundles = getBundles().filter(b => bundleIds.includes(b.id));
  const flashcards = getFlashcards().filter(f => bundleIds.includes(f.bundleId));

  // Remove progress data and prepare for export
  const exportBundles = bundles.map(b => {
    const { ownerId, originPeerId, verified, ...rest } = b;
    return rest;
  });

  // Create bundle.json
  const exportData: ExportData = {
    bundles: exportBundles,
    flashcards,
  };
  
  zip.file('bundle.json', JSON.stringify(exportData, null, 2));

  // Extract and save all images
  const images = new Set<string>();
  
  // Bundle thumbnails
  bundles.forEach(b => {
    if (b.thumbnail && b.thumbnail.startsWith('data:image')) {
      images.add(b.thumbnail);
    }
  });
  
  // Flashcard images
  flashcards.forEach(f => {
    if (f.questionImage && f.questionImage.startsWith('data:image')) {
      images.add(f.questionImage);
    }
    if (f.answerImage && f.answerImage.startsWith('data:image')) {
      images.add(f.answerImage);
    }
    f.hints?.forEach(h => {
      if (h.image && h.image.startsWith('data:image')) {
        images.add(h.image);
      }
    });
  });

  // Add images to zip
  const imageFolder = zip.folder('images');
  if (imageFolder) {
    let imageIndex = 0;
    const imageMap = new Map<string, string>();
    
    for (const imageData of images) {
      const ext = imageData.match(/data:image\/(\w+);/)?.[1] || 'png';
      const filename = `image_${imageIndex}.${ext}`;
      const base64Data = imageData.split(',')[1];
      
      imageFolder.file(filename, base64Data, { base64: true });
      imageMap.set(imageData, `images/${filename}`);
      imageIndex++;
    }

    // Update references in export data to use relative paths
    exportData.bundles.forEach(b => {
      if (b.thumbnail && imageMap.has(b.thumbnail)) {
        b.thumbnail = imageMap.get(b.thumbnail);
      }
    });
    
    exportData.flashcards.forEach(f => {
      if (f.questionImage && imageMap.has(f.questionImage)) {
        f.questionImage = imageMap.get(f.questionImage);
      }
      if (f.answerImage && imageMap.has(f.answerImage)) {
        f.answerImage = imageMap.get(f.answerImage);
      }
      f.hints?.forEach(h => {
        if (h.image && imageMap.has(h.image)) {
          h.image = imageMap.get(h.image);
        }
      });
    });

    // Update bundle.json with new references
    zip.file('bundle.json', JSON.stringify(exportData, null, 2));
  }

  return zip.generateAsync({ type: 'blob' });
}

export type ImportConflictResolution = 'replace' | 'keep-both' | 'skip';

export interface ImportOptions {
  userId: string;
  onConflict?: (bundle: Bundle) => Promise<ImportConflictResolution>;
}

/**
 * Import bundles from ZIP file
 */
export async function importBundles(
  zipFile: File,
  options: ImportOptions
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const result = { imported: 0, skipped: 0, errors: [] as string[] };

  try {
    let exportData: ExportData;
    let imageMap = new Map<string, string>();

    // Check if it's a JSON file or ZIP file
    if (zipFile.name.endsWith('.json')) {
      // Direct JSON import
      const jsonContent = await zipFile.text();
      exportData = JSON.parse(jsonContent);
    } else {
      // ZIP import
      const zip = await JSZip.loadAsync(zipFile);
      const bundleJsonFile = zip.file('bundle.json');
      
      if (!bundleJsonFile) {
        result.errors.push('Invalid bundle file: missing bundle.json');
        return result;
      }

      const bundleJsonContent = await bundleJsonFile.async('text');
      exportData = JSON.parse(bundleJsonContent);

      // Load images from zip and convert to data URLs
      const imagesFolder = zip.folder('images');
      
      if (imagesFolder) {
        const imagePromises: Promise<void>[] = [];
        
        zip.forEach((relativePath, file) => {
          if (relativePath.startsWith('images/') && !file.dir) {
            imagePromises.push(
              file.async('base64').then(base64Data => {
                const ext = relativePath.split('.').pop()?.toLowerCase() || 'png';
                const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
                imageMap.set(relativePath, `data:${mimeType};base64,${base64Data}`);
              })
            );
          }
        });
        
        await Promise.all(imagePromises);
      }
    }

    // Convert image paths back to data URLs
    const convertImagePaths = (obj: any) => {
      if (obj.thumbnail && imageMap.has(obj.thumbnail)) {
        obj.thumbnail = imageMap.get(obj.thumbnail);
      }
      if (obj.questionImage && imageMap.has(obj.questionImage)) {
        obj.questionImage = imageMap.get(obj.questionImage);
      }
      if (obj.answerImage && imageMap.has(obj.answerImage)) {
        obj.answerImage = imageMap.get(obj.answerImage);
      }
      if (obj.hints) {
        obj.hints.forEach((h: any) => {
          if (h.image && imageMap.has(h.image)) {
            h.image = imageMap.get(h.image);
          }
        });
      }
    };

    const existingBundles = getBundles();

    // Process each bundle
    for (const importBundle of exportData.bundles) {
      convertImagePaths(importBundle);
      
      // Check for conflicts
      const existingBundle = existingBundles.find(
        b => b.id === importBundle.id || b.title === importBundle.title
      );

      let resolution: ImportConflictResolution = 'keep-both';
      
      if (existingBundle) {
        // Check if this is a peer bundle
        if (existingBundle.originPeerId || existingBundle.ownerId) {
          // Peer bundle - always keep both with auto-rename
          resolution = 'keep-both';
        } else if (options.onConflict) {
          resolution = await options.onConflict(importBundle);
        }
      }

      if (resolution === 'skip') {
        result.skipped++;
        continue;
      }

      const now = new Date().toISOString();
      let finalBundle = { ...importBundle };

      if (resolution === 'keep-both' && existingBundle) {
        // Generate unique ID and title
        finalBundle.id = `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let newTitle = importBundle.title;
        let counter = 2;
        while (existingBundles.some(b => b.title === newTitle)) {
          newTitle = `${importBundle.title} (${counter})`;
          counter++;
        }
        finalBundle.title = newTitle;
      }

      // Set ownership to importing user
      finalBundle.userId = options.userId;
      finalBundle.updatedAt = now;
      if (!finalBundle.createdAt) {
        finalBundle.createdAt = now;
      }

      // Save bundle
      saveBundle(finalBundle as Bundle);

      // Import associated flashcards
      const bundleFlashcards = exportData.flashcards.filter(
        f => f.bundleId === importBundle.id
      );

      for (const flashcard of bundleFlashcards) {
        convertImagePaths(flashcard);
        
        const newFlashcard = {
          ...flashcard,
          id: resolution === 'keep-both' ? `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : flashcard.id,
          bundleId: finalBundle.id,
          updatedAt: now,
          createdAt: flashcard.createdAt || now,
        };

        saveFlashcard(newFlashcard as Flashcard);
      }

      result.imported++;
    }

    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Unknown error occurred');
    return result;
  }
}

/**
 * Download ZIP file
 */
export function downloadZip(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
