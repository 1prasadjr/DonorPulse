import { request } from "./httpClient";

export function uploadAndPredict(file, topN = 25) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("topN", String(topN));

  return request("/predictions/upload", {
    method: "POST",
    body: formData,
  });
}
