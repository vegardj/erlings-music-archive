
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast";

interface AddWorkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddWorkDialog = ({ open, onOpenChange }: AddWorkDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: "",
    form_or_genre: "",
    key_signature: "",
    composition_year: "",
    composition_year_to: "",
    rating: "",
    comments: "",
    category_id: "",
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const addWorkMutation = useMutation({
    mutationFn: async (workData: any) => {
      const { data, error } = await supabase
        .from('work')
        .insert(workData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Work added successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['works'] });
      onOpenChange(false);
      setFormData({
        title: "",
        form_or_genre: "",
        key_signature: "",
        composition_year: "",
        composition_year_to: "",
        rating: "",
        comments: "",
        category_id: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      title: formData.title,
      form_or_genre: formData.form_or_genre || null,
      key_signature: formData.key_signature || null,
      comments: formData.comments || null,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
    };

    if (formData.composition_year) {
      submitData.composition_year = parseInt(formData.composition_year);
    }
    if (formData.composition_year_to) {
      submitData.composition_year_to = parseInt(formData.composition_year_to);
    }
    if (formData.rating) {
      submitData.rating = parseInt(formData.rating);
    }

    addWorkMutation.mutate(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Work</DialogTitle>
          <DialogDescription>
            Add a new musical work to the collection.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="form_or_genre">Form/Genre</Label>
              <Input
                id="form_or_genre"
                value={formData.form_or_genre}
                onChange={(e) => setFormData({ ...formData, form_or_genre: e.target.value })}
                placeholder="e.g., Waltz, Hambo"
              />
            </div>
            <div>
              <Label htmlFor="key_signature">Key</Label>
              <Input
                id="key_signature"
                value={formData.key_signature}
                onChange={(e) => setFormData({ ...formData, key_signature: e.target.value })}
                placeholder="e.g., G, D"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="composition_year">Composition Year</Label>
              <Input
                id="composition_year"
                type="number"
                value={formData.composition_year}
                onChange={(e) => setFormData({ ...formData, composition_year: e.target.value })}
                placeholder="1890"
              />
            </div>
            <div>
              <Label htmlFor="composition_year_to">To Year</Label>
              <Input
                id="composition_year_to"
                type="number"
                value={formData.composition_year_to}
                onChange={(e) => setFormData({ ...formData, composition_year_to: e.target.value })}
                placeholder="1895"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="rating">Rating (0-5)</Label>
            <Input
              id="rating"
              type="number"
              min="0"
              max="5"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addWorkMutation.isPending}>
              {addWorkMutation.isPending ? "Adding..." : "Add Work"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
