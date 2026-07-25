import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminEducationService } from './admin-education.service';
import {
  CreateEducationLevelDto,
  UpdateEducationLevelDto,
  QueryEducationLevelDto,
  CreateGradeDto,
  UpdateGradeDto,
  QueryGradeDto,
} from './dto';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class AdminEducationController {
  constructor(private readonly service: AdminEducationService) {}

  // ============================================
  // EDUCATION LEVELS — /admin/education-levels
  // ============================================

  @Post('education-levels')
  @HttpCode(HttpStatus.CREATED)
  createLevel(@Body() dto: CreateEducationLevelDto) {
    return this.service.createLevel(dto);
  }

  @Get('education-levels')
  findAllLevels(@Query() query: QueryEducationLevelDto) {
    return this.service.findAllLevels(query);
  }

  @Get('education-levels/:id')
  findLevelById(@Param('id') id: string) {
    return this.service.findLevelById(id);
  }

  @Patch('education-levels/:id')
  updateLevel(@Param('id') id: string, @Body() dto: UpdateEducationLevelDto) {
    return this.service.updateLevel(id, dto);
  }

  @Delete('education-levels/:id')
  @HttpCode(HttpStatus.OK)
  removeLevel(@Param('id') id: string) {
    return this.service.removeLevel(id);
  }

  // ============================================
  // GRADES — /admin/grades
  // ============================================

  @Post('grades')
  @HttpCode(HttpStatus.CREATED)
  createGrade(@Body() dto: CreateGradeDto) {
    return this.service.createGrade(dto);
  }

  @Get('grades')
  findAllGrades(@Query() query: QueryGradeDto) {
    return this.service.findAllGrades(query);
  }

  @Get('grades/:id')
  findGradeById(@Param('id') id: string) {
    return this.service.findGradeById(id);
  }

  @Patch('grades/:id')
  updateGrade(@Param('id') id: string, @Body() dto: UpdateGradeDto) {
    return this.service.updateGrade(id, dto);
  }

  @Delete('grades/:id')
  @HttpCode(HttpStatus.OK)
  removeGrade(@Param('id') id: string) {
    return this.service.removeGrade(id);
  }
}
