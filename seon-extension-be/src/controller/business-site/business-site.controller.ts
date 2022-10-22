import { Body, Controller, Get, Header, Post, StreamableFile } from "@nestjs/common";

@Controller()
export class BusinessSiteController {
  @Post("/test-case")
  async handlePostEvents(@Body() form: any){
  }
}
