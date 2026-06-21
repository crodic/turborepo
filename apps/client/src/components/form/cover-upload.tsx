/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  useFileUpload,
  type FileWithPreview,
} from "@/hooks/use-file-upload";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@/components/radix-ui/alert";
import { Button } from "@/components/radix-ui/button";
import {
  CloudUpload,
  ImageIcon,
  TriangleAlert,
  Upload,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CoverUploadProps {
  maxSize?: number;
  accept?: string;
  className?: string;
  // Form field props - value is File for form submission
  value?: File | null;
  defaultUri?: string; // URL string for previewing existing images
  onChange?: (value: File | null) => void;
  disabled?: boolean;
  name?: string;
}

export default function CoverUpload({
  maxSize = 5 * 1024 * 1024, // 5MB default
  accept = "image/*",
  className,
  value,
  defaultUri,
  onChange,
  disabled = false,
  name,
}: CoverUploadProps) {
  // Track the preview URL - computed from value (File) or defaultUri
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Track if user has cleared the image (including default)
  const [isCleared, setIsCleared] = useState(false);

  // Create object URL when value is a File
  useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setFilePreviewUrl(url);
      setImageLoading(true);
      // Reset cleared state when a new file is uploaded
      setIsCleared(false);
      return () => {
        URL.revokeObjectURL(url);
        setFilePreviewUrl(null);
      };
    } else {
      setFilePreviewUrl(null);
    }
  }, [value]);

  // Compute the actual preview URL: prioritize file preview, then defaultUri (only if not cleared)
  const previewUrl = filePreviewUrl || (!isCleared ? defaultUri : null) || null;

  // Track pending file to call onChange in useEffect (avoid setState during render)
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Handle files added from the hook
  const handleFilesAdded = useCallback(
    (addedFiles: FileWithPreview[]) => {
      if (disabled) return;

      if (addedFiles.length > 0) {
        const fileWithPreview = addedFiles[0];
        const file = fileWithPreview.file;

        // Only accept actual File objects, not FileMetadata
        if (file instanceof File) {
          setImageLoading(true);
          setIsUploading(true);
          setUploadProgress(0);
          setUploadError(null);

          // Set pending file to trigger onChange in useEffect
          setPendingFile(file);

          // Simulate upload progress
          simulateUpload();
        }
      }
    },
    [disabled]
  );

  // Call onChange in useEffect to avoid setState during render
  useEffect(() => {
    if (pendingFile) {
      onChange?.(pendingFile);
      setPendingFile(null);
    }
  }, [pendingFile, onChange]);

  const [
    { isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles: 1,
    maxSize,
    accept,
    multiple: false,
    onFilesAdded: handleFilesAdded,
  });

  // Simulate upload progress
  const simulateUpload = () => {
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }

        // Random progress increment between 5-15%
        const increment = Math.random() * 10 + 5;
        return Math.min(prev + increment, 100);
      });
    }, 200);
  };

  const removeCoverImage = () => {
    if (disabled) return;

    setImageLoading(false);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadError(null);
    setIsCleared(true); // Mark as cleared to hide defaultUri as well
    onChange?.(null);
  };

  const retryUpload = () => {
    if (value && !disabled) {
      setUploadError(null);
      setIsUploading(true);
      setUploadProgress(0);
      simulateUpload();
    }
  };

  const handleOpenFileDialog = () => {
    if (!disabled) {
      openFileDialog();
    }
  };

  const hasImage = !!previewUrl;

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Cover Upload Area */}
      <div
        className={cn(
          "group border-border relative overflow-hidden rounded-xl border transition-all duration-200",
          disabled && "cursor-not-allowed opacity-50",
          isDragging && !disabled
            ? "border-primary bg-primary/5 border-dashed"
            : hasImage
              ? "border-border bg-background hover:border-primary/50"
              : "border-muted-foreground/25 bg-muted/30 hover:border-primary hover:bg-primary/5 border-dashed",
          disabled && "hover:border-muted-foreground/25 hover:bg-muted/30"
        )}
        onDragEnter={disabled ? undefined : handleDragEnter}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDragOver={disabled ? undefined : handleDragOver}
        onDrop={disabled ? undefined : handleDrop}
      >
        {/* Hidden file input */}
        <input {...getInputProps({ disabled, name })} className="sr-only" />

        {hasImage ? (
          <>
            {/* Cover Image Display */}
            <div className="relative aspect-21/9 w-full">
              {/* Loading placeholder */}
              {imageLoading && (
                <div className="bg-muted absolute inset-0 flex animate-pulse items-center justify-center">
                  <div className="text-muted-foreground flex flex-col items-center gap-2">
                    <ImageIcon className="size-5" />
                    <span className="text-sm">Loading image...</span>
                  </div>
                </div>
              )}

              {/* Actual image */}
              <img
                src={previewUrl || "/placeholder.svg"}
                alt="Cover"
                className={cn(
                  "h-full w-full object-cover transition-opacity duration-300",
                  imageLoading ? "opacity-0" : "opacity-100"
                )}
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />

              {/* Overlay on hover */}
              {!disabled && (
                <div className="absolute inset-0 bg-black/0 transition-all duration-200 group-hover:bg-black/40" />
              )}

              {/* Action buttons overlay */}
              {!disabled && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleOpenFileDialog}
                      variant="secondary"
                      size="sm"
                      className="bg-white/90 text-gray-900 hover:bg-white"
                    >
                      <Upload />
                      Change Cover
                    </Button>
                    <Button
                      type="button"
                      onClick={removeCoverImage}
                      variant="destructive"
                      size="sm"
                    >
                      <XIcon />
                      Remove
                    </Button>
                  </div>
                </div>
              )}

              {/* Upload progress */}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="relative">
                    <svg className="size-16 -rotate-90" viewBox="0 0 64 64">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-white/20"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - uploadProgress / 100)}`}
                        className="text-white transition-all duration-300"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {Math.round(uploadProgress)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty State */
          <div
            className={cn(
              "flex aspect-21/9 w-full flex-col items-center justify-center gap-4 p-8 text-center",
              !disabled && "cursor-pointer"
            )}
            onClick={handleOpenFileDialog}
          >
            <div className="bg-primary/10 rounded-full p-4">
              <CloudUpload className="text-primary size-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Upload Cover Image</h3>
              <p className="text-muted-foreground text-sm">
                {disabled
                  ? "Upload is disabled"
                  : "Drag and drop an image here, or click to browse"}
              </p>
              <p className="text-muted-foreground text-xs">
                Recommended size: 1200x514px • Max size: 5MB
              </p>
            </div>

            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="bg-transparent"
              >
                <ImageIcon />
                Browse Files
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive" appearance="light" className="mt-5">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>File upload error(s)</AlertTitle>
            <AlertDescription>
              {errors.map((error, index) => (
                <p key={index} className="last:mb-0">
                  {error}
                </p>
              ))}
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}

      {/* Upload Error */}
      {uploadError && (
        <Alert variant="destructive" appearance="light" className="mt-5">
          <AlertIcon>
            <TriangleAlert />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>
              <p>{uploadError}</p>
              <Button
                type="button"
                onClick={retryUpload}
                variant="primary"
                size="sm"
                disabled={disabled}
              >
                Retry Upload
              </Button>
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}

      {/* Upload Tips */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="mb-2 text-sm font-medium">Cover Image Guidelines</h4>
        <ul className="text-muted-foreground space-y-1 text-xs">
          <li>• Use high-quality images with good lighting and composition</li>
          <li>• Recommended aspect ratio: 21:9 (ultrawide) for best results</li>
          <li>• Avoid images with important content near the edges</li>
          <li>• Supported formats: JPG, PNG, WebP</li>
        </ul>
      </div>
    </div>
  );
}
