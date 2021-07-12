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

import type { KubeObjectStore } from "../kube-object.store";

import { action, observable, makeObservable } from "mobx";
import { autoBind } from "../utils";
import { KubeApi, parseKubeApi } from "./kube-api";

export class ApiManager {
  private apis = observable.map<string, KubeApi>();
  private stores = observable.map<string, KubeObjectStore>();

  constructor() {
    makeObservable(this);
    autoBind(this);
  }

  getApi(pathOrCallback: string | ((api: KubeApi) => boolean)) {
    if (typeof pathOrCallback === "string") {
      return this.apis.get(pathOrCallback) || this.apis.get(parseKubeApi(pathOrCallback).apiBase);
    }

    return Array.from(this.apis.values()).find(pathOrCallback ?? (() => true));
  }

  getApiByKind(kind: string, apiVersion: string) {
    return Array.from(this.apis.values()).find((api) => api.kind === kind && api.apiVersionWithGroup === apiVersion);
  }

  registerApi(apiBase: string, api: KubeApi) {
    if (!this.apis.has(apiBase)) {
      this.stores.forEach((store) => {
        if(store.api === api) {
          this.stores.set(apiBase, store);
        }
      });

      this.apis.set(apiBase, api);
    }
  }

  protected resolveApi(api: string | KubeApi): KubeApi {
    if (typeof api === "string") return this.getApi(api);

    return api;
  }

  unregisterApi(api: string | KubeApi) {
    if (typeof api === "string") this.apis.delete(api);
    else {
      const apis = Array.from(this.apis.entries());
      const entry = apis.find(entry => entry[1] === api);

      if (entry) this.unregisterApi(entry[0]);
    }
  }

  @action
  registerStore(store: KubeObjectStore, apis: KubeApi[] = [store.api]) {
    apis.forEach(api => {
      this.stores.set(api.apiBase, store);
    });
  }

  getStore<S extends KubeObjectStore>(api: string | KubeApi): S {
    return this.stores.get(this.resolveApi(api)?.apiBase) as S;
  }
}

export const apiManager = new ApiManager();
