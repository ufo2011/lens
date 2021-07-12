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
import packageInfo from "../package.json";
import fs from "fs";
import request from "request";
import md5File from "md5-file";
import requestPromise from "request-promise-native";
import { ensureDir, pathExists } from "fs-extra";
import path from "path";
import { noop } from "../src/common/utils";

class KubectlDownloader {
  public kubectlVersion: string;
  protected url: string;
  protected path: string;
  protected dirname: string;

  constructor(clusterVersion: string, platform: string, arch: string, target: string) {
    this.kubectlVersion = clusterVersion;
    const binaryName = platform === "windows" ? "kubectl.exe" : "kubectl";

    this.url = `https://storage.googleapis.com/kubernetes-release/release/v${this.kubectlVersion}/bin/${platform}/${arch}/${binaryName}`;
    this.dirname = path.dirname(target);
    this.path = target;
  }

  protected async urlEtag() {
    const response = await requestPromise({
      method: "HEAD",
      uri: this.url,
      resolveWithFullResponse: true
    }).catch(console.error);

    if (response.headers["etag"]) {
      return response.headers["etag"].replace(/"/g, "");
    }

    return "";
  }

  public async checkBinary() {
    const exists = await pathExists(this.path);

    if (exists) {
      const hash = md5File.sync(this.path);
      const etag = await this.urlEtag();

      if (hash == etag) {
        console.log("Kubectl md5sum matches the remote etag");

        return true;
      }

      console.log(`Kubectl md5sum ${hash} does not match the remote etag ${etag}, unlinking and downloading again`);
      await fs.promises.unlink(this.path);
    }

    return false;
  }

  public async downloadKubectl() {
    if (await this.checkBinary()) {
      return console.log("Already exists and is valid");
    }

    await ensureDir(path.dirname(this.path), 0o755);

    const file = fs.createWriteStream(this.path);

    console.log(`Downloading kubectl ${this.kubectlVersion} from ${this.url} to ${this.path}`);
    const requestOpts: request.UriOptions & request.CoreOptions = {
      uri: this.url,
      gzip: true
    };
    const stream = request(requestOpts);

    stream.on("complete", () => {
      console.log("kubectl binary download finished");
      file.end(noop);
    });

    stream.on("error", (error) => {
      console.log(error);
      fs.unlink(this.path, noop);
      throw error;
    });

    return new Promise<void>((resolve, reject) => {
      file.on("close", () => {
        console.log("kubectl binary download closed");
        fs.chmod(this.path, 0o755, (err) => {
          if (err) reject(err);
        });
        resolve();
      });
      stream.pipe(file);
    });
  }
}

const downloadVersion = packageInfo.config.bundledKubectlVersion;
const baseDir = path.join(process.env.INIT_CWD, "binaries", "client");
const downloads = [
  { platform: "linux", arch: "amd64", target: path.join(baseDir, "linux", "x64", "kubectl") },
  { platform: "darwin", arch: "amd64", target: path.join(baseDir, "darwin", "x64", "kubectl") },
  { platform: "windows", arch: "amd64", target: path.join(baseDir, "windows", "x64", "kubectl.exe") },
  { platform: "windows", arch: "386", target: path.join(baseDir, "windows", "ia32", "kubectl.exe") }
];

downloads.forEach((dlOpts) => {
  console.log(dlOpts);
  const downloader = new KubectlDownloader(downloadVersion, dlOpts.platform, dlOpts.arch, dlOpts.target);

  console.log(`Downloading: ${JSON.stringify(dlOpts)}`);
  downloader.downloadKubectl().then(() => downloader.checkBinary().then(() => console.log("Download complete")));
});
