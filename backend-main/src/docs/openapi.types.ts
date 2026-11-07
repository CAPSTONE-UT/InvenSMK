export interface OpenApiSchema {
  type?: string;
  format?: string;
  description?: string;
  enum?: readonly string[] | readonly boolean[];
  nullable?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  default?: unknown;
  additionalProperties?: boolean;
  required?: readonly string[];
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  oneOf?: readonly OpenApiSchema[];
  $ref?: string;
  example?: unknown;
}

export interface OpenApiContent {
  schema: OpenApiSchema;
  example?: unknown;
}

export interface OpenApiResponse {
  description: string;
  content?: Record<string, OpenApiContent>;
}

export interface OpenApiParameter {
  name: string;
  in: "path" | "query";
  required: boolean;
  description?: string;
  schema: OpenApiSchema;
}

export interface OpenApiOperation {
  tags?: readonly string[];
  summary: string;
  description?: string;
  parameters?: readonly OpenApiParameter[];
  requestBody?: {
    required: boolean;
    content: Record<string, OpenApiContent>;
  };
  security?: readonly Record<string, readonly string[]>[];
  responses: Record<string, OpenApiResponse>;
}

export const httpMethods = ["get", "post", "put", "delete"] as const;
export type HttpMethod = (typeof httpMethods)[number];

export type OpenApiPathItem = Partial<Record<HttpMethod, OpenApiOperation>>;

export interface OpenApiDocument {
  openapi: "3.0.3";
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: readonly { url: string; description: string }[];
  tags?: readonly { name: string; description: string }[];
  paths: Record<string, OpenApiPathItem>;
  components: {
    securitySchemes: Record<string, OpenApiSchema & { scheme: string; bearerFormat?: string }>;
    schemas: Record<string, OpenApiSchema>;
    responses: Record<string, OpenApiResponse>;
  };
}
