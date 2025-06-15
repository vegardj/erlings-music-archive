
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
    
    return rows
      .filter(row => {
        const title = this.cleanText(row.Tittel || row.title);
        return title && title.length > 0;
      })
      .map(row => {
        const work: ParsedWork = {
          title: this.cleanText(row.Tittel || row.title) || '',
          titleLink: this.cleanText(row.Tittel_link || row.title_link),
          composer: this.cleanText(row.Komponist || row.composer),
          composerLink: this.cleanText(row.Komponist_link || row.composer_link),
          composerLifespan: this.cleanText(row.Levde_når || row.composer_lifespan),
          lyricist: this.cleanText(row.Tekstforfatter || row.lyricist),
          lyricistLink: this.cleanText(row.Tekstforfatter_link || row.lyricist_link),
          lyricistLifespan: this.cleanText(row.Tekstforfatter_levde || row.lyricist_lifespan),
          compositionYear: this.extractYear(row.Komponert || row.composition_year),
          category: 'Eldre populærmusikk',
          key: this.cleanText(row.Toneart || row.key),
          form: this.cleanText(row.Form || row.form),
          publisher: this.cleanText(row.Forlag || row.publisher),
          notes: this.cleanText(row.Merknad || row.notes)
        };
        
        console.log('Parsed work:', work.title, 'with links:', {
          titleLink: work.titleLink,
          composerLink: work.composerLink,
          lyricistLink: work.lyricistLink
        });
        
        return work;
      });
  }
};
