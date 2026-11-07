import { Router } from "express";
import swaggerUi from "swagger-ui-express";

import { openapiDocument } from "../docs/openapi.js";

export function shouldExposeDocs(nodeEnvironment: string): boolean {
  return nodeEnvironment === "development";
}

export const docsRouter: Router = Router();

docsRouter.get("/openapi.json", (_request, response) => {
  response.json(openapiDocument);
});

docsRouter.use("/", swaggerUi.serve);
docsRouter.get("/", swaggerUi.setup(openapiDocument, { explorer: true }));
