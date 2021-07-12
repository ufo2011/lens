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

import type { KubeConfig } from "@kubernetes/client-node";
import type { Cluster } from "./cluster";
import type { ContextHandler } from "./context-handler";
import { app } from "electron";
import path from "path";
import fs from "fs-extra";
import { dumpConfigYaml } from "../common/kube-helpers";
import logger from "./logger";
import { LensProxy } from "./proxy/lens-proxy";

export class KubeconfigManager {
  protected configDir = app.getPath("temp");
  protected tempFile: string = null;

  constructor(protected cluster: Cluster, protected contextHandler: ContextHandler) { }

  async getPath(): Promise<string> {
    if (this.tempFile === undefined) {
      throw new Error("kubeconfig is already unlinked");
    }

    if (!this.tempFile) {
      await this.init();
    }

    // create proxy kubeconfig if it is removed without unlink called
    if (!(await fs.pathExists(this.tempFile))) {
      try {
        this.tempFile = await this.createProxyKubeconfig();
      } catch (err) {
        logger.error(`Failed to created temp config for auth-proxy`, { err });
      }
    }

    return this.tempFile;
  }

  async unlink() {
    if (!this.tempFile) {
      return;
    }

    logger.info(`Deleting temporary kubeconfig: ${this.tempFile}`);
    await fs.unlink(this.tempFile);
    this.tempFile = undefined;
  }

  protected async init() {
    try {
      await this.contextHandler.ensureServer();
      this.tempFile = await this.createProxyKubeconfig();
    } catch (err) {
      console.log(err);
      logger.error(`Failed to created temp config for auth-proxy`, { err });
    }
  }

  get resolveProxyUrl() {
    return `http://127.0.0.1:${LensProxy.getInstance().port}/${this.cluster.id}`;
  }

  /**
   * Creates new "temporary" kubeconfig that point to the kubectl-proxy.
   * This way any user of the config does not need to know anything about the auth etc. details.
   */
  protected async createProxyKubeconfig(): Promise<string> {
    const { configDir, cluster } = this;
    const { contextName, id } = cluster;
    const tempFile = path.join(configDir, `kubeconfig-${id}`);
    const kubeConfig = await cluster.getKubeconfig();
    const proxyConfig: Partial<KubeConfig> = {
      currentContext: contextName,
      clusters: [
        {
          name: contextName,
          server: this.resolveProxyUrl,
          skipTLSVerify: undefined,
        }
      ],
      users: [
        { name: "proxy" },
      ],
      contexts: [
        {
          user: "proxy",
          name: contextName,
          cluster: contextName,
          namespace: kubeConfig.getContextObject(contextName).namespace,
        }
      ]
    };
    // write
    const configYaml = dumpConfigYaml(proxyConfig);

    await fs.ensureDir(path.dirname(tempFile));
    await fs.writeFile(tempFile, configYaml, { mode: 0o600 });
    logger.debug(`Created temp kubeconfig "${contextName}" at "${tempFile}": \n${configYaml}`);

    return tempFile;
  }
}
