"use client";


import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Camera, Image as ImageIcon, Loader2, Sparkles, AlertCircle } from "lucide-react";
import Webcam from "react-webcam";
import { scanReceipt, AiScanResponse } from "@/app/actions/scan-receipt";
import { TransactionFormData } from "./transaction-modal";

type ModalStep = "choose" | "capture" | "loading" | "confirm" | "error";

interface AddWithAiModalProps {
  onTransactionSaved?: () => void;
  onSubmitTransaction?: (data: TransactionFormData) => Promise<void>;
}

export function AddWithAiModal({ onTransactionSaved, onSubmitTransaction }: AddWithAiModalProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>("choose");
  const [aiData, setAiData] = useState<Partial<AiScanResponse> | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const webcamRef = useRef<Webcam>(null);

  const processImage = async (base64String: string) => {
    setStep("loading");
    const result = await scanReceipt(base64String);

    if (result.success && result.data) {
      setAiData(result.data);
      setStep("confirm");
    } else {
      setErrorMessage(result.error || "An unknown error occurred.");
      setStep("error");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage("Please select a valid image file.");
        setStep("error");
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("Image file is too large. Please select an image smaller than 10MB.");
        setStep("error");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        processImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        processImage(imageSrc);
      }
    }
  }, [webcamRef]);

  const resetModal = () => {
    setStep("choose");
    setAiData(null);
    setErrorMessage("");
  };

  const closeAndReset = () => {
    setModalOpen(false);
    // Delay reset to allow dialog to close gracefully
    setTimeout(resetModal, 300);
  };

  const handleConfirmData = async () => {
    if (aiData && onSubmitTransaction) {
      try {
        // Convert AI data to transaction form format
        const transactionData: TransactionFormData = {
          name: aiData.name || '',
          amount: aiData.amount?.toString() || '0',
          category: aiData.category || 'Other',
          date: aiData.date ? new Date(aiData.date) : new Date(),
        };
        
        // Directly save the transaction
        await onSubmitTransaction(transactionData);
        
        // Close modal and reset
        closeAndReset();
        
        // Call success callback
        if (onTransactionSaved) {
          onTransactionSaved();
        }
      } catch (error) {
        console.error('Failed to save transaction:', error);
        setErrorMessage('Failed to save transaction. Please try again.');
        setStep('error');
      }
    }
  };

  return (
    <>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Add with AI
          </Button>
        </DialogTrigger>
        <DialogContent onInteractOutside={closeAndReset} onEscapeKeyDown={closeAndReset}>
          <DialogHeader>
            <DialogTitle>Add with AI</DialogTitle>
          </DialogHeader>

          {/* Step 1: Choose Input */}
          {step === "choose" && (
            <div className="grid grid-cols-2 gap-4 p-4">
              <Button 
                variant="outline" 
                className="h-28 flex-col" 
                onClick={() => setStep("capture")}
              >
                <Camera className="h-8 w-8 mb-2" /> 
                Camera
              </Button>
              
              <Button asChild variant="outline" className="h-28 flex-col cursor-pointer">
                <label className="flex flex-col items-center justify-center w-full h-full">
                  <ImageIcon className="h-8 w-8 mb-2" /> 
                  Gallery
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </Button>
            </div>
          )}

          {/* Step 2: Capture (Show Webcam) */}
          {step === "capture" && (
            <div className="flex flex-col gap-4">
              <div className="bg-muted rounded-md overflow-hidden">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width="100%"
                  videoConstraints={{ facingMode: "environment" }}
                />
              </div>
              <Button onClick={handleCapture} size="lg">
                Capture Photo
              </Button>
              <Button variant="ghost" onClick={() => setStep("choose")}>
                Back
              </Button>
            </div>
          )}

          {/* Step 3: Loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Scanning your receipt...</p>
            </div>
          )}

          {/* Step 4: Confirm Data */}
          {step === "confirm" && aiData && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-2 text-center">Confirm Data</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                AI has scanned your receipt. Please review the details below.
              </p>
              
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="flex justify-between">
                  <span className="font-medium">Name:</span>
                  <span>{aiData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Amount:</span>
                  <span>${aiData.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Category:</span>
                  <span>{aiData.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Date:</span>
                  <span>{aiData.date}</span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={resetModal} className="flex-1">
                  Try Again
                </Button>
                <Button onClick={handleConfirmData} className="flex-1">
                  Save Transaction
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 5: Error State */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="mt-4 font-medium">Scan Failed</p>
              <p className="mt-2 text-muted-foreground">{errorMessage}</p>
              <Button variant="outline" onClick={resetModal} className="mt-6">
                Try Again
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
