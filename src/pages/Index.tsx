
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataImportDialog } from '@/components/DataImportDialog';
import { WorksList } from '@/components/WorksList';
import { PeopleList } from '@/components/PeopleList';
import { CategoriesList } from '@/components/CategoriesList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, Users, BookOpen, Settings } from 'lucide-react';

const Index = () => {
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Music Catalog</h1>
            <p className="text-gray-600">Manage your music collection and related data</p>
          </div>
          <div className="flex space-x-4">
            <Link to="/publishers">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Publishers
              </Button>
            </Link>
            <Button onClick={() => setIsImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
          </div>
        </div>

        <Tabs defaultValue="works" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="works">Works</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="works" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Musical Works
                </CardTitle>
                <CardDescription>
                  Browse and manage musical works in your collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorksList />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="people" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  People
                </CardTitle>
                <CardDescription>
                  View composers, arrangers, and other contributors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PeopleList />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Explore different musical categories and genres
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoriesList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DataImportDialog 
          open={isImportOpen} 
          onOpenChange={setIsImportOpen} 
        />
      </div>
    </div>
  );
};

export default Index;
