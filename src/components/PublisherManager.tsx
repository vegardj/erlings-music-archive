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
import { Edit2, Merge, Search, AlertCircle, X } from 'lucide-react';

export const PublisherManager = () => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedMerge, setSelectedMerge] = useState<{ source: Publisher; target: Publisher } | null>(null);
  const [customMergeName, setCustomMergeName] = useState('');
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
    mutationFn: ({ sourceId, targetId, newName }: { sourceId: number; targetId: number; newName?: string }) =>
      publisherService.mergePublishers(sourceId, targetId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
      queryClient.invalidateQueries({ queryKey: ['similar-publishers'] });
      setMergeDialogOpen(false);
      setSelectedMerge(null);
      setCustomMergeName('');
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

  const openMergeDialog = (source: Publisher, target: Publisher) => {
    setSelectedMerge({ source, target });
    setCustomMergeName('');
    setMergeDialogOpen(true);
  };

  const handleMerge = (keepTarget: boolean, customName?: string) => {
    if (!selectedMerge) return;
    
    const { source, target } = selectedMerge;
    const sourceId = keepTarget ? source.id : target.id;
    const targetId = keepTarget ? target.id : source.id;
    
    mergeMutation.mutate({ sourceId, targetId, newName: customName });
  };

  const handleRejectSuggestion = (groupId: number, suggestionId: number) => {
    const rejectionKey = `${groupId}-${suggestionId}`;
    setRejectedSuggestions(prev => new Set([...prev, rejectionKey]));
    toast.success('Suggestion rejected');
  };

  const isRejected = (groupId: number, suggestionId: number) => {
    return rejectedSuggestions.has(`${groupId}-${suggestionId}`);
  };

  const filteredPublishers = publishers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSimilarPublishers = similarPublishers.map(group => ({
    ...group,
    suggestions: group.suggestions.filter(suggestion => !isRejected(group.id, suggestion.id))
  })).filter(group => group.suggestions.length > 0);

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
            {filteredSimilarPublishers.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {filteredSimilarPublishers.length}
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
          ) : filteredSimilarPublishers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-gray-600">No similar publisher names detected!</p>
                <p className="text-sm text-gray-500 mt-2">All publisher names appear to be unique.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredSimilarPublishers.map((group) => (
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
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectSuggestion(group.id, suggestion.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-3 h-3 mr-1" />
                              Not the same
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openMergeDialog(
                                { id: group.id, name: group.name, created_at: '' },
                                suggestion
                              )}
                            >
                              <Merge className="w-3 h-3 mr-1" />
                              Merge
                            </Button>
                          </div>
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

      {/* Enhanced Merge Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Merge Publishers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Choose which publisher name to keep or enter a custom name:</p>
            
            {selectedMerge && (
              <div className="space-y-3">
                <Button
                  className="w-full justify-start text-left"
                  variant="outline"
                  onClick={() => handleMerge(true)}
                >
                  Keep: <strong className="ml-2">{selectedMerge.target.name}</strong>
                </Button>
                <Button
                  className="w-full justify-start text-left"
                  variant="outline"
                  onClick={() => handleMerge(false)}
                >
                  Keep: <strong className="ml-2">{selectedMerge.source.name}</strong>
                </Button>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Or enter a custom name:</p>
                  <Input
                    placeholder="Enter correct publisher name"
                    value={customMergeName}
                    onChange={(e) => setCustomMergeName(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    disabled={!customMergeName.trim()}
                    onClick={() => handleMerge(true, customMergeName.trim())}
                  >
                    Use Custom Name: <strong className="ml-2">{customMergeName}</strong>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
