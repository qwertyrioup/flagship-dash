import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export async function zipAndCleanFolders(
  folders: string[],
  outputPath: string,
  onProgress: (message: string) => void
): Promise<void> {
  try {
    // Create a write stream for the zip file
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Listen for all archive data to be written
    output.on('close', () => {
      onProgress(`Archive created successfully: ${archive.pointer()} total bytes`);
    });

    // Handle warnings
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        onProgress(`Warning: ${err.message}`);
      } else {
        throw err;
      }
    });

    // Handle errors
    archive.on('error', (err) => {
      throw err;
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add each folder to the archive
    for (const folder of folders) {
      if (fs.existsSync(folder)) {
        archive.directory(folder, path.basename(folder));
        onProgress(`Added folder to archive: ${folder}`);
      } else {
        onProgress(`Warning: Folder does not exist: ${folder}`);
      }
    }

    // Finalize the archive
    await archive.finalize();

    // Clean up the source folders
    for (const folder of folders) {
      if (fs.existsSync(folder)) {
        fs.rmSync(folder, { recursive: true, force: true });
        onProgress(`Cleaned up folder: ${folder}`);
      }
    }
  } catch (error) {
    onProgress(`Error during zip and cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
} 