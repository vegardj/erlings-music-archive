
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Calendar, Star, User, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const WorksList = () => {
  const { data: works, isLoading, error } = useQuery({
    queryKey: ['works'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work')
        .select(`
          *,
          category:category_id(name),
          work_contributor(
            role,
            link,
            person:person_id(full_name, profile_link)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
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
        Error loading works: {error.message}
      </div>
    );
  }

  if (!works || works.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No musical works found. Add your first work to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {works.map((work) => {
        const composers = work.work_contributor?.filter(c => c.role === 'composer') || [];
        
        return (
          <Card key={work.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 flex-1">
                  <CardTitle className="text-lg leading-tight">{work.title}</CardTitle>
                  {work.title_link && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                      onClick={() => window.open(work.title_link, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {work.rating && (
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="text-sm">{work.rating}</span>
                  </div>
                )}
              </div>
              {work.category && (
                <Badge variant="secondary" className="w-fit">
                  {work.category.name}
                </Badge>
              )}
            </CardHeader>
            
            <CardContent className="space-y-2">
              {composers.length > 0 && (
                <div className="flex items-center text-sm text-gray-600">
                  <User className="w-4 h-4 mr-2" />
                  <div className="flex flex-wrap gap-2">
                    {composers.map((c, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <span>{c.person?.full_name}</span>
                        {(c.person?.profile_link || c.link) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto text-blue-600 hover:text-blue-800"
                            onClick={() => window.open(c.person?.profile_link || c.link, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {work.composition_year && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  {work.composition_year}
                  {work.composition_year_to && ` - ${work.composition_year_to}`}
                </div>
              )}
              
              {work.form_or_genre && (
                <Badge variant="outline">{work.form_or_genre}</Badge>
              )}
              
              {work.key_signature && (
                <Badge variant="outline">Key: {work.key_signature}</Badge>
              )}
              
              {work.comments && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {work.comments}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
