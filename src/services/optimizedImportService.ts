
import { supabase } from "@/integrations/supabase/client";
import { ParsedWork, BatchImportContext } from "./csvImportService";

interface PersonData {
  full_name: string;
  birth_year?: number;
  death_year?: number;
  profile_link?: string;
}

interface WorkData {
  title: string;
  title_link?: string;
  composition_year?: number;
  key_signature?: string;
  form_or_genre?: string;
  comments?: string;
  category_id: number;
}

interface ContributorData {
  work_id: number;
  person_id: number;
  role: 'composer' | 'lyricist';
  link?: string;
}

interface PublicationData {
  work_id: number;
  publisher_name: string;
}

export const optimizedImportService = {
  async initializeBatchContext(): Promise<BatchImportContext> {
    console.log('Initializing batch context...');
    
    // Load existing categories
    const { data: categories } = await supabase
      .from('category')
      .select('id, name');
    
    const categoryCache = new Map<string, number>();
    categories?.forEach(cat => categoryCache.set(cat.name, cat.id));
    
    // Load existing people (limit to recent ones to avoid memory issues)
    const { data: people } = await supabase
      .from('person')
      .select('id, full_name')
      .limit(10000);
    
    const personCache = new Map<string, number>();
    people?.forEach(person => personCache.set(person.full_name, person.id));
    
    // Load existing work titles to detect duplicates
    const { data: works } = await supabase
      .from('work')
      .select('title, category_id')
      .limit(50000);
    
    const existingWorks = new Set<string>();
    works?.forEach(work => existingWorks.add(`${work.title}::${work.category_id}`));
    
    console.log(`Loaded ${categoryCache.size} categories, ${personCache.size} people, ${existingWorks.size} existing works`);
    
    return { categoryCache, personCache, existingWorks };
  },

  async ensureCategories(context: BatchImportContext, categoryNames: string[]): Promise<void> {
    const newCategories = categoryNames.filter(name => !context.categoryCache.has(name));
    
    if (newCategories.length === 0) return;
    
    console.log(`Creating ${newCategories.length} new categories`);
    
    const { data: createdCategories } = await supabase
      .from('category')
      .insert(newCategories.map(name => ({ name })))
      .select('id, name');
    
    createdCategories?.forEach(cat => context.categoryCache.set(cat.name, cat.id));
  },

  async batchCreatePeople(context: BatchImportContext, works: ParsedWork[]): Promise<void> {
    // Extract unique people
    const uniquePeople = new Map<string, PersonData>();
    
    works.forEach(work => {
      if (work.composer && !context.personCache.has(work.composer)) {
        const lifespanData = work.composerLifespan ? 
          this.extractLifespan(work.composerLifespan) : null;
        uniquePeople.set(work.composer, {
          full_name: work.composer,
          birth_year: lifespanData?.birthYear,
          death_year: lifespanData?.deathYear,
          profile_link: work.composerLink
        });
      }
      
      if (work.lyricist && !context.personCache.has(work.lyricist)) {
        const lifespanData = work.lyricistLifespan ? 
          this.extractLifespan(work.lyricistLifespan) : null;
        uniquePeople.set(work.lyricist, {
          full_name: work.lyricist,
          birth_year: lifespanData?.birthYear,
          death_year: lifespanData?.deathYear,
          profile_link: work.lyricistLink
        });
      }
    });
    
    if (uniquePeople.size === 0) return;
    
    console.log(`Creating ${uniquePeople.size} new people`);
    
    // Create people in batches of 100
    const peopleArray = Array.from(uniquePeople.values());
    const batchSize = 100;
    
    for (let i = 0; i < peopleArray.length; i += batchSize) {
      const batch = peopleArray.slice(i, i + batchSize);
      const { data: createdPeople } = await supabase
        .from('person')
        .insert(batch)
        .select('id, full_name');
      
      createdPeople?.forEach(person => 
        context.personCache.set(person.full_name, person.id)
      );
    }
  },

  async batchImportWorks(context: BatchImportContext, works: ParsedWork[]): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    // Filter out existing works
    const categoryId = context.categoryCache.get(works[0]?.category) || 0;
    const newWorks = works.filter(work => {
      const workKey = `${work.title}::${categoryId}`;
      return !context.existingWorks.has(workKey);
    });
    
    skipped = works.length - newWorks.length;
    console.log(`Importing ${newWorks.length} new works, skipping ${skipped} existing works`);
    
    if (newWorks.length === 0) {
      return { imported: 0, skipped, errors };
    }
    
    // Prepare work data
    const workData: WorkData[] = newWorks.map(work => ({
      title: work.title.trim(),
      title_link: work.titleLink,
      composition_year: work.compositionYear,
      key_signature: work.key,
      form_or_genre: work.form,
      comments: work.notes,
      category_id: categoryId
    }));
    
    try {
      // Create works in batches of 50
      const batchSize = 50;
      const createdWorks: { id: number; title: string }[] = [];
      
      for (let i = 0; i < workData.length; i += batchSize) {
        const batch = workData.slice(i, i + batchSize);
        const { data: batchCreated, error } = await supabase
          .from('work')
          .insert(batch)
          .select('id, title');
        
        if (error) {
          console.error('Error creating works batch:', error);
          errors.push(`Batch ${i}: ${error.message}`);
          continue;
        }
        
        if (batchCreated) {
          createdWorks.push(...batchCreated);
        }
      }
      
      imported = createdWorks.length;
      console.log(`Created ${imported} works`);
      
      // Create contributors and publications in parallel
      await Promise.all([
        this.batchCreateContributors(context, newWorks, createdWorks),
        this.batchCreatePublications(newWorks, createdWorks)
      ]);
      
    } catch (error) {
      console.error('Error in batch import:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }
    
    return { imported, skipped, errors };
  },

  async batchCreateContributors(
    context: BatchImportContext, 
    works: ParsedWork[], 
    createdWorks: { id: number; title: string }[]
  ): Promise<void> {
    const contributors: ContributorData[] = [];
    
    createdWorks.forEach((createdWork, index) => {
      const originalWork = works[index];
      
      // Add composer
      if (originalWork.composer) {
        const personId = context.personCache.get(originalWork.composer);
        if (personId) {
          contributors.push({
            work_id: createdWork.id,
            person_id: personId,
            role: 'composer',
            link: originalWork.composerLink
          });
        }
      }
      
      // Add lyricist
      if (originalWork.lyricist) {
        const personId = context.personCache.get(originalWork.lyricist);
        if (personId) {
          contributors.push({
            work_id: createdWork.id,
            person_id: personId,
            role: 'lyricist',
            link: originalWork.lyricistLink
          });
        }
      }
    });
    
    if (contributors.length === 0) return;
    
    console.log(`Creating ${contributors.length} contributor relationships`);
    
    // Insert contributors in batches of 100
    const batchSize = 100;
    for (let i = 0; i < contributors.length; i += batchSize) {
      const batch = contributors.slice(i, i + batchSize);
      await supabase.from('work_contributor').insert(batch);
    }
  },

  async batchCreatePublications(
    works: ParsedWork[], 
    createdWorks: { id: number; title: string }[]
  ): Promise<void> {
    const publications: PublicationData[] = [];
    
    createdWorks.forEach((createdWork, index) => {
      const originalWork = works[index];
      if (originalWork.publisher) {
        publications.push({
          work_id: createdWork.id,
          publisher_name: originalWork.publisher
        });
      }
    });
    
    if (publications.length === 0) return;
    
    console.log(`Creating ${publications.length} publications`);
    
    // Insert publications in batches of 100
    const batchSize = 100;
    for (let i = 0; i < publications.length; i += batchSize) {
      const batch = publications.slice(i, i + batchSize);
      await supabase.from('publication').insert(batch);
    }
  },

  extractLifespan(text: string): { birthYear?: number; deathYear?: number } | null {
    if (!text || text.trim() === '') return null;
    
    const match = text.match(/(\d{4})\s*-\s*(\d{4})/);
    if (match) {
      return {
        birthYear: parseInt(match[1]),
        deathYear: parseInt(match[2])
      };
    }
    
    const birthMatch = text.match(/(\d{4})\s*-\s*$/);
    if (birthMatch) {
      return {
        birthYear: parseInt(birthMatch[1])
      };
    }
    
    return null;
  }
};
