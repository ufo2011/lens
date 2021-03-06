import yaml from "js-yaml";
import { readFile } from "fs-extra";
import { promiseExec } from "../promise-exec";
import { helmCli } from "./helm-cli";
import { Singleton } from "../../common/utils/singleton";
import { customRequestPromise } from "../../common/request";
import orderBy from "lodash/orderBy";
import logger from "../logger";

export type HelmEnv = Record<string, string> & {
  HELM_REPOSITORY_CACHE?: string;
  HELM_REPOSITORY_CONFIG?: string;
};

export interface HelmRepoConfig {
  repositories: HelmRepo[]
}

export interface HelmRepo {
  name: string;
  url: string;
  cacheFilePath?: string
  caFile?: string,
  certFile?: string,
  insecureSkipTlsVerify?: boolean,
  keyFile?: string,
  username?: string,
  password?: string,
}

export class HelmRepoManager extends Singleton {
  static cache = {}; // todo: remove implicit updates in helm-chart-manager.ts

  protected repos: HelmRepo[];
  protected helmEnv: HelmEnv;
  protected initialized: boolean;

  public static async loadAvailableRepos(): Promise<HelmRepo[]> {
    const res = await customRequestPromise({
      uri: "https://github.com/lensapp/artifact-hub-repositories/releases/download/latest/repositories.json",
      json: true,
      resolveWithFullResponse: true,
      timeout: 10000,
    });

    return orderBy<HelmRepo>(res.body, repo => repo.name);
  }

  private async init() {
    helmCli.setLogger(logger);
    await helmCli.ensureBinary();

    if (!this.initialized) {
      this.helmEnv = await HelmRepoManager.parseHelmEnv();
      await HelmRepoManager.update();
      this.initialized = true;
    }
  }

  protected static async parseHelmEnv() {
    const helm = await helmCli.binaryPath();
    const { stdout } = await promiseExec(`"${helm}" env`).catch((error) => {
      throw(error.stderr);
    });
    const lines = stdout.split(/\r?\n/); // split by new line feed
    const env: HelmEnv = {};

    lines.forEach((line: string) => {
      const [key, value] = line.split("=");

      if (key && value) {
        env[key] = value.replace(/"/g, ""); // strip quotas
      }
    });

    return env;
  }

  public async repositories(): Promise<HelmRepo[]> {
    try {
      if (!this.initialized) {
        await this.init();
      }

      const repoConfigFile = this.helmEnv.HELM_REPOSITORY_CONFIG;
      const { repositories }: HelmRepoConfig = await readFile(repoConfigFile, "utf8")
        .then((yamlContent: string) => yaml.safeLoad(yamlContent))
        .catch(() => ({
          repositories: []
        }));

      if (!repositories.length) {
        await HelmRepoManager.addRepo({ name: "bitnami", url: "https://charts.bitnami.com/bitnami" });

        return await this.repositories();
      }

      return repositories.map(repo => ({
        ...repo,
        cacheFilePath: `${this.helmEnv.HELM_REPOSITORY_CACHE}/${repo.name}-index.yaml`
      }));
    } catch (error) {
      logger.error(`[HELM]: repositories listing error "${error}"`);

      return [];
    }
  }

  public static async update() {
    const helm = await helmCli.binaryPath();
    const { stdout } = await promiseExec(`"${helm}" repo update`).catch((error) => {
      return { stdout: error.stdout };
    });

    return stdout;
  }

  public static async addRepo({ name, url }: HelmRepo) {
    logger.info(`[HELM]: adding repo "${name}" from ${url}`);
    const helm = await helmCli.binaryPath();
    const { stdout } = await promiseExec(`"${helm}" repo add ${name} ${url}`).catch((error) => {
      throw(error.stderr);
    });

    return stdout;
  }

  public static async addСustomRepo(repoAttributes : HelmRepo) {
    logger.info(`[HELM]: adding repo "${repoAttributes.name}" from ${repoAttributes.url}`);
    const helm = await helmCli.binaryPath();

    const insecureSkipTlsVerify = repoAttributes.insecureSkipTlsVerify ? " --insecure-skip-tls-verify" : "";
    const username = repoAttributes.username ? ` --username "${repoAttributes.username}"` : "";
    const password = repoAttributes.password ? ` --password "${repoAttributes.password}"` : "";
    const caFile = repoAttributes.caFile ? ` --ca-file "${repoAttributes.caFile}"` : "";
    const keyFile = repoAttributes.keyFile ? ` --key-file "${repoAttributes.keyFile}"` : "";
    const certFile = repoAttributes.certFile ? ` --cert-file "${repoAttributes.certFile}"` : "";

    const addRepoCommand = `"${helm}" repo add ${repoAttributes.name} ${repoAttributes.url}${insecureSkipTlsVerify}${username}${password}${caFile}${keyFile}${certFile}`;
    const { stdout } = await promiseExec(addRepoCommand).catch((error) => {
      throw(error.stderr);
    });

    return stdout;
  }

  public static async removeRepo({ name, url }: HelmRepo): Promise<string> {
    logger.info(`[HELM]: removing repo "${name}" from ${url}`);
    const helm = await helmCli.binaryPath();
    const { stdout } = await promiseExec(`"${helm}" repo remove ${name}`).catch((error) => {
      throw(error.stderr);
    });

    return stdout;
  }
}
