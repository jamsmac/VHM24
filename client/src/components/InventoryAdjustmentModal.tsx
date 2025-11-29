import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface InventoryAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItem: {
    id: number;
    productId: number;
    productName: string;
    level: "warehouse" | "operator" | "machine";
    locationId?: number;
    currentQuantity: number;
  } | null;
  onSuccess?: () => void;
}

export function InventoryAdjustmentModal({
  open,
  onOpenChange,
  inventoryItem,
  onSuccess,
}: InventoryAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<"damage" | "shrinkage" | "correction" | "found" | "expired" | "returned">("correction");
  const [quantityChange, setQuantityChange] = useState("");
  const [reason, setReason] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const createAdjustmentMutation = trpc.inventoryAdjustments.create.useMutation({
    onSuccess: () => {
      toast.success("Inventory adjustment recorded successfully");
      handleClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Failed to record adjustment", {
        description: error.message,
      });
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async () => {
    if (!inventoryItem) return;

    const change = parseInt(quantityChange);
    if (isNaN(change) || change === 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for the adjustment");
      return;
    }

    // For now, we'll skip photo upload and just submit the adjustment
    // In production, you would upload the photo to S3 first
    let photoUrl: string | undefined = undefined;
    if (photoFile) {
      // TODO: Upload photo to S3 and get URL
      // photoUrl = await uploadPhotoToS3(photoFile);
      toast.info("Photo upload not yet implemented");
    }

    createAdjustmentMutation.mutate({
      inventoryId: inventoryItem.id,
      productId: inventoryItem.productId,
      adjustmentType,
      quantityChange: change,
      reason: reason.trim(),
      photoUrl,
      level: inventoryItem.level,
      locationId: inventoryItem.locationId,
    });
  };

  const handleClose = () => {
    setAdjustmentType("correction");
    setQuantityChange("");
    setReason("");
    setPhotoFile(null);
    setPhotoPreview(null);
    onOpenChange(false);
  };

  const getAdjustmentTypeLabel = (type: string) => {
    switch (type) {
      case "damage":
        return "Damage";
      case "shrinkage":
        return "Shrinkage/Theft";
      case "correction":
        return "Inventory Correction";
      case "found":
        return "Found Items";
      case "expired":
        return "Expired Products";
      case "returned":
        return "Customer Return";
      default:
        return type;
    }
  };

  const newQuantity = inventoryItem
    ? inventoryItem.currentQuantity + (parseInt(quantityChange) || 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-[#0f172a]/95 border-white/10 text-white backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventory Adjustment</DialogTitle>
          <DialogDescription className="text-gray-400">
            Record a manual inventory adjustment with reason and optional photo evidence
          </DialogDescription>
        </DialogHeader>

        {inventoryItem && (
          <div className="space-y-6 py-4">
            {/* Product Info */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-medium text-white mb-2">{inventoryItem.productName}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                <div>
                  <span className="text-gray-500">Level:</span>{" "}
                  <span className="text-white capitalize">{inventoryItem.level}</span>
                </div>
                <div>
                  <span className="text-gray-500">Current Stock:</span>{" "}
                  <span className="text-white font-bold">{inventoryItem.currentQuantity}</span>
                </div>
              </div>
            </div>

            {/* Adjustment Type */}
            <div className="grid gap-2">
              <Label htmlFor="adjustmentType" className="text-gray-300">
                Adjustment Type *
              </Label>
              <Select value={adjustmentType} onValueChange={(value: any) => setAdjustmentType(value)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-white/10 text-white">
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="shrinkage">Shrinkage/Theft</SelectItem>
                  <SelectItem value="correction">Inventory Correction</SelectItem>
                  <SelectItem value="found">Found Items</SelectItem>
                  <SelectItem value="expired">Expired Products</SelectItem>
                  <SelectItem value="returned">Customer Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity Change */}
            <div className="grid gap-2">
              <Label htmlFor="quantityChange" className="text-gray-300">
                Quantity Change *
              </Label>
              <Input
                id="quantityChange"
                type="number"
                placeholder="Enter positive or negative number (e.g., -5 or +10)"
                value={quantityChange}
                onChange={(e) => setQuantityChange(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              />
              {quantityChange && (
                <p className="text-sm text-gray-400">
                  New quantity will be:{" "}
                  <span className={`font-bold ${newQuantity < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {newQuantity}
                  </span>
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="grid gap-2">
              <Label htmlFor="reason" className="text-gray-300">
                Reason *
              </Label>
              <Textarea
                id="reason"
                placeholder="Explain the reason for this adjustment..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[100px]"
              />
            </div>

            {/* Photo Upload */}
            <div className="grid gap-2">
              <Label htmlFor="photo" className="text-gray-300">
                Photo Evidence (Optional)
              </Label>
              {!photoPreview ? (
                <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center hover:border-white/20 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-transparent border-white/10 text-white hover:bg-white/10"
                    onClick={() => document.getElementById("photo")?.click()}
                  >
                    Select Photo
                  </Button>
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden border border-white/10">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={handleRemovePhoto}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="bg-transparent border-white/10 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createAdjustmentMutation.isPending || !reason.trim() || !quantityChange}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {createAdjustmentMutation.isPending ? "Recording..." : "Record Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
