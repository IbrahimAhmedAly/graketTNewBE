import { Module } from '@nestjs/common';
import { ContentNoteController } from './content-note.controller';
import { ContentNoteService } from './content-note.service';
import { ContentNoteRepository } from './repositories/content-note.repository';

@Module({
  controllers: [ContentNoteController],
  providers: [ContentNoteService, ContentNoteRepository],
})
export class ContentNoteModule {}
