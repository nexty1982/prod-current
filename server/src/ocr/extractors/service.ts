/**
 * Service layer for OCR Extractor business logic
 */

import { ExtractorRepo } from './repo.js';
import type {
  OcrExtractor,
  OcrExtractorWithFields,
  CreateExtractorInput,
  UpdateExtractorInput
} from './types.js';

export class ExtractorService {
  constructor(private readonly repo = new ExtractorRepo()) {}

  async list(): Promise<OcrExtractor[]> {
    return this.repo.list();
  }

  async getById(id: number): Promise<OcrExtractor | null> {
    return this.repo.getById(id);
  }

  async getWithFields(id: number): Promise<OcrExtractorWithFields | null> {
    return this.repo.getWithFields(id);
  }

  async create(input: CreateExtractorInput): Promise<OcrExtractor> {
    // Validate key uniqueness within extractor
    if (input.fields) {
      const keys = new Set<string>();
      const checkKeys = (fields: CreateExtractorInput['fields']) => {
        if (!fields) return;
        for (const field of fields) {
          if (keys.has(field.key)) {
            throw new Error(`Duplicate field key: ${field.key}`);
          }
          keys.add(field.key);
          if (field.children) {
            checkKeys(field.children);
          }
        }
      };
      checkKeys(input.fields);
    }

    return this.repo.create(input);
  }

  async update(id: number, input: UpdateExtractorInput): Promise<OcrExtractor | null> {
    // Check if extractor exists
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new Error(`Extractor ${id} not found`);
    }

    // Validate key uniqueness if fields provided
    if (input.fields) {
      const keys = new Set<string>();
      const checkKeys = (fields: CreateExtractorInput['fields']) => {
        if (!fields) return;
        for (const field of fields) {
          if (keys.has(field.key)) {
            throw new Error(`Duplicate field key: ${field.key}`);
          }
          keys.add(field.key);
          if (field.children) {
            checkKeys(field.children);
          }
        }
      };
      checkKeys(input.fields);
    }

    return this.repo.update(id, input);
  }

  async delete(id: number): Promise<boolean> {
    const existing = await this.repo.getById(id);
    if (!existing) {
      throw new Error(`Extractor ${id} not found`);
    }
    return this.repo.delete(id);
  }
}

