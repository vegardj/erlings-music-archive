
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertCircle, FileText, Upload, X } from "lucide-react";
import { csvImportService, ImportResult, ParsedWork } from "@/services/csvImportService";
import { optimizedImportService } from "@/services/optimizedImportService";
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
  currentStep: string;
}

export const DataImportDialog = ({ open, onOpenChange }: DataImportDialogProps) => {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    status: 'idle',
    imported: 0,
    total: 0,
    skipped: 0,
    errors: [],
    currentStep: ''
  });
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const availableFiles = csvImportService.getAvailableFiles();

  const updateStatus = (updates: Partial<ImportStatus>) => {
    setImportStatus(prev => ({ ...prev, ...updates }));
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
    updateStatus({
      status: 'processing',
      imported: 0,
      total: 0,
      skipped: 0,
      errors: [],
      currentStep: 'Fetching CSV data...'
    });
    
    try {
      // Step 1: Fetch and parse CSV (5% progress)
      const csvText = await csvImportService.fetchCSV(selectedFile);
      const rows = csvImportService.parseCSV(csvText);
      setProgress(5);
      
      updateStatus({ currentStep: 'Parsing CSV data...' });
      
      // Parse according to file type
      let works: ParsedWork[] = [];
      if (selectedFile === 'Eldre_populærmusikk.csv') {
        works = csvImportService.parseEldrePopulaermusikk(rows);
      } else {
        throw new Error(`Parser for ${selectedFile} not implemented yet`);
      }
      
      updateStatus({ 
        total: works.length,
        currentStep: `Parsed ${works.length} works from CSV`
      });
      setProgress(10);
      
      if (works.length === 0) {
        throw new Error('No valid works found in CSV file');
      }
      
      // Step 2: Initialize batch context (15% progress)
      updateStatus({ currentStep: 'Loading existing data...' });
      const context = await optimizedImportService.initializeBatchContext();
      setProgress(15);
      
      // Step 3: Ensure categories exist (20% progress)
      updateStatus({ currentStep: 'Setting up categories...' });
      const uniqueCategories = [...new Set(works.map(w => w.category))];
      await optimizedImportService.ensureCategories(context, uniqueCategories);
      setProgress(20);
      
      // Step 4: Batch create people (40% progress)
      updateStatus({ currentStep: 'Creating people records...' });
      await optimizedImportService.batchCreatePeople(context, works);
      setProgress(40);
      
      // Step 5: Import works with all relationships (90% progress)
      updateStatus({ currentStep: 'Importing works and relationships...' });
      const result = await optimizedImportService.batchImportWorks(context, works);
      setProgress(90);
      
      // Step 6: Complete (100% progress)
      updateStatus({
        status: 'completed',
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors,
        currentStep: 'Import completed!'
      });
      setProgress(100);
      
      toast({
        title: "Import completed successfully",
        description: `Imported ${result.imported} works, skipped ${result.skipped} duplicates.`,
      });
      
    } catch (error) {
      console.error('Error during import:', error);
      updateStatus({ 
        status: 'error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        currentStep: 'Import failed'
      });
      
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
      errors: [],
      currentStep: ''
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
            Select a CSV file to import musical works data. This will create works, people, categories, and relationships in your database. Duplicates will be automatically skipped.
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
                <p className="text-sm text-gray-600">{importStatus.currentStep}</p>
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
                      {importStatus.errors.slice(0, 5).map((error, index) => (
                        <li key={index} className="truncate">{error}</li>
                      ))}
                      {importStatus.errors.length > 5 && (
                        <li>... and {importStatus.errors.length - 5} more errors</li>
                      )}
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
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={importing}
                >
                  {importing ? 'Processing...' : 'Close'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
