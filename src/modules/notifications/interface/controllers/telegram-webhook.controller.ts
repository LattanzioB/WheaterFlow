import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  ProcessTelegramWebhookService,
} from '../../application/services/process-telegram-webhook.service';
import type { TelegramWebhookUpdate } from '../../application/services/process-telegram-webhook.service';

@ApiExcludeController()
@Controller('notifications/telegram')
export class TelegramWebhookController {
  constructor(
    private readonly configService: ConfigService,
    private readonly processTelegramWebhookService: ProcessTelegramWebhookService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() update: TelegramWebhookUpdate,
    @Headers('x-telegram-bot-api-secret-token') secretToken?: string,
  ): Promise<{ ok: true }> {
    this.ensureSecretTokenIsValid(secretToken);
    await this.processTelegramWebhookService.execute(update);

    return { ok: true };
  }

  private ensureSecretTokenIsValid(secretToken?: string): void {
    const expectedSecret =
      this.configService.get<string>('telegram.webhookSecret')?.trim() ?? '';

    if (expectedSecret && secretToken !== expectedSecret) {
      throw new UnauthorizedException('Invalid Telegram webhook secret');
    }
  }
}
