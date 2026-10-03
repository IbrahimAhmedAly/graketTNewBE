import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LicenseRequestDto } from './dto';
import { ProtectedContentService } from './protected-content.service';

@Controller('protected-content')
@UseGuards(JwtAuthGuard)
export class ProtectedContentController {
  constructor(
    private readonly protectedContentService: ProtectedContentService,
  ) {}

  /**
   * Key for a protected video or PDF, for the desktop player
   * POST /protected-content/:contentId/license
   */
  @Post(':contentId/license')
  @HttpCode(HttpStatus.OK)
  async issueLicense(
    @Request() req: { user: { id: string } },
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() dto: LicenseRequestDto,
  ) {
    return this.protectedContentService.issueLicense(
      req.user.id,
      contentId,
      dto,
    );
  }
}
