import { request } from "./httpClient";

export function getModelMetadata() {
  return request("/model/metadata");
}
