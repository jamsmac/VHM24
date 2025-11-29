import { Controller, Get, Post, Query, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { OperatorRatingsService } from './operator-ratings.service';
import { RatingFiltersDto } from './dto/rating-filters.dto';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '@modules/auth/decorators/roles.decorator';
import { UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Operator Ratings')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('operator-ratings')
export class OperatorRatingsController {
  constructor(private readonly ratingsService: OperatorRatingsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить рейтинги всех операторов' })
  @ApiResponse({
    status: 200,
    description: 'Список рейтингов операторов',
  })
  async getAllRatings(@Query() filters: RatingFiltersDto) {
    const { startDate, endDate } = this.getDateRange(filters);
    return await this.ratingsService.getAllRatings(startDate, endDate);
  }

  @Get('operator/:operatorId')
  @ApiOperation({ summary: 'Получить рейтинг конкретного оператора' })
  @ApiParam({ name: 'operatorId', description: 'UUID оператора' })
  @ApiResponse({
    status: 200,
    description: 'Рейтинг оператора за период',
  })
  async getOperatorRating(
    @Param('operatorId', ParseUUIDPipe) operatorId: string,
    @Query() filters: RatingFiltersDto,
  ) {
    const { startDate, endDate } = this.getDateRange(filters);
    return await this.ratingsService.getOperatorRating(operatorId, startDate, endDate);
  }

  @Get('operator/:operatorId/history')
  @ApiOperation({ summary: 'Получить историю рейтингов оператора' })
  @ApiParam({ name: 'operatorId', description: 'UUID оператора' })
  @ApiResponse({
    status: 200,
    description: 'История рейтингов оператора',
  })
  async getOperatorHistory(@Param('operatorId', ParseUUIDPipe) operatorId: string) {
    return await this.ratingsService.getOperatorHistory(operatorId);
  }

  @Post('calculate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Пересчитать рейтинги за период (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Рейтинги пересчитаны',
  })
  async recalculateRatings(@Query() filters: RatingFiltersDto) {
    const { startDate, endDate } = this.getDateRange(filters);
    return await this.ratingsService.calculateRatingsForPeriod(startDate, endDate);
  }

  /**
   * Get date range from filters or default to previous month
   */
  private getDateRange(filters: RatingFiltersDto): {
    startDate: Date;
    endDate: Date;
  } {
    let startDate: Date;
    let endDate: Date;

    if (filters.start_date && filters.end_date) {
      startDate = new Date(filters.start_date);
      endDate = new Date(filters.end_date);
    } else {
      // Default: previous month (ratings are calculated for completed periods)
      const now = new Date();
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
    }

    return { startDate, endDate };
  }
}
