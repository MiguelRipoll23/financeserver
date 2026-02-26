interface ExternalRequestLogMetadata {
  method: string;
  url: string;
  body?: string;
}

export async function fetchWithExternalRequestDebugLogging(
  url: string,
  requestInit: RequestInit = {},
): Promise<Response> {
  const method = requestInit.method ?? "GET";

  const externalRequestLogMetadata: ExternalRequestLogMetadata = {
    method,
    url,
  };

  if (requestInit.body) {
    externalRequestLogMetadata.body =
      typeof requestInit.body === "string"
        ? requestInit.body
        : "[non-string request body omitted]";
  }

  console.debug(
    `External request: ${JSON.stringify(externalRequestLogMetadata)}`,
  );

  const response = await fetch(url, requestInit);
  const responseBody = await response.clone().text();

  const externalResponseLogMetadata: {
    statusCode: number;
    body?: string;
  } = {
    statusCode: response.status,
  };

  if (responseBody) {
    externalResponseLogMetadata.body = responseBody;
  }

  console.debug(
    `External response: ${JSON.stringify(externalResponseLogMetadata)}`,
  );

  return response;
}
