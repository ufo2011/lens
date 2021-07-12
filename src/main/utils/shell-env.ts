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

import shellEnvironment from "shell-env";
import logger from "../logger";

export interface EnvironmentVariables {
  readonly [key: string]: string;
}

let shellSyncFailed = false;

/**
 * Attempts to get the shell environment per the user's existing startup scripts.
 * If the environment can't be retrieved after 5 seconds an error message is logged.
 * Subsequent calls after such a timeout simply log an error message without trying
 * to get the environment, unless forceRetry is true.
 * @param shell the shell to get the environment from
 * @param forceRetry if true will always try to get the environment, otherwise if
 * a previous call to this function failed then this call will fail too.
 * @returns object containing the shell's environment variables. An empty object is
 * returned if the call fails.
 */
export async function shellEnv(shell?: string, forceRetry = false) : Promise<EnvironmentVariables> {
  let envVars = {};

  if (forceRetry) {
    shellSyncFailed = false;
  }

  if (!shellSyncFailed) {
    try {
      envVars = await Promise.race([
        shellEnvironment(shell),
        new Promise((_resolve, reject) => setTimeout(() => {
          reject(new Error("Resolving shell environment is taking very long. Please review your shell configuration."));
        }, 30_000))
      ]);
    } catch (error) {
      logger.error(`shellEnv: ${error}`);
      shellSyncFailed = true;
    }
  } else {
    logger.error("shellSync(): Resolving shell environment took too long. Please review your shell configuration.");
  }

  return envVars;
}
