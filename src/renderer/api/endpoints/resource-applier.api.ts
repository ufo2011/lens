/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import jsYaml from "js-yaml";
import { KubeObject } from "../kube-object";
import type { KubeJsonApiData } from "../kube-json-api";
import { apiBase } from "../index";
import { apiManager } from "../api-manager";

export const resourceApplierApi = {
  annotations: [
    "kubectl.kubernetes.io/last-applied-configuration"
  ],

  async update<D extends KubeObject>(resource: object | string): Promise<D> {
    if (typeof resource === "string") {
      resource = jsYaml.safeLoad(resource);
    }

    return apiBase
      .post<KubeJsonApiData[]>("/stack", { data: resource })
      .then(data => {
        const items = data.map(obj => {
          const api = apiManager.getApiByKind(obj.kind, obj.apiVersion);

          if (api) {
            return new api.objectConstructor(obj);
          } else {
            return new KubeObject(obj);
          }
        });

        return items.length === 1 ? items[0] : items;
      });
  }
};
