
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const PeopleList = () => {
  const { data: people, isLoading, error } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('person')
        .select(`
          *,
          work_contributor(
            role,
            work:work_id(title)
          )
        `)
        .order('full_name');
      
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
        Error loading people: {error.message}
      </div>
    );
  }

  if (!people || people.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No people found in the database.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {people.map((person) => (
        <Card key={person.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{person.full_name}</CardTitle>
            {person.gender !== 'unknown' && (
              <Badge variant="secondary" className="w-fit">
                {person.gender === 'female' ? 'Female' : 'Male'}
              </Badge>
            )}
          </CardHeader>
          
          <CardContent className="space-y-2">
            {(person.birth_year || person.death_year) && (
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                {person.birth_year || '?'} - {person.death_year || '?'}
              </div>
            )}
            
            {person.work_contributor && person.work_contributor.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Roles:</p>
                <div className="flex flex-wrap gap-1">
                  {[...new Set(person.work_contributor.map(wc => wc.role))].map(role => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {role.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {person.work_contributor.length} work{person.work_contributor.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
            
            {person.notes && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {person.notes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
