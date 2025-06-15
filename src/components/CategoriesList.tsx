
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Music } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const CategoriesList = () => {
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category')
        .select(`
          *,
          work(id)
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading categories: {error.message}
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No categories found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {categories.map((category) => (
        <Card key={category.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">{category.name}</CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Music className="w-3 h-3" />
                {category.work?.length || 0}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            {category.description && (
              <p className="text-sm text-gray-600">
                {category.description}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {category.work?.length || 0} work{(category.work?.length || 0) !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
