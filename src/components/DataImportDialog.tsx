
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, FileText, Upload, X } from "lucide-react";
import { csvImportService, ImportResult, ParsedWork } from "@/services/csvImportService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DataImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FileStatus {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  imported: number;
  total: number;
  skipped: number;
  errors: string[];
}

const CSV_FILES = [
  { name: 'Allsanger.csv', parser: 'parseAllsanger' },
  { name: 'Per_Lasson.csv', parser: 'parsePerLasson' },
  { name: 'Utenlandsk_popul_rmusikk.csv', parser: 'parseUtenlandskPopular' },
  { name: 'Forskjellig.csv', parser: 'parseForskjellig' },
  { name: '1905-noter.csv', parser: 'parse1905Noter' },
  { name: 'Forskjellige_noter.csv', parser: 'parseForskjelligeNoter' },
  { name: 'Posca.csv', parser: 'parsePosca' },
  { name: 'Hefter.csv', parser: 'parseHefter' }
];

export const DataImportDialog = ({ open, onOpenChange }: DataImportDialogProps) => {
  const [importing, setImporting] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const updateFileStatus = (filename: string, updates: Partial<FileStatus>) => {
    setFileStatuses(prev => prev.map(file => 
      file.name === filename ? { ...file, ...updates } : file
    ));
  };

  const createOrGetPerson = async (name: string, lifespan?: string) => {
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
      return existingPerson.id;
    }
    
    // Create new person
    const lifespanData = csvImportService.extractLifespan(lifespan || '');
    const { data: newPerson, error } = await supabase
      .from('person')
      .insert({
        full_name: cleanName,
        birth_year: lifespanData?.birthYear,
        death_year: lifespanData?.deathYear
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
        const composerId = await createOrGetPerson(work.composer, work.composerLifespan);
        if (composerId) {
          await supabase
            .from('work_contributor')
            .insert({
              work_id: newWork.id,
              person_id: composerId,
              role: 'composer'
            });
        }
      }
      
      // Create lyricist relationship
      if (work.lyricist) {
        const lyricistId = await createOrGetPerson(work.lyricist, work.lyricistLifespan);
        if (lyricistId) {
          await supabase
            .from('work_contributor')
            .insert({
              work_id: newWork.id,
              person_id: lyricistId,
              role: 'lyricist'
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
    setImporting(true);
    setProgress(0);
    
    // Initialize file statuses
    const initialStatuses: FileStatus[] = CSV_FILES.map(file => ({
      name: file.name,
      status: 'pending',
      imported: 0,
      total: 0,
      skipped: 0,
      errors: []
    }));
    setFileStatuses(initialStatuses);
    
    let totalProcessed = 0;
    const totalFiles = CSV_FILES.length;
    
    for (let i = 0; i < CSV_FILES.length; i++) {
      const file = CSV_FILES[i];
      updateFileStatus(file.name, { status: 'processing' });
      
      try {
        // Fetch and parse CSV
        const csvText = await csvImportService.fetchCSV(file.name);
        const rows = csvImportService.parseCSV(csvText);
        
        // Parse according to file type
        const parser = csvImportService[file.parser as keyof typeof csvImportService] as any;
        const works: ParsedWork[] = parser(rows);
        
        updateFileStatus(file.name, { total: works.length });
        
        // Import each work
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];
        
        for (const work of works) {
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
          updateFileStatus(file.name, { imported, skipped });
        }
        
        updateFileStatus(file.name, { 
          status: 'completed', 
          errors: errors.slice(0, 5) // Limit to first 5 errors
        });
        
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        updateFileStatus(file.name, { 
          status: 'error', 
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
      
      totalProcessed++;
      setProgress((totalProcessed / totalFiles) * 100);
    }
    
    setImporting(false);
    toast({
      title: "Import completed",
      description: "Data import process has finished. Check the results above.",
    });
  };

  const getStatusIcon = (status: FileStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'processing':
        return <Upload className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Data from CSV Files</DialogTitle>
          <DialogDescription>
            Import musical works data from the CSV files. This will create works, people, categories, and relationships in your database. Duplicates will be skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!importing && fileStatuses.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Ready to import data from {CSV_FILES.length} CSV files
              </p>
              <Button onClick={startImport} className="bg-blue-600 hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" />
                Start Import
              </Button>
            </div>
          )}

          {(importing || fileStatuses.length > 0) && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>

              <div className="space-y-3">
                {fileStatuses.map((file) => (
                  <div key={file.name} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(file.status)}
                        <span className="font-medium">{file.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {file.total > 0 && (
                          <span>
                            {file.imported} imported, {file.skipped} skipped / {file.total} total
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {file.status === 'processing' && file.total > 0 && (
                      <Progress value={((file.imported + file.skipped) / file.total) * 100} className="w-full h-2" />
                    )}
                    
                    {file.errors.length > 0 && (
                      <div className="mt-2 text-sm text-red-600">
                        <p className="font-medium">Errors:</p>
                        <ul className="list-disc list-inside">
                          {file.errors.map((error, index) => (
                            <li key={index} className="truncate">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!importing && (
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
