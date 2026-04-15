import { Module } from '@nestjs/common';
import { SupplyPlanningController } from './supply-planning.controller';
import { SupplyPlanningService } from './supply-planning.service';

@Module({
  controllers: [SupplyPlanningController],
  providers: [SupplyPlanningService],
})
export class SupplyPlanningModule {}
