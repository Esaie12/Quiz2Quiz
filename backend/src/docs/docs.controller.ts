import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { openApiDocument } from './openapi';

@Controller('docs')
export class DocsController {
  @Get('json')
  json() {
    return openApiDocument;
  }

  @Get()
  html(@Res() res: Response) {
    res.type('html').send(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Quiz Battle API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: '/api/docs/json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout'
      });
    </script>
  </body>
</html>`);
  }
}
