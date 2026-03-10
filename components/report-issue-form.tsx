'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { analyzeIssue, geocodeAddress } from '@/lib/api';
import { AIAnalysisResponse, ReportDraft } from '@/lib/types';

interface ReportIssueFormProps {
  onAnalysisComplete: (analysis: AIAnalysisResponse, draft: ReportDraft) => void;
}

export default function ReportIssueForm({ onAnalysisComplete }: ReportIssueFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleImageChange(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageChange(file);
  };

  const handleSubmit = async () => {
    if (!imageFile || !description.trim() || !address.trim() || !pincode.trim()) {
      toast.error('Please fill all fields and upload an image.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const coords = await geocodeAddress(address.trim(), pincode.trim());
      const draft: ReportDraft = {
        image: imageFile,
        description: description.trim(),
        address: address.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        pincode: pincode.trim(),
      };
      const analysis = await analyzeIssue(draft);
      onAnalysisComplete(analysis, draft);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error analyzing issue.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Report Public Issue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image Upload */}
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-2 block">
            Upload Image
          </Label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <div className="space-y-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg"
                />
                <p className="text-xs text-slate-600">Click to change image</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">
                  Drag and drop image here
                </p>
                <p className="text-xs text-slate-500">or click to select</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="text-sm font-medium text-slate-700 mb-2 block">
            Description
          </Label>
          <Textarea
            id="description"
            placeholder="Describe the issue in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px] border-slate-300"
          />
        </div>

        {/* Address */}
        <div>
          <Label htmlFor="address" className="text-sm font-medium text-slate-700 mb-2 block">
            Address / Area
          </Label>
          <Textarea
            id="address"
            placeholder="e.g., Near Metro Gate 2, Main Road, Sector 18"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="min-h-[80px] border-slate-300"
          />
        </div>

        {/* Pincode */}
        <div>
          <Label htmlFor="pincode" className="text-sm font-medium text-slate-700 mb-2 block">
            Pincode
          </Label>
          <Input
            id="pincode"
            placeholder="e.g., 110001"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            className="border-slate-300"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isAnalyzing}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white"
        >
          {isAnalyzing ? (
            <div className="flex items-center gap-2">
              <Spinner className="w-4 h-4" />
              Analyzing...
            </div>
          ) : (
            'Analyze with AI'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
