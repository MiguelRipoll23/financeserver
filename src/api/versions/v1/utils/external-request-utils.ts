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
    if (typeof requestInit.body === "string") {
      externalRequestLogMetadata.body = requestInit.body;
    } else if (requestInit.body instanceof FormData) {
      externalRequestLogMetadata.body = "[FormData body omitted]"; // Or attempt to serialize if small
    } else if (requestInit.body instanceof URLSearchParams) {
      externalRequestLogMetadata.body = requestInit.body.toString();
    } else {
      externalRequestLogMetadata.body = `[${requestInit.body.constructor.name} body omitted]`;
    }
  }
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
