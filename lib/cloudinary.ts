/**
 * Cloudinary upload utility for client-side file uploads
 * Handles document uploads for internship verification, profiles, and other assets
 */

/**
 * Upload a file to Cloudinary
 * @param file - File object to upload
 * @param folder - Cloudinary folder path (e.g., "internship-documents", "profile-photos")
 * @param resourceType - Type of resource: "auto", "image", "video", "raw"
 * @returns Promise resolving to Cloudinary secure URL
 */
export async function uploadToCloudinary(
  file: File,
  folder: string,
  resourceType: "auto" | "image" | "video" | "raw" = "auto"
): Promise<string> {
  try {
    // Validate file
    if (!file) {
      throw new Error("No file provided")
    }

    // Max file size: 100MB
    const MAX_FILE_SIZE = 100 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size must be less than 100MB. Received: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
    }

    // Create FormData for Cloudinary upload
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", "business_preset") // Ensure this preset exists in Cloudinary
    formData.append("folder", folder)
    formData.append("resource_type", resourceType)

    // Upload to Cloudinary using unsigned upload
    // Using cloud_name from next.config or environment
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dfibtkimu"

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`)
    }

    const data = await response.json()

    // Return secure HTTPS URL
    return data.secure_url
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    throw error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Upload multiple files to Cloudinary in parallel
 * @param files - Array of File objects
 * @param folder - Cloudinary folder path
 * @param resourceType - Type of resource to upload
 * @returns Promise resolving to array of Cloudinary URLs
 */
export async function uploadMultipleToCloudinary(
  files: (File | null)[],
  folder: string,
  resourceType: "auto" | "image" | "video" | "raw" = "auto"
): Promise<(string | null)[]> {
  try {
    const uploadPromises = files.map((file) =>
      file ? uploadToCloudinary(file, folder, resourceType) : Promise.resolve(null)
    )

    return await Promise.all(uploadPromises)
  } catch (error) {
    console.error("Multiple file upload error:", error)
    throw error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Delete a file from Cloudinary
 * Note: Requires authenticated access with API secret
 * This should be done server-side for security
 * @param publicId - Cloudinary public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  // Note: Client-side deletion requires API secret, which should not be exposed
  // Instead, create a backend endpoint that handles deletion securely
  console.warn("Use backend endpoint for secure file deletion")
  throw new Error("File deletion must be done server-side")
}
