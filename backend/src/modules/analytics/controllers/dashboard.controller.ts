import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DashboardService } from '../services/dashboard.service';
import { CreateWidgetDto } from '../dto/create-widget.dto';

@ApiTags('analytics')
@Controller('analytics/dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('widgets')
  @ApiOperation({ summary: 'Get user dashboard widgets' })
  async getWidgets(@Request() req: any) {
    return this.dashboardService.getUserWidgets(req.user.userId);
  }

  @Post('widgets')
  @ApiOperation({ summary: 'Create dashboard widget' })
  async createWidget(@Request() req: any, @Body() dto: CreateWidgetDto) {
    return this.dashboardService.createWidget(req.user.userId, dto);
  }

  @Put('widgets/:id')
  @ApiOperation({ summary: 'Update dashboard widget' })
  async updateWidget(@Param('id') id: string, @Body() dto: Partial<CreateWidgetDto>) {
    return this.dashboardService.updateWidget(id, dto);
  }

  @Delete('widgets/:id')
  @ApiOperation({ summary: 'Delete dashboard widget' })
  async deleteWidget(@Param('id') id: string) {
    await this.dashboardService.deleteWidget(id);
    return { message: 'Widget deleted successfully' };
  }

  @Post('widgets/reorder')
  @ApiOperation({ summary: 'Reorder dashboard widgets' })
  async reorderWidgets(@Request() req: any, @Body() body: { widgetIds: string[] }) {
    await this.dashboardService.reorderWidgets(req.user.userId, body.widgetIds);
    return { message: 'Widgets reordered successfully' };
  }
}
