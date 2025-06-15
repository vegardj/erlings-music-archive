
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publisherService, Publisher, SimilarPublisher } from '@/services/publisherService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Edit2, Merge, Search, AlertCircle } from 'lucide-react';

export const PublisherManager = () => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: publishers = [], isLoading } = useQuery({
    queryKey: ['publishers'],
    queryFn: publisherService.getAllPublishers
  });

  const { data: similarPublishers = [], isLoading: loadingSimilar } = useQuery({
    queryKey: ['similar-publishers'],
    queryFn: () => publisherService.findSimilarPublishers(0.7)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => 
      publisherService.updatePublisherName(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
      setEditingId(null);
      toast.success('Publisher name updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update publisher name: ' + error.message);
    }
  });

  const mergeMutation = useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: number; targetId: number }) =>
      publisherService.mergePublishers(sourceId, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
      queryClient.invalidateQueries({ queryKey: ['similar-publishers'] });
      toast.success('Publishers merged successfully');
    },
    onError: (error) => {
      toast.error('Failed to merge publishers: ' + error.message);
    }
  });

  const handleEdit = (publisher: Publisher) => {
    setEditingId(publisher.id);
    setEditName(publisher.name);
  };

  const handleSave = () => {
    if (editingId && editName.trim()) {
      updateMutation.mutate({ id: editingId, name: editName.trim() });
    }
  };

  const handleMerge = (sourceId: number, targetId: number) => {
    mergeMutation.mutate({ sourceId, targetId });
  };

  const filteredPublishers = publishers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Publisher Management</h2>
        <Badge variant="outline">
          {publishers.length} total publishers
        </Badge>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">All Publishers</TabsTrigger>
          <TabsTrigger value="similar" className="relative">
            Similar Names
            {similarPublishers.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {similarPublishers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search publishers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPublishers.map((publisher) => (
              <Card key={publisher.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    {editingId === publisher.id ? (
                      <div className="flex-1 space-y-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={handleSave}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-sm">{publisher.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(publisher)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="similar" className="space-y-4">
          {loadingSimilar ? (
            <div>Analyzing similar publisher names...</div>
          ) : similarPublishers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-gray-600">No similar publisher names detected!</p>
                <p className="text-sm text-gray-500 mt-2">All publisher names appear to be unique.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {similarPublishers.map((group) => (
                <Card key={group.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{group.name}</span>
                      <Badge variant="secondary">
                        {Math.round(group.confidence * 100)}% similarity
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">Similar publishers found:</p>
                      {group.suggestions.map((suggestion) => (
                        <div key={suggestion.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <span className="font-medium">{suggestion.name}</span>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Merge className="w-3 h-3 mr-1" />
                                Merge
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Merge Publishers</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p>Choose which publisher name to keep:</p>
                                <div className="space-y-2">
                                  <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={() => handleMerge(suggestion.id, group.id)}
                                  >
                                    Keep: <strong className="ml-2">{group.name}</strong>
                                  </Button>
                                  <Button
                                    className="w-full justify-start"
                                    variant="outline"
                                    onClick={() => handleMerge(group.id, suggestion.id)}
                                  >
                                    Keep: <strong className="ml-2">{suggestion.name}</strong>
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
