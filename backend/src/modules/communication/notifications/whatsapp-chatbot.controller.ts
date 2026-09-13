import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WhatsappChatbotService } from './whatsapp-chatbot.service';

@Controller('whatsapp-bot')
export class WhatsappChatbotController {
  constructor(private readonly chatbotService: WhatsappChatbotService) {}

  /**
   * Health status endpoint WhatsApp Chatbot Service
   */
  @Get('status')
  getStatus() {
    return this.chatbotService.getStatus();
  }

  /**
   * Webhook pesan masuk dari WhatsApp Gateway (+62 882-9373-3330)
   * Mendukung payload standar: { from: string, message: string, name?: string }
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body()
    body: {
      from: string;
      message: string;
      name?: string;
      timestamp?: number;
    },
  ) {
    if (!body || !body.from || body.message === undefined) {
      return {
        status: 'IGNORED',
        message: 'Payload tidak lengkap (membutuhkan "from" dan "message")',
      };
    }

    const result = await this.chatbotService.handleIncomingMessage({
      from: body.from,
      message: body.message,
      name: body.name,
      timestamp: body.timestamp,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Endpoint Sandbox Testing Simulator WhatsApp Chatbot
   * Memudahkan Superadmin / Tim IT menguji alur percakapan izin wali murid tanpa harus menunggu kiriman fisik
   */
  @Post('test-simulate')
  @HttpCode(HttpStatus.OK)
  async testSimulate(
    @Body()
    body: {
      phone?: string;
      message: string;
      name?: string;
    },
  ) {
    const testPhone = body.phone || '088293733330';
    const message = body.message || 'IZIN';

    const result = await this.chatbotService.handleIncomingMessage({
      from: testPhone,
      message,
      name: body.name || 'Wali Murid Test',
    });

    return {
      success: true,
      simulation: {
        sentFrom: testPhone,
        inputMessage: message,
        botReply: result.replyMessage,
        status: result.status,
        createdIzin: result.createdIzin || null,
      },
    };
  }
}
