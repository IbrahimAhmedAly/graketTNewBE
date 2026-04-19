import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentNoteRepository } from './repositories/content-note.repository';
import { UpsertNoteDto } from './dto/upsert-note.dto';

@Injectable()
export class ContentNoteService {
  constructor(private readonly repo: ContentNoteRepository) {}

  async get(userId: string, contentId: string) {
    const exists = await this.repo.contentExists(contentId);
    if (!exists) throw new NotFoundException('المحتوى غير موجود');
    const note = await this.repo.findByUserAndContent(userId, contentId);
    return {
      message: 'تم جلب الملاحظة',
      data: note ?? { contentId, body: null },
    };
  }

  async upsert(userId: string, contentId: string, dto: UpsertNoteDto) {
    const exists = await this.repo.contentExists(contentId);
    if (!exists) throw new NotFoundException('المحتوى غير موجود');
    const trimmed = dto.body.trim();
    if (trimmed.length === 0) {
      await this.repo.delete(userId, contentId);
      return {
        message: 'تم حذف الملاحظة',
        data: { contentId, body: null },
      };
    }
    const note = await this.repo.upsert(userId, contentId, trimmed);
    return {
      message: 'تم حفظ الملاحظة بنجاح',
      data: note,
    };
  }

  async remove(userId: string, contentId: string) {
    await this.repo.delete(userId, contentId);
    return { message: 'تم حذف الملاحظة' };
  }

  async listForCourse(userId: string, courseId: string) {
    const notes = await this.repo.findAllForCourse(userId, courseId);
    return {
      message: 'تم جلب الملاحظات بنجاح',
      data: notes,
    };
  }
}
