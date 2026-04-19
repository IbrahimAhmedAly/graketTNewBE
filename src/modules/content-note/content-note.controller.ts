import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ContentNoteService } from './content-note.service';
import { UpsertNoteDto } from './dto/upsert-note.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ContentNoteController {
  constructor(private readonly service: ContentNoteService) {}

  /** GET /notes/content/:contentId — fetch the user's note for one content */
  @Get('notes/content/:contentId')
  get(
    @Request() req: { user: { id: string } },
    @Param('contentId') contentId: string,
  ) {
    return this.service.get(req.user.id, contentId);
  }

  /** PUT /notes/content/:contentId — create or update note body */
  @Put('notes/content/:contentId')
  upsert(
    @Request() req: { user: { id: string } },
    @Param('contentId') contentId: string,
    @Body() dto: UpsertNoteDto,
  ) {
    return this.service.upsert(req.user.id, contentId, dto);
  }

  /** DELETE /notes/content/:contentId — remove the note */
  @Delete('notes/content/:contentId')
  remove(
    @Request() req: { user: { id: string } },
    @Param('contentId') contentId: string,
  ) {
    return this.service.remove(req.user.id, contentId);
  }

  /** GET /notes/course/:courseId — list all notes for a course */
  @Get('notes/course/:courseId')
  listForCourse(
    @Request() req: { user: { id: string } },
    @Param('courseId') courseId: string,
  ) {
    return this.service.listForCourse(req.user.id, courseId);
  }
}
