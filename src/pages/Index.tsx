
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Users, BookOpen, Archive, Plus } from "lucide-react";
import { WorksList } from "@/components/WorksList";
import { PeopleList } from "@/components/PeopleList";
import { CategoriesList } from "@/components/CategoriesList";
import { AddWorkDialog } from "@/components/AddWorkDialog";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [activeTab, setActiveTab] = useState("works");
  const [showAddWork, setShowAddWork] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-8 px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Erling's Music Transcriptions
          </h1>
          <p className="text-lg text-gray-600">
            A digital archive of musical works and transcriptions
          </p>
        </header>

        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <Button 
              onClick={() => setShowAddWork(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Work
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="works" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Works
            </TabsTrigger>
            <TabsTrigger value="people" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              People
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="archive" className="flex items-center gap-2">
              <Archive className="w-4 h-4" />
              Archive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="works">
            <Card>
              <CardHeader>
                <CardTitle>Musical Works</CardTitle>
                <CardDescription>
                  Browse and manage the collection of musical compositions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WorksList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="people">
            <Card>
              <CardHeader>
                <CardTitle>People</CardTitle>
                <CardDescription>
                  Composers, lyricists, and other contributors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PeopleList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Musical categories and collections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoriesList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="archive">
            <Card>
              <CardHeader>
                <CardTitle>Archive Information</CardTitle>
                <CardDescription>
                  Physical copies and digital assets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Archive management coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AddWorkDialog 
          open={showAddWork} 
          onOpenChange={setShowAddWork}
        />
      </div>
    </div>
  );
};

export default Index;
