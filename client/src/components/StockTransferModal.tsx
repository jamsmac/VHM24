import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function StockTransferModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "urgent">("normal");
  const [notes, setNotes] = useState("");

  // Fetch products for dropdown
  const { data: products } = trpc.products.list.useQuery();

  // Create transfer mutation
  const createTransferMutation = trpc.stockTransfers.create.useMutation({
    onSuccess: () => {
      toast.success("Transfer request submitted successfully", {
        description: "Warehouse manager will review your request shortly.",
      });
      setIsOpen(false);
      // Reset form
      setProductId("");
      setQuantity("");
      setPriority("normal");
      setNotes("");
    },
    onError: (error) => {
      toast.error("Failed to submit transfer request", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId || !quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    createTransferMutation.mutate({
      productId: parseInt(productId),
      quantity: parseInt(quantity),
      priority,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto bg-white/5 border border-white/10 hover:bg-white/10 backdrop-blur-md text-white">
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Request Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-[#0f172a]/95 border-white/10 text-white backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Request Stock Transfer</DialogTitle>
          <DialogDescription className="text-gray-400">
            Request items from the central warehouse to your location.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="product" className="text-gray-300">
              Product <span className="text-rose-400">*</span>
            </Label>
            <Select value={productId} onValueChange={setProductId} required>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-white/10 text-white max-h-[300px]">
                {products?.map((product) => (
                  <SelectItem key={product.id} value={product.id.toString()}>
                    {product.name} ({product.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quantity" className="text-gray-300">
              Quantity <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Enter amount"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              required
              min="1"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="priority" className="text-gray-300">
              Priority
            </Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-white/10 text-white">
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    Low (Next Restock)
                  </div>
                </SelectItem>
                <SelectItem value="normal">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    Normal (24h)
                  </div>
                </SelectItem>
                <SelectItem value="urgent">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-400" />
                    Urgent (ASAP)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-gray-300">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Add any additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[80px]"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="bg-transparent border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTransferMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {createTransferMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
