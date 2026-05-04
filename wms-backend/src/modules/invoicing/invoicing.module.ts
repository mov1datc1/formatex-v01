import { Module } from '@nestjs/common';
import { InvoicingController } from './invoicing.controller';
import { InvoicingService } from './invoicing.service';
import { CreditService } from './credit.service';
import { CommissionsService } from './commissions.service';

@Module({
  controllers: [InvoicingController],
  providers: [InvoicingService, CreditService, CommissionsService],
  exports: [InvoicingService, CreditService, CommissionsService],
})
export class InvoicingModule {}
