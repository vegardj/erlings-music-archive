
export interface CSVRow {
  [key: string]: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  errors: string[];
}

export interface ParsedWork {
  title: string;
  titleLink?: string;
  composer?: string;
  composerLink?: string;
  composerLifespan?: string;
  lyricist?: string;
  lyricistLink?: string;
  lyricistLifespan?: string;
  compositionYear?: number;
  category: string;
  key?: string;
  form?: string;
  publisher?: string;
  notes?: string;
}

// Available CSV files in the workspace
const AVAILABLE_CSV_FILES = [
  '1905-noter.csv',
  'Allsanger.csv',
  'Eldre_populærmusikk.csv',
  'Forskjellig.csv',
  'Forskjellige_noter.csv',
  'Hefter.csv',
  'Per_Lasson.csv',
  'Posca.csv',
  'Utenlandsk_populærmusikk.csv'
];

// Import the Eldre_populærmusikk CSV file from the links_latest directory
import EldrePopulaermusikkCSV from '../../innholdsfortegnelse_csv_links_latest/Eldre_populærmusikk.csv?raw';

export const csvImportService = {
  getAvailableFiles(): string[] {
    return AVAILABLE_CSV_FILES;
  },

  async fetchCSV(filename: string): Promise<string> {
    // For now, we only support Eldre_populærmusikk.csv
    if (filename === 'Eldre_populærmusikk.csv') {
      return EldrePopulaermusikkCSV;
    }
    throw new Error(`CSV file ${filename} not supported yet`);
  },

  parseCSV(csvText: string): CSVRow[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // Get headers from first line
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const rows: CSVRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length > 0) {
        const row: CSVRow = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        rows.push(row);
      }
    }
    
    return rows;
  },

  parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  },

  cleanText(text: string | undefined): string | undefined {
    if (!text) return undefined;
    const cleaned = text.replace(/['"]/g, '').trim();
    return cleaned === '' ? undefined : cleaned;
  },

  extractLifespan(text: string): { birthYear?: number; deathYear?: number } | null {
    if (!text || text.trim() === '') return null;
    
    // Look for patterns like "1859 - 1883" or "(1905 - 1977)"
    const match = text.match(/(\d{4})\s*-\s*(\d{4})/);
    if (match) {
      return {
        birthYear: parseInt(match[1]),
        deathYear: parseInt(match[2])
      };
    }
    
    // Look for birth year only like "1859 -"
    const birthMatch = text.match(/(\d{4})\s*-\s*$/);
    if (birthMatch) {
      return {
        birthYear: parseInt(birthMatch[1])
      };
    }
    
    return null;
  },

  extractYear(text: string | undefined): number | undefined {
    if (!text || text.trim() === '') return undefined;
    const match = text.match(/\d{4}/);
    return match ? parseInt(match[0]) : undefined;
  },

  parseEldrePopulaermusikk(rows: CSVRow[]): ParsedWork[] {
    console.log('Parsing Eldre_populærmusikk CSV with columns:', rows[0] ? Object.keys(rows[0]) : 'No data');
    console.log('First few rows:', rows.slice(0, 3));
    
    return rows
      .filter(row => {
        // Use "Melodi" as the title field based on the actual CSV structure
        const title = this.cleanText(row.Melodi || row.melodi);
        return title && title.length > 0;
      })
      .map(row => {
        const work: ParsedWork = {
          // Map actual CSV columns to our work structure
          title: this.cleanText(row.Melodi || row.melodi) || '',
          titleLink: this.cleanText(row.Melodi_link || row.melodi_link),
          composer: this.cleanText(row.Komponist || row.komponist),
          composerLink: this.cleanText(row.Komponist_link || row.komponist_link),
          composerLifespan: this.cleanText(row.Levde_når || row.levde_når),
          lyricist: this.cleanText(row.Lyrikk || row.lyrikk),
          lyricistLink: this.cleanText(row.Lyrikk_link || row.lyrikk_link),
          lyricistLifespan: this.cleanText(row.Levde_når_2 || row.levde_når_2),
          compositionYear: this.extractYear(row.Når_komponert || row.når_komponert),
          category: 'Eldre populærmusikk',
          key: this.cleanText(row.Toneart || row.toneart),
          form: this.cleanText(row.Form || row.form),
          publisher: this.cleanText(row.Forlag || row.forlag),
          notes: this.cleanText(row.Diverse || row.diverse || row.Merknad || row.merknad)
        };
        
        console.log('Parsed work:', work.title, 'with data:', {
          composer: work.composer,
          lyricist: work.lyricist,
          titleLink: work.titleLink,
          composerLink: work.composerLink,
          lyricistLink: work.lyricistLink
        });
        
        return work;
      });
  }
};
