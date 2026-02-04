import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to generate signed URLs for private storage buckets.
 * URLs expire after the specified duration and automatically refresh.
 */
export function useSignedUrl(
  bucket: string,
  path: string | null | undefined,
  expiresIn: number = 3600 // 1 hour default
) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setSignedUrl(null);
      return;
    }

    // Extract just the file path if it's a full URL
    let filePath = path;
    if (path.includes("/storage/v1/object/")) {
      const parts = path.split(`/storage/v1/object/public/${bucket}/`);
      if (parts[1]) {
        filePath = parts[1];
      } else {
        // Try signed URL format
        const signedParts = path.split(`/storage/v1/object/sign/${bucket}/`);
        if (signedParts[1]) {
          filePath = signedParts[1].split("?")[0];
        }
      }
    }

    const fetchSignedUrl = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (signError) {
        setError(signError.message);
        setSignedUrl(null);
      } else {
        setSignedUrl(data.signedUrl);
      }

      setIsLoading(false);
    };

    fetchSignedUrl();

    // Refresh URL before it expires (at 80% of expiry time)
    const refreshInterval = setInterval(fetchSignedUrl, expiresIn * 800);

    return () => clearInterval(refreshInterval);
  }, [bucket, path, expiresIn]);

  return { signedUrl, isLoading, error };
}
