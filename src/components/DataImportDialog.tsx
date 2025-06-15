
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, FileText, Upload, X } from "lucide-react";
import { csvImportService, ImportResult, ParsedWork } from "@/services/csvImportService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DataImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportStatus {
  status: 'idle' | 'processing' | 'completed' | 'error';
  imported: number;
  total: number;
  skipped: number;
  errors: string[];
}

export const DataImportDialog = ({ open, onOpenChange }: DataImportDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    status: 'idle',
    imported: 0,
    total: 0,
    skipped: 0,
    errors: []
  });
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const availableFiles = csvImportService.getAvailableFiles();

  const createOrGetPerson = async (name: string, lifespan?: string, profileLink?: string) => {
    if (!name || name.trim() === '') return null;
    
    // Clean up the name
    const cleanName = name.replace(/['"]/g, '').trim();
    if (!cleanName) return null;
    
    // Check if person already exists
    const { data: existingPerson } = await supabase
      .from('person')
      .select('id')
      .eq('full_name', cleanName)
      .maybeSingle();
    
    if (existingPerson) {
      // Update with link if provided and not already set
      if (profileLink) {
        await supabase
          .from('person')
          .update({ profile_link: profileLink })
          .eq('id', existingPerson.id);
      }
      return existingPerson.id;
    }
    
    // Create new person
    const lifespanData = csvImportService.extractLifespan(lifespan || '');
    const { data: newPerson, error } = await supabase
      .from('person')
      .insert({
        full_name: cleanName,
        birth_year: lifespanData?.birthYear,
        death_year: lifespanData?.deathYear,
        profile_link: profileLink
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating person:', error);
      return null;
    }
    
    return newPerson.id;
  };

  const createOrGetCategory = async (name: string) => {
    // Check if category exists
    const { data: existingCategory } = await supabase
      .from('category')
      .select('id')
      .eq('name', name)
      .maybeSingle();
    
    if (existingCategory) {
      return existingCategory.id;
    }
    
    // Create new category
    const { data: newCategory, error } = await supabase
      .from('category')
      .insert({ name })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating category:', error);
      return null;
    }
    
    return newCategory.id;
  };

  const checkWorkExists = async (title: string, categoryId: number | null): Promise<boolean> => {
    const { data, error } = await supabase
      .from('work')
      .select('id')
      .eq('title', title)
      .eq('category_id', categoryId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking work existence:', error);
      return false;
    }
    
    return !!data;
  };

  const importWork = async (work: ParsedWork): Promise<{ success: boolean; skipped?: boolean; error?: string }> => {
    try {
      // Skip empty titles
      if (!work.title || work.title.trim() === '') {
        return { success: false, error: 'Empty title' };
      }

      // Get or create category
      const categoryId = await createOrGetCategory(work.category);
      
      // Check if work already exists
      const exists = await checkWorkExists(work.title.trim(), categoryId);
      if (exists) {
        return { success: true, skipped: true };
      }
      
      // Create the work
      const { data: newWork, error: workError } = await supabase
        .from('work')
        .insert({
          title: work.title.trim(),
          title_link: work.titleLink,
          composition_year: work.compositionYear,
          key_signature: work.key,
          form_or_genre: work.form,
          comments: work.notes,
          category_id: categoryId
        })
        .select('id')
        .single();
      
      if (workError) {
        return { success: false, error: workError.message };
      }
      
      // Create composer relationship
      if (work.composer) {
        const composerId = await createOrGetPerson(work.composer, work.composerLifespan, work.composerLink);
        if (composerId) {
          await supabase
            .from('work_contributor')
            .insert({
              work_id: newWork.id,
              person_id: composerId,
              role: 'composer',
              link: work.composerLink
            });
        }
      }
      
      // Create lyricist relationship
      if (work.lyricist) {
        const lyricistId = await createOrGetPerson(work.lyricist, work.lyricistLifespan, work.lyricistLink);
        if (lyricistId) {
          await supabase
            .from('work_contributor')
            .insert({
              work_id: newWork.id,
              person_id: lyricistId,
              role: 'lyricist',
              link: work.lyricistLink
            });
        }
      }
      
      // Create publication record if publisher exists
      if (work.publisher) {
        await supabase
          .from('publication')
          .insert({
            work_id: newWork.id,
            publisher_name: work.publisher
          });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const startImport = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import.",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);
    setProgress(0);
    setImportStatus({
      status: 'processing',
      imported: 0,
      total: 0,
      skipped: 0,
      errors: []
    });
    
    try {
      // Fetch and parse CSV
      const csvText = await csvImportService.fetchCSV(selectedFile);
      const rows = csvImportService.parseCSV(csvText);
      
      // Parse according to file type (currently only supports Eldre_populærmusikk)
      let works: ParsedWork[] = [];
      if (selectedFile === 'Eldre_populærmusikk.csv') {
        works = csvImportService.parseEldrePopulaermusikk(rows);
      } else {
        throw new Error(`Parser for ${selectedFile} not implemented yet`);
      }
      
      setImportStatus(prev => ({ ...prev, total: works.length }));
      
      // Import each work
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      
      for (let i = 0; i < works.length; i++) {
        const work = works[i];
        const result = await importWork(work);
        
        if (result.success) {
          if (result.skipped) {
            skipped++;
          } else {
            imported++;
          }
        } else if (result.error && result.error !== 'Empty title') {
          errors.push(`${work.title}: ${result.error}`);
        }
        
        // Update progress
        const currentProgress = ((i + 1) / works.length) * 100;
        setProgress(currentProgress);
        setImportStatus(prev => ({ 
          ...prev, 
          imported, 
          skipped,
          errors: errors.slice(0, 5) // Limit to first 5 errors
        }));
      }
      
      setImportStatus(prev => ({ 
        ...prev, 
        status: 'completed'
      }));
      
      toast({
        title: "Import completed",
        description: `Imported ${imported} works, skipped ${skipped} duplicates.`,
      });
      
    } catch (error) {
      console.error('Error during import:', error);
      setImportStatus(prev => ({ 
        ...prev, 
        status: 'error',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }));
      
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    }
    
    setImporting(false);
  };

  const resetImport = () => {
    setImportStatus({
      status: 'idle',
      imported: 0,
      total: 0,
      skipped: 0,
      errors: []
    });
    setProgress(0);
    setSelectedFile('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Data from CSV Files</DialogTitle>
          <DialogDescription>
            Select a CSV file to import musical works data. This will create works, people, categories, and relationships in your database. Duplicates will be skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {importStatus.status === 'idle' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select CSV File</label>
                <Select value={selectedFile} onValueChange={setSelectedFile}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a CSV file to import..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFiles.map((file) => (
                      <SelectItem key={file} value={file} disabled={file !== 'Eldre_populærmusikk.csv'}>
                        {file} {file !== 'Eldre_populærmusikk.csv' && '(Coming soon)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  {selectedFile ? `Ready to import ${selectedFile}` : 'Select a file to begin'}
                </p>
                <Button 
                  onClick={startImport} 
                  disabled={!selectedFile}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Start Import
                </Button>
              </div>
            </div>
          )}

          {importStatus.status !== 'idle' && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Import Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {importStatus.status === 'processing' && <Upload className="w-4 h-4 text-blue-600 animate-spin" />}
                    {importStatus.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-600" />}
                    {importStatus.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                    <span className="font-medium">{selectedFile}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {importStatus.total > 0 && (
                      <span>
                        {importStatus.imported} imported, {importStatus.skipped} skipped / {importStatus.total} total
                      </span>
                    )}
                  </div>
                </div>
                
                {importStatus.errors.length > 0 && (
                  <div className="mt-2 text-sm text-red-600">
                    <p className="font-medium">Errors:</p>
                    <ul className="list-disc list-inside">
                      {importStatus.errors.map((error, index) => (
                        <li key={index} className="truncate">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                {importStatus.status === 'completed' && (
                  <Button variant="outline" onClick={resetImport}>
                    Import Another File
                  </Button>
                )}
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
