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

jest.mock("../kube-object");
jest.mock("../kube-api");
jest.mock("../api-manager", () => ({
  apiManager() {
    return {
      registerStore: jest.fn(),
    };
  }
}));

import { IKubeApiParsed, parseKubeApi } from "../kube-api-parse";

/**
 * [<input-url>, <expected-result>]
 */
type KubeApiParseTestData = [string, Required<IKubeApiParsed>];

const tests: KubeApiParseTestData[] = [
  ["/apis/apiextensions.k8s.io/v1beta1/customresourcedefinitions/prometheuses.monitoring.coreos.com", {
    apiBase: "/apis/apiextensions.k8s.io/v1beta1/customresourcedefinitions",
    apiPrefix: "/apis",
    apiGroup: "apiextensions.k8s.io",
    apiVersion: "v1beta1",
    apiVersionWithGroup: "apiextensions.k8s.io/v1beta1",
    namespace: undefined,
    resource: "customresourcedefinitions",
    name: "prometheuses.monitoring.coreos.com"
  }],
  ["/api/v1/namespaces/kube-system/pods/coredns-6955765f44-v8p27", {
    apiBase: "/api/v1/pods",
    apiPrefix: "/api",
    apiGroup: "",
    apiVersion: "v1",
    apiVersionWithGroup: "v1",
    namespace: "kube-system",
    resource: "pods",
    name: "coredns-6955765f44-v8p27"
  }],
  ["/apis/stable.example.com/foo1/crontabs", {
    apiBase: "/apis/stable.example.com/foo1/crontabs",
    apiPrefix: "/apis",
    apiGroup: "stable.example.com",
    apiVersion: "foo1",
    apiVersionWithGroup: "stable.example.com/foo1",
    resource: "crontabs",
    name: undefined,
    namespace: undefined,
  }],
  ["/apis/cluster.k8s.io/v1alpha1/clusters", {
    apiBase: "/apis/cluster.k8s.io/v1alpha1/clusters",
    apiPrefix: "/apis",
    apiGroup: "cluster.k8s.io",
    apiVersion: "v1alpha1",
    apiVersionWithGroup: "cluster.k8s.io/v1alpha1",
    resource: "clusters",
    name: undefined,
    namespace: undefined,
  }],
  ["/api/v1/namespaces", {
    apiBase: "/api/v1/namespaces",
    apiPrefix: "/api",
    apiGroup: "",
    apiVersion: "v1",
    apiVersionWithGroup: "v1",
    resource: "namespaces",
    name: undefined,
    namespace: undefined,
  }],
  ["/api/v1/secrets", {
    apiBase: "/api/v1/secrets",
    apiPrefix: "/api",
    apiGroup: "",
    apiVersion: "v1",
    apiVersionWithGroup: "v1",
    resource: "secrets",
    name: undefined,
    namespace: undefined,
  }],
  ["/api/v1/nodes/minikube", {
    apiBase: "/api/v1/nodes",
    apiPrefix: "/api",
    apiGroup: "",
    apiVersion: "v1",
    apiVersionWithGroup: "v1",
    resource: "nodes",
    name: "minikube",
    namespace: undefined,
  }],
  ["/api/foo-bar/nodes/minikube", {
    apiBase: "/api/foo-bar/nodes",
    apiPrefix: "/api",
    apiGroup: "",
    apiVersion: "foo-bar",
    apiVersionWithGroup: "foo-bar",
    resource: "nodes",
    name: "minikube",
    namespace: undefined,
  }],
  ["/api/v1/namespaces/kube-public", {
    apiBase: "/api/v1/namespaces",
    apiPrefix: "/api",
    apiGroup: "",
    apiVersion: "v1",
    apiVersionWithGroup: "v1",
    resource: "namespaces",
    name: "kube-public",
    namespace: undefined,
  }],
];

describe("parseApi unit tests", () => {
  it.each(tests)("testing %s", (url, expected) => {
    expect(parseKubeApi(url)).toStrictEqual(expected);
  });
});
