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

import { podsStore } from "../../+workloads-pods/pods.store";
import { Pod } from "../../../api/endpoints";
import { dockStore } from "../dock.store";
import { logTabStore } from "../log-tab.store";
import { deploymentPod1, deploymentPod2, deploymentPod3, dockerPod } from "./pod.mock";

jest.mock("electron", () => ({
  app: {
    getPath: () => "/foo",
  },
}));

podsStore.items.push(new Pod(dockerPod));
podsStore.items.push(new Pod(deploymentPod1));
podsStore.items.push(new Pod(deploymentPod2));

describe("log tab store", () => {
  afterEach(() => {
    logTabStore.reset();
    dockStore.reset();
  });

  it("creates log tab without sibling pods", () => {
    const selectedPod = new Pod(dockerPod);
    const selectedContainer = selectedPod.getAllContainers()[0];

    logTabStore.createPodTab({
      selectedPod,
      selectedContainer
    });

    expect(logTabStore.getData(dockStore.selectedTabId)).toEqual({
      pods: [selectedPod],
      selectedPod,
      selectedContainer,
      showTimestamps: false,
      previous: false
    });
  });

  it("creates log tab with sibling pods", () => {
    const selectedPod = new Pod(deploymentPod1);
    const siblingPod = new Pod(deploymentPod2);
    const selectedContainer = selectedPod.getInitContainers()[0];

    logTabStore.createPodTab({
      selectedPod,
      selectedContainer
    });

    expect(logTabStore.getData(dockStore.selectedTabId)).toEqual({
      pods: [selectedPod, siblingPod],
      selectedPod,
      selectedContainer,
      showTimestamps: false,
      previous: false
    });
  });

  it("removes item from pods list if pod deleted from store", () => {
    const selectedPod = new Pod(deploymentPod1);
    const selectedContainer = selectedPod.getInitContainers()[0];

    logTabStore.createPodTab({
      selectedPod,
      selectedContainer
    });

    podsStore.items.pop();

    expect(logTabStore.getData(dockStore.selectedTabId)).toEqual({
      pods: [selectedPod],
      selectedPod,
      selectedContainer,
      showTimestamps: false,
      previous: false
    });
  });

  it("adds item into pods list if new sibling pod added to store", () => {
    const selectedPod = new Pod(deploymentPod1);
    const selectedContainer = selectedPod.getInitContainers()[0];

    logTabStore.createPodTab({
      selectedPod,
      selectedContainer
    });

    podsStore.items.push(new Pod(deploymentPod3));

    expect(logTabStore.getData(dockStore.selectedTabId)).toEqual({
      pods: [selectedPod, deploymentPod3],
      selectedPod,
      selectedContainer,
      showTimestamps: false,
      previous: false
    });
  });

  // FIXME: this is failed when it's not .only == depends on something above
  it.only("closes tab if no pods left in store", () => {
    const selectedPod = new Pod(deploymentPod1);
    const selectedContainer = selectedPod.getInitContainers()[0];

    logTabStore.createPodTab({
      selectedPod,
      selectedContainer
    });

    podsStore.items.clear();

    expect(logTabStore.getData(dockStore.selectedTabId)).toBeUndefined();
    expect(dockStore.getTabById(dockStore.selectedTabId)).toBeUndefined();
  });
});
